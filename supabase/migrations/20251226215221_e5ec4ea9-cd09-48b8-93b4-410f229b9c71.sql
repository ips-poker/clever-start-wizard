-- Удаляем старые функции перед созданием новых
DROP FUNCTION IF EXISTS public.balance_tournament_tables(uuid);
DROP FUNCTION IF EXISTS public.consolidate_tournament_tables(uuid);

-- 1. Функция балансировки столов турнира
CREATE OR REPLACE FUNCTION public.balance_tournament_tables(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tables RECORD;
  v_table_stats JSONB[];
  v_total_players INTEGER := 0;
  v_avg_players NUMERIC;
  v_moves JSONB[] := '{}';
  v_player_to_move UUID;
  v_new_seat INTEGER;
  v_max_table_id UUID;
  v_min_table_id UUID;
  v_max_count INTEGER;
  v_min_count INTEGER;
BEGIN
  -- Собираем статистику по столам
  FOR v_tables IN
    SELECT 
      pt.id as table_id,
      pt.max_players,
      COUNT(ptp.id) as player_count
    FROM poker_tables pt
    LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
    WHERE pt.tournament_id = p_tournament_id
      AND pt.status IN ('waiting', 'playing')
    GROUP BY pt.id, pt.max_players
    ORDER BY COUNT(ptp.id) DESC
  LOOP
    v_total_players := v_total_players + v_tables.player_count;
    v_table_stats := v_table_stats || jsonb_build_object(
      'table_id', v_tables.table_id,
      'player_count', v_tables.player_count
    );
  END LOOP;

  IF array_length(v_table_stats, 1) IS NULL OR array_length(v_table_stats, 1) <= 1 THEN
    RETURN jsonb_build_object('success', true, 'message', 'Not enough tables to balance', 'moves', 0);
  END IF;

  -- Балансируем пока разница > 1
  FOR i IN 1..20 LOOP
    SELECT table_id, player_count INTO v_max_table_id, v_max_count
    FROM (
      SELECT pt.id as table_id, COUNT(ptp.id) as player_count
      FROM poker_tables pt
      LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
      WHERE pt.tournament_id = p_tournament_id AND pt.status IN ('waiting', 'playing')
      GROUP BY pt.id ORDER BY COUNT(ptp.id) DESC LIMIT 1
    ) max_t;

    SELECT table_id, player_count INTO v_min_table_id, v_min_count
    FROM (
      SELECT pt.id as table_id, COUNT(ptp.id) as player_count
      FROM poker_tables pt
      LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
      WHERE pt.tournament_id = p_tournament_id AND pt.status IN ('waiting', 'playing')
      GROUP BY pt.id ORDER BY COUNT(ptp.id) ASC LIMIT 1
    ) min_t;

    IF v_max_count - v_min_count <= 1 THEN EXIT; END IF;

    SELECT ptp.player_id INTO v_player_to_move
    FROM poker_table_players ptp
    WHERE ptp.table_id = v_max_table_id AND ptp.status = 'active'
    ORDER BY ptp.stack DESC LIMIT 1;

    IF v_player_to_move IS NULL THEN EXIT; END IF;

    SELECT MIN(s.seat) INTO v_new_seat
    FROM generate_series(1, 9) s(seat)
    WHERE NOT EXISTS (
      SELECT 1 FROM poker_table_players WHERE table_id = v_min_table_id AND seat_number = s.seat AND status = 'active'
    );

    IF v_new_seat IS NULL THEN EXIT; END IF;

    UPDATE poker_table_players SET table_id = v_min_table_id, seat_number = v_new_seat
    WHERE player_id = v_player_to_move AND table_id = v_max_table_id;

    UPDATE online_poker_tournament_participants SET table_id = v_min_table_id, seat_number = v_new_seat
    WHERE player_id = v_player_to_move AND tournament_id = p_tournament_id;

    v_moves := v_moves || jsonb_build_object('player_id', v_player_to_move, 'from', v_max_table_id, 'to', v_min_table_id);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'total_players', v_total_players, 'moves', array_length(v_moves, 1));
END;
$$;

-- 2. Функция консолидации столов
CREATE OR REPLACE FUNCTION public.consolidate_tournament_tables(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_players INTEGER;
  v_total_tables INTEGER;
  v_max_per_table INTEGER := 9;
  v_min_tables_needed INTEGER;
  v_tables_to_close UUID[];
  v_target_tables UUID[];
  v_table_record RECORD;
  v_player_record RECORD;
  v_new_seat INTEGER;
  v_target_table UUID;
  v_moves INTEGER := 0;
  v_closed_tables INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO v_total_players
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND status IN ('playing', 'registered');

  SELECT max_players INTO v_max_per_table FROM poker_tables WHERE tournament_id = p_tournament_id LIMIT 1;
  v_max_per_table := COALESCE(v_max_per_table, 9);
  v_min_tables_needed := GREATEST(1, CEIL(v_total_players::NUMERIC / v_max_per_table));

  SELECT COUNT(*) INTO v_total_tables FROM poker_tables
  WHERE tournament_id = p_tournament_id AND status IN ('waiting', 'playing');

  IF v_total_tables <= v_min_tables_needed THEN
    RETURN jsonb_build_object('success', true, 'message', 'No consolidation needed');
  END IF;

  SELECT ARRAY_AGG(table_id ORDER BY player_count ASC) INTO v_tables_to_close
  FROM (
    SELECT pt.id as table_id, COUNT(ptp.id) as player_count
    FROM poker_tables pt
    LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
    WHERE pt.tournament_id = p_tournament_id AND pt.status IN ('waiting', 'playing')
    GROUP BY pt.id ORDER BY COUNT(ptp.id) ASC
    LIMIT (v_total_tables - v_min_tables_needed)
  ) closing;

  SELECT ARRAY_AGG(id) INTO v_target_tables FROM poker_tables
  WHERE tournament_id = p_tournament_id AND status IN ('waiting', 'playing') AND id != ALL(COALESCE(v_tables_to_close, '{}'));

  FOR v_table_record IN SELECT id FROM poker_tables WHERE id = ANY(COALESCE(v_tables_to_close, '{}'))
  LOOP
    FOR v_player_record IN SELECT player_id FROM poker_table_players WHERE table_id = v_table_record.id AND status = 'active'
    LOOP
      SELECT pt.id INTO v_target_table FROM poker_tables pt
      LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
      WHERE pt.id = ANY(v_target_tables) GROUP BY pt.id HAVING COUNT(ptp.id) < v_max_per_table
      ORDER BY COUNT(ptp.id) ASC LIMIT 1;

      IF v_target_table IS NULL THEN CONTINUE; END IF;

      SELECT MIN(s.seat) INTO v_new_seat FROM generate_series(1, v_max_per_table) s(seat)
      WHERE NOT EXISTS (SELECT 1 FROM poker_table_players WHERE table_id = v_target_table AND seat_number = s.seat AND status = 'active');

      IF v_new_seat IS NULL THEN CONTINUE; END IF;

      UPDATE poker_table_players SET table_id = v_target_table, seat_number = v_new_seat
      WHERE player_id = v_player_record.player_id AND table_id = v_table_record.id;

      UPDATE online_poker_tournament_participants SET table_id = v_target_table, seat_number = v_new_seat
      WHERE player_id = v_player_record.player_id AND tournament_id = p_tournament_id;

      v_moves := v_moves + 1;
    END LOOP;

    UPDATE poker_tables SET status = 'closed' WHERE id = v_table_record.id;
    v_closed_tables := v_closed_tables + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'players_moved', v_moves, 'tables_closed', v_closed_tables);
END;
$$;

-- 3. Триггер для автоматической обработки выбывания
CREATE OR REPLACE FUNCTION public.on_tournament_player_eliminated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_remaining_players INTEGER;
BEGIN
  IF NEW.status = 'eliminated' AND OLD.status != 'eliminated' THEN
    -- Удаляем игрока со стола
    DELETE FROM poker_table_players WHERE player_id = NEW.player_id AND table_id = OLD.table_id;

    -- Считаем оставшихся
    SELECT COUNT(*) INTO v_remaining_players
    FROM online_poker_tournament_participants
    WHERE tournament_id = NEW.tournament_id AND status = 'playing';

    IF v_remaining_players <= 1 THEN
      -- Победитель
      UPDATE online_poker_tournament_participants
      SET finish_position = 1, prize_amount = (SELECT prize_pool FROM online_poker_tournaments WHERE id = NEW.tournament_id)
      WHERE tournament_id = NEW.tournament_id AND status = 'playing';

      UPDATE online_poker_tournaments SET status = 'completed', finished_at = NOW() WHERE id = NEW.tournament_id;
    ELSE
      NEW.finish_position := v_remaining_players + 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tournament_player_eliminated_trigger ON online_poker_tournament_participants;
CREATE TRIGGER tournament_player_eliminated_trigger
  BEFORE UPDATE ON online_poker_tournament_participants
  FOR EACH ROW EXECUTE FUNCTION on_tournament_player_eliminated();

-- 4. Уникальный constraint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'poker_table_players_table_player_unique') THEN
    ALTER TABLE poker_table_players ADD CONSTRAINT poker_table_players_table_player_unique UNIQUE (table_id, player_id);
  END IF;
END $$;
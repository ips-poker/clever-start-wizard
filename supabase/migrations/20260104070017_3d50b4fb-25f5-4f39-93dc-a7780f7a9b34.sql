
-- Исправленная профессиональная балансировка столов
DROP FUNCTION IF EXISTS professional_balance_tables(UUID);
CREATE OR REPLACE FUNCTION public.professional_balance_tables(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament RECORD;
  v_max_players_per_table INTEGER;
  v_total_players INTEGER;
  v_active_tables INTEGER;
  v_ideal_per_table INTEGER;
  v_remainder INTEGER;
  v_source_table_id UUID;
  v_source_player_count INTEGER;
  v_target_table_id UUID;
  v_target_player_count INTEGER;
  v_player_to_move RECORD;
  v_new_seat INTEGER;
  v_moves JSONB := '[]'::JSONB;
  v_move_count INTEGER := 0;
  v_iteration INTEGER := 0;
  v_max_iterations INTEGER := 50;
  v_current_dealer_seat INTEGER;
BEGIN
  -- Получаем данные турнира
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Турнир не найден');
  END IF;
  
  v_max_players_per_table := COALESCE(v_tournament.players_per_table, 6);
  IF v_max_players_per_table > 9 THEN v_max_players_per_table := 9; END IF;
  
  -- Считаем активных игроков и столы
  SELECT COUNT(*) INTO v_total_players
  FROM poker_table_players ptp
  JOIN poker_tables pt ON pt.id = ptp.table_id
  WHERE pt.tournament_id = p_tournament_id 
    AND pt.status IN ('waiting', 'playing')
    AND ptp.status = 'active';
  
  SELECT COUNT(*) INTO v_active_tables
  FROM poker_tables
  WHERE tournament_id = p_tournament_id AND status IN ('waiting', 'playing');
  
  IF v_active_tables <= 1 OR v_total_players = 0 THEN
    RETURN jsonb_build_object('success', true, 'message', 'Балансировка не требуется', 'moves', 0);
  END IF;
  
  -- Вычисляем идеальное распределение
  v_ideal_per_table := v_total_players / v_active_tables;
  v_remainder := v_total_players % v_active_tables;
  
  -- Цикл балансировки
  WHILE v_iteration < v_max_iterations LOOP
    v_iteration := v_iteration + 1;
    
    -- Находим стол-источник (с наибольшим количеством игроков)
    SELECT pt.id, COUNT(ptp.id)::INTEGER, pt.current_dealer_seat
    INTO v_source_table_id, v_source_player_count, v_current_dealer_seat
    FROM poker_tables pt
    JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
    WHERE pt.tournament_id = p_tournament_id 
      AND pt.status IN ('waiting', 'playing')
    GROUP BY pt.id
    ORDER BY COUNT(ptp.id) DESC
    LIMIT 1;
    
    IF v_source_table_id IS NULL THEN
      EXIT;
    END IF;
    
    -- Находим стол-цель (с наименьшим количеством игроков)
    SELECT pt.id, COUNT(ptp.id)::INTEGER
    INTO v_target_table_id, v_target_player_count
    FROM poker_tables pt
    LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
    WHERE pt.tournament_id = p_tournament_id 
      AND pt.status IN ('waiting', 'playing')
      AND pt.id != v_source_table_id
    GROUP BY pt.id
    HAVING COUNT(ptp.id) < v_max_players_per_table
    ORDER BY COUNT(ptp.id) ASC
    LIMIT 1;
    
    IF v_target_table_id IS NULL THEN
      EXIT; -- Нет доступных целевых столов
    END IF;
    
    -- Проверяем нужна ли балансировка (разница > 1)
    IF v_source_player_count - v_target_player_count <= 1 THEN
      EXIT; -- Баланс достигнут
    END IF;
    
    -- ПРАВИЛО ПОКЕРА: выбираем игрока который будет следующим на BB
    SELECT ptp.* 
    INTO v_player_to_move
    FROM poker_table_players ptp
    JOIN poker_tables pt ON pt.id = ptp.table_id
    WHERE ptp.table_id = v_source_table_id
      AND ptp.status = 'active'
      AND pt.current_hand_id IS NULL -- не в раздаче
    ORDER BY 
      -- Приоритет тем, кто дальше от текущего дилера (скоро будет BB)
      CASE 
        WHEN ptp.seat_number > COALESCE(v_current_dealer_seat, 0) 
        THEN ptp.seat_number - COALESCE(v_current_dealer_seat, 0)
        ELSE ptp.seat_number + v_max_players_per_table - COALESCE(v_current_dealer_seat, 0)
      END DESC,
      ptp.joined_at ASC
    LIMIT 1;
    
    IF v_player_to_move IS NULL THEN
      EXIT; -- Стол в активной раздаче
    END IF;
    
    -- Находим свободное место на целевом столе
    SELECT MIN(s.seat) INTO v_new_seat
    FROM generate_series(1, v_max_players_per_table) s(seat)
    WHERE NOT EXISTS (
      SELECT 1 FROM poker_table_players 
      WHERE table_id = v_target_table_id AND seat_number = s.seat AND status = 'active'
    );
    
    IF v_new_seat IS NULL THEN
      EXIT;
    END IF;
    
    -- Выполняем пересадку
    UPDATE poker_table_players
    SET table_id = v_target_table_id, seat_number = v_new_seat
    WHERE id = v_player_to_move.id;
    
    UPDATE online_poker_tournament_participants
    SET table_id = v_target_table_id, seat_number = v_new_seat
    WHERE tournament_id = p_tournament_id AND player_id = v_player_to_move.player_id;
    
    v_move_count := v_move_count + 1;
    v_moves := v_moves || jsonb_build_object(
      'player_id', v_player_to_move.player_id,
      'from_table', v_source_table_id,
      'to_table', v_target_table_id,
      'from_seat', v_player_to_move.seat_number,
      'to_seat', v_new_seat
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_players', v_total_players,
    'active_tables', v_active_tables,
    'ideal_per_table', v_ideal_per_table,
    'moves', v_move_count,
    'details', v_moves
  );
END;
$$;

-- Обновляем wrapper
DROP FUNCTION IF EXISTS balance_tournament_tables(UUID);
CREATE OR REPLACE FUNCTION public.balance_tournament_tables(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN professional_balance_tables(p_tournament_id);
END;
$$;

-- Сначала удаляем старую функцию с другой сигнатурой
DROP FUNCTION IF EXISTS eliminate_online_tournament_player(UUID, UUID, UUID);

-- Удаляем дублирующий триггер
DROP TRIGGER IF EXISTS tournament_player_eliminated_trigger ON online_poker_tournament_participants;
DROP FUNCTION IF EXISTS on_tournament_player_eliminated();

-- Профессиональная функция выбывания игрока с полной логикой
CREATE OR REPLACE FUNCTION public.eliminate_online_tournament_player(
  p_tournament_id UUID,
  p_player_id UUID,
  p_eliminated_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament RECORD;
  v_participant RECORD;
  v_remaining_players INTEGER;
  v_finish_position INTEGER;
  v_prize_amount INTEGER := 0;
  v_active_tables INTEGER;
  v_max_players_per_table INTEGER;
  v_balance_result JSONB;
  v_consolidate_result JSONB;
  v_is_final_table BOOLEAN := FALSE;
  v_tournament_completed BOOLEAN := FALSE;
BEGIN
  -- 1. Получаем данные турнира
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Турнир не найден');
  END IF;
  
  -- 2. Получаем данные участника
  SELECT * INTO v_participant
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND player_id = p_player_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Участник не найден');
  END IF;
  
  IF v_participant.status = 'eliminated' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Игрок уже выбыл');
  END IF;
  
  -- 3. Считаем оставшихся АКТИВНЫХ игроков (до выбывания текущего)
  SELECT COUNT(*) INTO v_remaining_players
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id 
    AND status = 'playing'
    AND player_id != p_player_id;
  
  -- 4. Позиция выбывшего = оставшиеся + 1
  v_finish_position := v_remaining_players + 1;
  
  -- 5. Проверяем призовую позицию
  SELECT COALESCE(amount, 0) INTO v_prize_amount
  FROM online_poker_tournament_payouts
  WHERE tournament_id = p_tournament_id 
    AND position = v_finish_position
    AND player_id IS NULL
  LIMIT 1;
  
  IF v_prize_amount IS NULL THEN
    v_prize_amount := 0;
  END IF;
  
  IF v_prize_amount > 0 THEN
    -- Обновляем payout как выплаченный
    UPDATE online_poker_tournament_payouts
    SET player_id = p_player_id, paid_at = NOW()
    WHERE tournament_id = p_tournament_id AND position = v_finish_position;
    
    -- Начисляем призовые в diamond wallet
    UPDATE diamond_wallets
    SET 
      balance = balance + v_prize_amount,
      total_won = total_won + v_prize_amount,
      updated_at = NOW()
    WHERE player_id = p_player_id;
  END IF;
  
  -- 6. Удаляем игрока со стола в poker_table_players
  DELETE FROM poker_table_players 
  WHERE player_id = p_player_id 
    AND table_id = v_participant.table_id;
  
  -- 7. Обновляем статус участника
  UPDATE online_poker_tournament_participants
  SET 
    status = 'eliminated',
    eliminated_at = NOW(),
    eliminated_by = p_eliminated_by,
    finish_position = v_finish_position,
    prize_amount = v_prize_amount,
    chips = 0,
    table_id = NULL,
    seat_number = NULL
  WHERE tournament_id = p_tournament_id AND player_id = p_player_id;
  
  -- 8. Проверяем завершение турнира (1 игрок остался)
  IF v_remaining_players <= 1 THEN
    v_tournament_completed := TRUE;
    
    -- Получаем приз за 1 место
    SELECT COALESCE(amount, v_tournament.prize_pool) INTO v_prize_amount
    FROM online_poker_tournament_payouts
    WHERE tournament_id = p_tournament_id AND position = 1
    LIMIT 1;
    
    IF v_prize_amount IS NULL THEN
      v_prize_amount := COALESCE(v_tournament.prize_pool, 0);
    END IF;
    
    -- Определяем победителя
    UPDATE online_poker_tournament_participants
    SET 
      status = 'winner',
      finish_position = 1,
      prize_amount = v_prize_amount
    WHERE tournament_id = p_tournament_id AND status = 'playing';
    
    -- Выплачиваем приз победителю
    UPDATE diamond_wallets dw
    SET 
      balance = dw.balance + v_prize_amount,
      total_won = dw.total_won + v_prize_amount,
      updated_at = NOW()
    FROM online_poker_tournament_participants p
    WHERE p.tournament_id = p_tournament_id 
      AND p.status = 'winner'
      AND dw.player_id = p.player_id;
    
    -- Завершаем турнир
    UPDATE online_poker_tournaments
    SET status = 'completed', finished_at = NOW()
    WHERE id = p_tournament_id;
    
    -- Закрываем все столы турнира
    UPDATE poker_tables
    SET status = 'closed'
    WHERE tournament_id = p_tournament_id;
    
  ELSE
    -- 9. Балансировка столов
    v_balance_result := balance_tournament_tables(p_tournament_id);
    
    -- 10. Консолидация пустых столов
    v_consolidate_result := consolidate_tournament_tables(p_tournament_id);
    
    -- 11. Проверяем Final Table (все на одном столе, ≤9 игроков)
    SELECT COUNT(*) INTO v_active_tables
    FROM poker_tables
    WHERE tournament_id = p_tournament_id 
      AND status IN ('waiting', 'playing');
    
    v_max_players_per_table := LEAST(COALESCE(v_tournament.max_players, 9), 9);
    
    IF v_active_tables = 1 AND v_remaining_players <= v_max_players_per_table THEN
      v_is_final_table := TRUE;
      
      UPDATE online_poker_tournaments
      SET status = 'final_table'
      WHERE id = p_tournament_id AND status NOT IN ('final_table', 'completed');
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'player_id', p_player_id,
    'position', v_finish_position,
    'prize_amount', v_prize_amount,
    'remaining_players', v_remaining_players,
    'tournament_completed', v_tournament_completed,
    'is_final_table', v_is_final_table,
    'balance_result', v_balance_result,
    'consolidate_result', v_consolidate_result
  );
END;
$$;

-- Улучшенная функция балансировки столов
DROP FUNCTION IF EXISTS balance_tournament_tables(UUID);
CREATE OR REPLACE FUNCTION public.balance_tournament_tables(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_players INTEGER;
  v_table_count INTEGER;
  v_max_diff INTEGER := 1;
  v_source_table RECORD;
  v_target_table RECORD;
  v_player_to_move RECORD;
  v_new_seat INTEGER;
  v_move_count INTEGER := 0;
  v_moves JSONB := '[]'::JSONB;
BEGIN
  -- Получаем статистику столов
  SELECT COUNT(*), COALESCE(SUM(player_count), 0)
  INTO v_table_count, v_total_players
  FROM (
    SELECT pt.id, COUNT(ptp.id) as player_count
    FROM poker_tables pt
    LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
    WHERE pt.tournament_id = p_tournament_id 
      AND pt.status IN ('waiting', 'playing')
    GROUP BY pt.id
  ) t;
  
  IF v_table_count <= 1 THEN
    RETURN jsonb_build_object('success', true, 'moves', 0, 'message', 'Один стол - балансировка не требуется');
  END IF;
  
  -- Цикл балансировки (до 20 итераций)
  FOR i IN 1..20 LOOP
    -- Находим стол с максимальным количеством игроков
    SELECT pt.id, COUNT(ptp.id) as player_count
    INTO v_source_table
    FROM poker_tables pt
    LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
    WHERE pt.tournament_id = p_tournament_id 
      AND pt.status IN ('waiting', 'playing')
    GROUP BY pt.id
    ORDER BY COUNT(ptp.id) DESC
    LIMIT 1;
    
    -- Находим стол с минимальным количеством игроков
    SELECT pt.id, COUNT(ptp.id) as player_count
    INTO v_target_table
    FROM poker_tables pt
    LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
    WHERE pt.tournament_id = p_tournament_id 
      AND pt.status IN ('waiting', 'playing')
      AND pt.id != v_source_table.id
    GROUP BY pt.id
    ORDER BY COUNT(ptp.id) ASC
    LIMIT 1;
    
    IF v_target_table IS NULL THEN
      EXIT;
    END IF;
    
    -- Проверяем нужна ли балансировка
    IF v_source_table.player_count - v_target_table.player_count <= v_max_diff THEN
      EXIT;
    END IF;
    
    -- Выбираем игрока для перемещения (не в активной раздаче)
    SELECT ptp.* INTO v_player_to_move
    FROM poker_table_players ptp
    JOIN poker_tables pt ON pt.id = ptp.table_id
    WHERE ptp.table_id = v_source_table.id
      AND ptp.status = 'active'
      AND pt.current_hand_id IS NULL
    ORDER BY ptp.joined_at ASC
    LIMIT 1;
    
    IF v_player_to_move IS NULL THEN
      EXIT;
    END IF;
    
    -- Находим свободное место
    SELECT s.seat INTO v_new_seat
    FROM generate_series(1, 9) s(seat)
    WHERE NOT EXISTS (
      SELECT 1 FROM poker_table_players 
      WHERE table_id = v_target_table.id AND seat_number = s.seat AND status = 'active'
    )
    LIMIT 1;
    
    IF v_new_seat IS NULL THEN
      EXIT;
    END IF;
    
    -- Перемещаем игрока
    UPDATE poker_table_players
    SET table_id = v_target_table.id, seat_number = v_new_seat
    WHERE id = v_player_to_move.id;
    
    UPDATE online_poker_tournament_participants
    SET table_id = v_target_table.id, seat_number = v_new_seat
    WHERE tournament_id = p_tournament_id AND player_id = v_player_to_move.player_id;
    
    v_move_count := v_move_count + 1;
    v_moves := v_moves || jsonb_build_object(
      'player_id', v_player_to_move.player_id,
      'from_table', v_source_table.id,
      'to_table', v_target_table.id,
      'seat', v_new_seat
    );
  END LOOP;
  
  RETURN jsonb_build_object('success', true, 'moves', v_move_count, 'details', v_moves);
END;
$$;

-- Улучшенная функция консолидации столов
DROP FUNCTION IF EXISTS consolidate_tournament_tables(UUID);
CREATE OR REPLACE FUNCTION public.consolidate_tournament_tables(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_players INTEGER;
  v_active_tables INTEGER;
  v_min_tables_needed INTEGER;
  v_max_per_table INTEGER := 9;
  v_empty_table RECORD;
  v_closed_tables INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO v_total_players
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND status = 'playing';
  
  SELECT COUNT(*) INTO v_active_tables
  FROM poker_tables
  WHERE tournament_id = p_tournament_id AND status IN ('waiting', 'playing');
  
  v_min_tables_needed := GREATEST(1, CEIL(v_total_players::DECIMAL / v_max_per_table));
  
  -- Закрываем пустые столы без активной раздачи
  FOR v_empty_table IN
    SELECT pt.id
    FROM poker_tables pt
    LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
    WHERE pt.tournament_id = p_tournament_id 
      AND pt.status IN ('waiting', 'playing')
      AND pt.current_hand_id IS NULL
    GROUP BY pt.id
    HAVING COUNT(ptp.id) = 0
  LOOP
    UPDATE poker_tables SET status = 'closed' WHERE id = v_empty_table.id;
    v_closed_tables := v_closed_tables + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_players', v_total_players,
    'active_tables', v_active_tables - v_closed_tables,
    'closed_tables', v_closed_tables,
    'min_tables_needed', v_min_tables_needed
  );
END;
$$;
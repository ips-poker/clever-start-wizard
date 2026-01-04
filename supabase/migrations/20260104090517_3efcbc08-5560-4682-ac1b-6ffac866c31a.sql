
-- Обновляем функцию eliminate_online_tournament_player чтобы возвращала table_id
CREATE OR REPLACE FUNCTION public.eliminate_online_tournament_player(
  p_tournament_id uuid, 
  p_player_id uuid, 
  p_eliminated_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_table_id UUID;
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
  
  -- Сохраняем table_id для возврата
  v_table_id := v_participant.table_id;
  
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
    -- Балансировка и консолидация столов
    v_max_players_per_table := COALESCE(v_tournament.players_per_table, 6);
    
    SELECT COUNT(*) INTO v_active_tables
    FROM poker_tables
    WHERE tournament_id = p_tournament_id AND status IN ('waiting', 'playing');
    
    -- Проверяем нужна ли консолидация
    IF v_active_tables > 1 AND v_remaining_players <= v_max_players_per_table THEN
      -- Финальный стол
      v_is_final_table := TRUE;
      v_consolidate_result := consolidate_tournament_tables(p_tournament_id);
    ELSIF v_active_tables > 1 THEN
      -- Балансируем столы
      v_balance_result := professional_balance_tables(p_tournament_id);
    END IF;
  END IF;
  
  -- Возвращаем результат с table_id
  RETURN jsonb_build_object(
    'success', true,
    'position', v_finish_position,
    'prize_amount', v_prize_amount,
    'remaining_players', v_remaining_players,
    'tournament_completed', v_tournament_completed,
    'is_final_table', v_is_final_table,
    'table_id', v_table_id,
    'balance_result', v_balance_result,
    'consolidate_result', v_consolidate_result
  );
END;
$$;

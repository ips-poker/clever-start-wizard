-- Add rps_points column to online tournament payouts
ALTER TABLE online_poker_tournament_payouts 
ADD COLUMN IF NOT EXISTS rps_points INTEGER DEFAULT 0;

-- Recreate generate_online_tournament_payout_structure to include both diamond prizes and RPS
CREATE OR REPLACE FUNCTION generate_online_tournament_payout_structure(p_tournament_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_participants_count INTEGER;
  v_payout_percentages NUMERIC[];
  v_prize_pool INTEGER;
  v_rps_pool INTEGER;
  v_tournament RECORD;
  v_position INTEGER;
BEGIN
  -- Получаем информацию о турнире
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Турнир не найден');
  END IF;

  -- Считаем участников
  SELECT COUNT(*) INTO v_participants_count
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id
    AND status IN ('registered', 'playing', 'eliminated', 'winner');

  IF v_participants_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Нет участников');
  END IF;

  -- Рассчитываем призовой фонд (алмазы) и RPS пул
  v_prize_pool := calculate_online_tournament_prize_pool(p_tournament_id);
  v_rps_pool := calculate_online_tournament_rps_pool(p_tournament_id);

  -- Определяем структуру выплат в зависимости от кол-ва участников
  IF v_participants_count >= 50 THEN
    v_payout_percentages := ARRAY[35, 25, 15, 10, 8, 7]::NUMERIC[];
  ELSIF v_participants_count >= 30 THEN
    v_payout_percentages := ARRAY[40, 30, 20, 10]::NUMERIC[];
  ELSIF v_participants_count >= 20 THEN
    v_payout_percentages := ARRAY[50, 30, 20]::NUMERIC[];
  ELSIF v_participants_count >= 10 THEN
    v_payout_percentages := ARRAY[60, 40]::NUMERIC[];
  ELSIF v_participants_count >= 3 THEN
    v_payout_percentages := ARRAY[65, 35]::NUMERIC[];
  ELSE
    v_payout_percentages := ARRAY[100]::NUMERIC[];
  END IF;

  -- Очищаем старые записи выплат
  DELETE FROM online_poker_tournament_payouts WHERE tournament_id = p_tournament_id;

  -- Создаем новые записи с раздельными prize (diamonds) и rps_points
  FOR v_position IN 1..array_length(v_payout_percentages, 1) LOOP
    INSERT INTO online_poker_tournament_payouts (
      tournament_id,
      position,
      percentage,
      amount,
      rps_points
    ) VALUES (
      p_tournament_id,
      v_position,
      v_payout_percentages[v_position],
      ROUND(v_prize_pool * v_payout_percentages[v_position] / 100),
      ROUND(v_rps_pool * v_payout_percentages[v_position] / 100)
    );
  END LOOP;

  -- Обновляем турнир
  UPDATE online_poker_tournaments
  SET prize_pool = v_prize_pool,
      tickets_for_top = array_length(v_payout_percentages, 1)
  WHERE id = p_tournament_id;

  RETURN jsonb_build_object(
    'success', true,
    'participants_count', v_participants_count,
    'prize_pool', v_prize_pool,
    'rps_pool', v_rps_pool,
    'payout_places', array_length(v_payout_percentages, 1)
  );
END;
$$;

-- Recreate eliminate_online_tournament_player to award RPS points
CREATE OR REPLACE FUNCTION eliminate_online_tournament_player(
  p_tournament_id UUID,
  p_player_id UUID,
  p_eliminated_by UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament RECORD;
  v_participant RECORD;
  v_payout RECORD;
  v_remaining_players INTEGER;
  v_finish_position INTEGER;
  v_prize_amount INTEGER := 0;
  v_rps_points INTEGER := 0;
  v_old_elo INTEGER;
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
  
  v_table_id := v_participant.table_id;
  
  -- 3. Считаем оставшихся АКТИВНЫХ игроков
  SELECT COUNT(*) INTO v_remaining_players
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id 
    AND status = 'playing'
    AND player_id != p_player_id;
  
  -- 4. Позиция выбывшего
  v_finish_position := v_remaining_players + 1;
  
  -- 5. Получаем призовые и RPS для этой позиции
  SELECT amount, COALESCE(rps_points, 0) INTO v_prize_amount, v_rps_points
  FROM online_poker_tournament_payouts
  WHERE tournament_id = p_tournament_id 
    AND position = v_finish_position
    AND player_id IS NULL
  LIMIT 1;
  
  v_prize_amount := COALESCE(v_prize_amount, 0);
  v_rps_points := COALESCE(v_rps_points, 0);
  
  -- 6. Выплачиваем призы
  IF v_prize_amount > 0 OR v_rps_points > 0 THEN
    -- Обновляем payout как выплаченный
    UPDATE online_poker_tournament_payouts
    SET player_id = p_player_id, paid_at = NOW()
    WHERE tournament_id = p_tournament_id AND position = v_finish_position;
    
    -- Начисляем алмазы
    IF v_prize_amount > 0 THEN
      UPDATE diamond_wallets
      SET 
        balance = balance + v_prize_amount,
        total_won = total_won + v_prize_amount,
        updated_at = NOW()
      WHERE player_id = p_player_id;
    END IF;
    
    -- Начисляем RPS очки в elo_rating
    IF v_rps_points > 0 THEN
      SELECT elo_rating INTO v_old_elo FROM players WHERE id = p_player_id;
      v_old_elo := COALESCE(v_old_elo, 1000);
      
      UPDATE players
      SET elo_rating = elo_rating + v_rps_points,
          updated_at = NOW()
      WHERE id = p_player_id;
      
      -- Записываем в game_results
      INSERT INTO game_results (tournament_id, player_id, position, elo_before, elo_after, elo_change)
      VALUES (p_tournament_id, p_player_id, v_finish_position, v_old_elo, v_old_elo + v_rps_points, v_rps_points);
    END IF;
  END IF;
  
  -- 7. Удаляем игрока со стола
  DELETE FROM poker_table_players 
  WHERE player_id = p_player_id 
    AND table_id = v_participant.table_id;
  
  -- 8. Обновляем статус участника
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
  
  -- 9. Проверяем завершение турнира
  IF v_remaining_players <= 1 THEN
    v_tournament_completed := TRUE;
    
    -- Получаем приз и RPS за 1 место
    SELECT COALESCE(amount, v_tournament.prize_pool), COALESCE(rps_points, 0) 
    INTO v_prize_amount, v_rps_points
    FROM online_poker_tournament_payouts
    WHERE tournament_id = p_tournament_id AND position = 1
    LIMIT 1;
    
    v_prize_amount := COALESCE(v_prize_amount, v_tournament.prize_pool);
    v_rps_points := COALESCE(v_rps_points, 0);
    
    -- Определяем победителя и начисляем призы
    FOR v_participant IN 
      SELECT * FROM online_poker_tournament_participants
      WHERE tournament_id = p_tournament_id AND status = 'playing'
    LOOP
      -- Обновляем статус победителя
      UPDATE online_poker_tournament_participants
      SET 
        status = 'winner',
        finish_position = 1,
        prize_amount = v_prize_amount
      WHERE id = v_participant.id;
      
      -- Выплачиваем алмазы победителю
      IF v_prize_amount > 0 THEN
        UPDATE diamond_wallets
        SET 
          balance = balance + v_prize_amount,
          total_won = total_won + v_prize_amount,
          updated_at = NOW()
        WHERE player_id = v_participant.player_id;
      END IF;
      
      -- Начисляем RPS победителю
      IF v_rps_points > 0 THEN
        SELECT elo_rating INTO v_old_elo FROM players WHERE id = v_participant.player_id;
        v_old_elo := COALESCE(v_old_elo, 1000);
        
        UPDATE players
        SET elo_rating = elo_rating + v_rps_points,
            updated_at = NOW()
        WHERE id = v_participant.player_id;
        
        INSERT INTO game_results (tournament_id, player_id, position, elo_before, elo_after, elo_change)
        VALUES (p_tournament_id, v_participant.player_id, 1, v_old_elo, v_old_elo + v_rps_points, v_rps_points);
      END IF;
      
      -- Удаляем победителя со стола
      DELETE FROM poker_table_players WHERE player_id = v_participant.player_id;
    END LOOP;
    
    -- Обновляем payout для 1 места
    UPDATE online_poker_tournament_payouts
    SET player_id = v_participant.player_id, paid_at = NOW()
    WHERE tournament_id = p_tournament_id AND position = 1;
    
    -- Завершаем турнир
    UPDATE online_poker_tournaments
    SET status = 'completed', finished_at = NOW()
    WHERE id = p_tournament_id;
    
    -- Закрываем все столы турнира
    UPDATE poker_tables
    SET status = 'closed'
    WHERE tournament_id = p_tournament_id;
    
  ELSE
    -- Балансировка столов
    v_max_players_per_table := COALESCE(v_tournament.players_per_table, 6);
    
    SELECT COUNT(*) INTO v_active_tables
    FROM poker_tables
    WHERE tournament_id = p_tournament_id AND status IN ('waiting', 'playing');
    
    IF v_active_tables > 1 AND v_remaining_players <= v_max_players_per_table THEN
      v_is_final_table := TRUE;
      v_consolidate_result := consolidate_tournament_tables(p_tournament_id);
    ELSIF v_active_tables > 1 THEN
      v_balance_result := professional_balance_tables(p_tournament_id);
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'position', v_finish_position,
    'prize_amount', v_prize_amount,
    'rps_points', v_rps_points,
    'remaining_players', v_remaining_players,
    'tournament_completed', v_tournament_completed,
    'is_final_table', v_is_final_table,
    'table_id', v_table_id,
    'balance_result', v_balance_result,
    'consolidate_result', v_consolidate_result
  );
END;
$$;
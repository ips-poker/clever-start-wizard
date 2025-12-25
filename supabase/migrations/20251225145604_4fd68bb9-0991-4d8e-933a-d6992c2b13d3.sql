-- ========================================
-- RPS интеграция для онлайн турниров
-- ========================================

-- 1. Добавляем tournament_id к poker_tables для связи со столом турнира
ALTER TABLE poker_tables
ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES online_poker_tournaments(id) ON DELETE SET NULL;

-- 2. Добавляем time_bank для игроков
ALTER TABLE poker_table_players
ADD COLUMN IF NOT EXISTS time_bank_remaining INTEGER DEFAULT 60;

-- 3. Добавляем время окончания уровня в турнирах
ALTER TABLE online_poker_tournaments
ADD COLUMN IF NOT EXISTS level_end_at TIMESTAMP WITH TIME ZONE;

-- 4. Добавляем table_id к участникам турнира
ALTER TABLE online_poker_tournament_participants
ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES poker_tables(id) ON DELETE SET NULL;

-- 5. Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_poker_tables_tournament_id ON poker_tables(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_table_id ON online_poker_tournament_participants(table_id);

-- ========================================
-- Функция записи результатов онлайн турнира в game_results
-- ========================================
CREATE OR REPLACE FUNCTION public.record_online_tournament_result(
  p_tournament_id UUID,
  p_player_id UUID,
  p_position INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament RECORD;
  v_player RECORD;
  v_participant_count INTEGER;
  v_total_rps_pool INTEGER;
  v_player_rps INTEGER;
  v_elo_before INTEGER;
  v_elo_change INTEGER;
  v_elo_after INTEGER;
  v_payout_percentage NUMERIC;
  v_prize_amount INTEGER;
BEGIN
  -- Получаем данные турнира
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- Получаем данные игрока
  SELECT * INTO v_player
  FROM players
  WHERE id = p_player_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;

  -- Считаем количество участников
  SELECT COUNT(*) INTO v_participant_count
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND status != 'cancelled';

  -- Рассчитываем RPS пул (buy_in / 10 = RPS баллы)
  v_total_rps_pool := ROUND(v_tournament.prize_pool / 10.0)::INTEGER;

  -- Рассчитываем RPS баллы для позиции игрока
  -- Используем стандартную структуру выплат
  IF v_participant_count <= 6 THEN
    -- Pay top 2
    CASE p_position
      WHEN 1 THEN v_payout_percentage := 65;
      WHEN 2 THEN v_payout_percentage := 35;
      ELSE v_payout_percentage := 0;
    END CASE;
  ELSIF v_participant_count <= 18 THEN
    -- Pay top 3
    CASE p_position
      WHEN 1 THEN v_payout_percentage := 50;
      WHEN 2 THEN v_payout_percentage := 30;
      WHEN 3 THEN v_payout_percentage := 20;
      ELSE v_payout_percentage := 0;
    END CASE;
  ELSE
    -- Pay top 5
    CASE p_position
      WHEN 1 THEN v_payout_percentage := 40;
      WHEN 2 THEN v_payout_percentage := 25;
      WHEN 3 THEN v_payout_percentage := 15;
      WHEN 4 THEN v_payout_percentage := 12;
      WHEN 5 THEN v_payout_percentage := 8;
      ELSE v_payout_percentage := 0;
    END CASE;
  END IF;

  v_player_rps := ROUND(v_total_rps_pool * v_payout_percentage / 100.0)::INTEGER;
  v_prize_amount := ROUND(v_tournament.prize_pool * v_payout_percentage / 100.0)::INTEGER;

  -- Рассчитываем ELO изменение (аналогично офлайн турнирам)
  v_elo_before := v_player.elo_rating;
  
  -- Формула: базовые очки * модификатор позиции
  -- Победитель получает больше, последние теряют
  IF p_position = 1 THEN
    v_elo_change := GREATEST(50, ROUND(v_total_rps_pool * 0.3)::INTEGER);
  ELSIF p_position = 2 THEN
    v_elo_change := GREATEST(30, ROUND(v_total_rps_pool * 0.15)::INTEGER);
  ELSIF p_position = 3 THEN
    v_elo_change := GREATEST(15, ROUND(v_total_rps_pool * 0.08)::INTEGER);
  ELSIF p_position <= v_participant_count / 2 THEN
    -- Верхняя половина - небольшой плюс
    v_elo_change := GREATEST(5, ROUND(10 - p_position)::INTEGER);
  ELSE
    -- Нижняя половина - минус (пропорционально позиции)
    v_elo_change := -LEAST(30, ROUND((p_position::NUMERIC / v_participant_count) * 40)::INTEGER);
  END IF;

  v_elo_after := v_elo_before + v_elo_change;

  -- Проверяем, не записан ли уже результат
  IF EXISTS (
    SELECT 1 FROM game_results 
    WHERE tournament_id = p_tournament_id AND player_id = p_player_id
  ) THEN
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'Result already recorded',
      'position', p_position
    );
  END IF;

  -- Записываем результат в game_results
  INSERT INTO game_results (
    tournament_id,
    player_id,
    position,
    elo_before,
    elo_after,
    elo_change
  ) VALUES (
    p_tournament_id,
    p_player_id,
    p_position,
    v_elo_before,
    v_elo_after,
    v_elo_change
  );

  -- Обновляем ELO рейтинг игрока
  UPDATE players
  SET 
    elo_rating = v_elo_after,
    games_played = games_played + 1,
    wins = CASE WHEN p_position = 1 THEN wins + 1 ELSE wins END,
    updated_at = now()
  WHERE id = p_player_id;

  -- Обновляем позицию участника в турнире
  UPDATE online_poker_tournament_participants
  SET 
    finish_position = p_position,
    prize_amount = v_prize_amount
  WHERE tournament_id = p_tournament_id AND player_id = p_player_id;

  -- Если есть выигрыш - записываем в выплаты турнира
  IF v_payout_percentage > 0 THEN
    INSERT INTO online_poker_tournament_payouts (
      tournament_id,
      position,
      percentage,
      amount,
      player_id,
      paid_at
    ) VALUES (
      p_tournament_id,
      p_position,
      v_payout_percentage,
      v_prize_amount,
      p_player_id,
      now()
    )
    ON CONFLICT DO NOTHING;

    -- Начисляем выигрыш на баланс
    UPDATE diamond_wallets
    SET 
      balance = balance + v_prize_amount,
      total_won = total_won + v_prize_amount,
      updated_at = now()
    WHERE player_id = p_player_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'position', p_position,
    'rps_earned', v_player_rps,
    'elo_before', v_elo_before,
    'elo_after', v_elo_after,
    'elo_change', v_elo_change,
    'prize_amount', v_prize_amount,
    'payout_percentage', v_payout_percentage
  );
END;
$$;

-- ========================================
-- Функция выбывания игрока из онлайн турнира
-- ========================================
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
  v_remaining_count INTEGER;
  v_finish_position INTEGER;
  v_result JSONB;
BEGIN
  -- Считаем оставшихся активных игроков
  SELECT COUNT(*) INTO v_remaining_count
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id 
    AND status = 'playing';

  -- Позиция = оставшиеся игроки + 1 (он выбыл последним из текущих)
  v_finish_position := v_remaining_count;

  -- Обновляем статус участника
  UPDATE online_poker_tournament_participants
  SET 
    status = 'eliminated',
    eliminated_at = now(),
    eliminated_by = p_eliminated_by,
    finish_position = v_finish_position
  WHERE tournament_id = p_tournament_id AND player_id = p_player_id;

  -- Записываем результат в общую систему RPS
  SELECT record_online_tournament_result(p_tournament_id, p_player_id, v_finish_position)
  INTO v_result;

  -- Проверяем, остался ли только 1 игрок - турнир завершен
  SELECT COUNT(*) INTO v_remaining_count
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id 
    AND status = 'playing';

  IF v_remaining_count = 1 THEN
    -- Определяем победителя
    DECLARE
      v_winner_id UUID;
    BEGIN
      SELECT player_id INTO v_winner_id
      FROM online_poker_tournament_participants
      WHERE tournament_id = p_tournament_id 
        AND status = 'playing'
      LIMIT 1;

      -- Записываем результат победителя
      UPDATE online_poker_tournament_participants
      SET 
        status = 'finished',
        finish_position = 1
      WHERE tournament_id = p_tournament_id AND player_id = v_winner_id;

      PERFORM record_online_tournament_result(p_tournament_id, v_winner_id, 1);

      -- Завершаем турнир
      UPDATE online_poker_tournaments
      SET 
        status = 'completed',
        finished_at = now()
      WHERE id = p_tournament_id;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'finish_position', v_finish_position,
    'remaining_players', v_remaining_count,
    'rps_result', v_result
  );
END;
$$;

-- ========================================
-- Функция повышения уровня блайндов в турнире
-- ========================================
CREATE OR REPLACE FUNCTION public.advance_online_tournament_level(
  p_tournament_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament RECORD;
  v_next_level RECORD;
  v_current_level INTEGER;
BEGIN
  -- Получаем текущий уровень турнира
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  v_current_level := COALESCE(v_tournament.current_level, 1);

  -- Получаем следующий уровень
  SELECT * INTO v_next_level
  FROM online_poker_tournament_levels
  WHERE tournament_id = p_tournament_id
    AND level = v_current_level + 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'No more levels',
      'current_level', v_current_level
    );
  END IF;

  -- Обновляем турнир
  UPDATE online_poker_tournaments
  SET 
    current_level = v_next_level.level,
    small_blind = v_next_level.small_blind,
    big_blind = v_next_level.big_blind,
    ante = v_next_level.ante,
    level_end_at = now() + (v_next_level.duration || ' seconds')::INTERVAL,
    updated_at = now()
  WHERE id = p_tournament_id;

  -- Обновляем все столы турнира
  UPDATE poker_tables
  SET 
    small_blind = v_next_level.small_blind,
    big_blind = v_next_level.big_blind,
    ante = v_next_level.ante,
    updated_at = now()
  WHERE tournament_id = p_tournament_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_level', v_next_level.level,
    'small_blind', v_next_level.small_blind,
    'big_blind', v_next_level.big_blind,
    'ante', v_next_level.ante,
    'is_break', v_next_level.is_break,
    'duration', v_next_level.duration
  );
END;
$$;

-- ========================================
-- Исправляем FK для game_results чтобы принимать UUID турниров
-- ========================================
-- Сначала проверяем есть ли FK, если есть - удаляем и создаем новый
DO $$
BEGIN
  -- Пробуем удалить существующий FK если есть
  ALTER TABLE game_results DROP CONSTRAINT IF EXISTS game_results_tournament_id_fkey;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Игнорируем если не существует
END $$;

-- Добавляем новый FK который работает с обоими типами турниров
-- (не добавляем новый FK, оставляем без ограничений чтобы работало с online_poker_tournaments)
-- Улучшенная функция расчета призового пула для онлайн турниров
-- Учитывает buy_in + rebuys + addons аналогично офлайн турнирам
CREATE OR REPLACE FUNCTION public.calculate_online_tournament_prize_pool(tournament_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tournament RECORD;
  v_participant_count INTEGER;
  v_total_rebuys INTEGER;
  v_total_addons INTEGER;
  v_base_pool INTEGER;
  v_rebuy_pool INTEGER;
  v_addon_pool INTEGER;
  v_total_pool INTEGER;
BEGIN
  -- Получаем данные турнира
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = tournament_id_param;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Считаем количество участников
  SELECT COUNT(*) INTO v_participant_count
  FROM online_poker_tournament_participants
  WHERE tournament_id = tournament_id_param 
    AND status != 'cancelled';

  -- Считаем общее количество ребаев
  SELECT COALESCE(SUM(
    CASE 
      WHEN (p.status)::text ~ 'rebuy' THEN 1
      ELSE 0
    END
  ), 0) INTO v_total_rebuys
  FROM online_poker_tournament_participants p
  WHERE p.tournament_id = tournament_id_param;

  -- Пока ребаи и аддоны не отслеживаются отдельно в participants, 
  -- берем базовый расчет: участники * buy_in
  v_base_pool := v_participant_count * COALESCE(v_tournament.buy_in, 0);
  v_rebuy_pool := 0; -- TODO: добавить подсчет ребаев когда будет tracking
  v_addon_pool := 0; -- TODO: добавить подсчет аддонов когда будет tracking
  
  v_total_pool := v_base_pool + v_rebuy_pool + v_addon_pool;
  
  -- Если есть гарантия и она больше собранного пула - используем гарантию
  IF v_tournament.guaranteed_prize_pool IS NOT NULL AND v_tournament.guaranteed_prize_pool > v_total_pool THEN
    v_total_pool := v_tournament.guaranteed_prize_pool;
  END IF;

  -- Обновляем призовой пул в турнире
  UPDATE online_poker_tournaments 
  SET prize_pool = v_total_pool 
  WHERE id = tournament_id_param;

  RETURN v_total_pool;
END;
$function$;

-- Улучшенная функция расчета RPS пула для онлайн турниров
-- Аналогична офлайн системе: 1000₽ = 100 RPS баллов
CREATE OR REPLACE FUNCTION public.calculate_online_tournament_rps_pool(tournament_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tournament RECORD;
  v_participant_count INTEGER;
  v_total_rebuys INTEGER;
  v_total_addons INTEGER;
  v_total_rps INTEGER;
BEGIN
  -- Получаем данные турнира
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = tournament_id_param;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Считаем количество участников
  SELECT COUNT(*) INTO v_participant_count
  FROM online_poker_tournament_participants
  WHERE tournament_id = tournament_id_param 
    AND status != 'cancelled';

  -- Пока ребаи и аддоны не отслеживаются детально
  v_total_rebuys := 0;
  v_total_addons := 0;

  -- Рассчитываем общий RPS пул по формуле: сумма входов / 10
  -- buy_in * участники + rebuy_cost * ребаи + addon_cost * аддоны
  v_total_rps := ROUND(
    (v_participant_count * COALESCE(v_tournament.buy_in, 0) +
     v_total_rebuys * COALESCE(v_tournament.rebuy_cost, 0) +
     v_total_addons * COALESCE(v_tournament.addon_cost, 0)) / 10.0
  )::INTEGER;

  RETURN v_total_rps;
END;
$function$;

-- Обновленная функция записи результата онлайн турнира
-- Использует правильный расчет RPS пула
CREATE OR REPLACE FUNCTION public.record_online_tournament_result(p_tournament_id uuid, p_player_id uuid, p_position integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_prize_pool INTEGER;
  v_payout_structure NUMERIC[];
  v_paid_places INTEGER;
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

  -- Рассчитываем RPS пул через новую функцию (аналог офлайн турниров)
  v_total_rps_pool := calculate_online_tournament_rps_pool(p_tournament_id);
  
  -- Получаем призовой пул (для денежных выплат)
  v_prize_pool := COALESCE(v_tournament.prize_pool, 0);

  -- Определяем структуру выплат на основе количества участников
  IF v_participant_count <= 6 THEN
    -- 2 призовых места
    v_payout_structure := ARRAY[65.0, 35.0];
    v_paid_places := 2;
  ELSIF v_participant_count <= 18 THEN
    -- 3 призовых места
    v_payout_structure := ARRAY[50.0, 30.0, 20.0];
    v_paid_places := 3;
  ELSIF v_participant_count <= 30 THEN
    -- 5 призовых мест
    v_payout_structure := ARRAY[40.0, 25.0, 15.0, 12.0, 8.0];
    v_paid_places := 5;
  ELSIF v_participant_count <= 50 THEN
    -- 6 призовых мест
    v_payout_structure := ARRAY[34.0, 23.0, 16.5, 11.9, 8.0, 6.6];
    v_paid_places := 6;
  ELSE
    -- 8 призовых мест
    v_payout_structure := ARRAY[31.7, 20.7, 15.3, 10.8, 7.2, 5.8, 4.6, 3.9];
    v_paid_places := 8;
  END IF;

  -- Рассчитываем RPS баллы и призовые для позиции игрока
  IF p_position <= v_paid_places THEN
    v_payout_percentage := v_payout_structure[p_position];
    v_player_rps := ROUND(v_total_rps_pool * v_payout_percentage / 100.0)::INTEGER;
    v_prize_amount := ROUND(v_prize_pool * v_payout_percentage / 100.0)::INTEGER;
  ELSE
    v_payout_percentage := 0;
    v_player_rps := 0;
    v_prize_amount := 0;
  END IF;

  -- Рассчитываем ELO изменение (RPS баллы = изменение ELO)
  v_elo_before := v_player.elo_rating;
  v_elo_change := v_player_rps;
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

    -- Начисляем выигрыш на баланс (если есть кошелек)
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
    'rps_pool', v_total_rps_pool,
    'elo_before', v_elo_before,
    'elo_after', v_elo_after,
    'elo_change', v_elo_change,
    'prize_amount', v_prize_amount,
    'payout_percentage', v_payout_percentage,
    'paid_places', v_paid_places
  );
END;
$function$;

-- Добавляем колонки для трекинга ребаев и аддонов в участниках онлайн турниров
ALTER TABLE public.online_poker_tournament_participants
ADD COLUMN IF NOT EXISTS rebuys_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS addons_count INTEGER DEFAULT 0;

-- Функция для ребая в онлайн турнире
CREATE OR REPLACE FUNCTION public.process_online_tournament_rebuy(
  p_tournament_id UUID,
  p_player_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tournament RECORD;
  v_participant RECORD;
  v_wallet RECORD;
  v_new_balance INTEGER;
BEGIN
  -- Получаем данные турнира
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  IF NOT v_tournament.rebuy_enabled THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rebuys are not enabled');
  END IF;

  IF v_tournament.current_level > COALESCE(v_tournament.rebuy_end_level, 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rebuy period has ended');
  END IF;

  -- Получаем данные участника
  SELECT * INTO v_participant
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND player_id = p_player_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not in tournament');
  END IF;

  -- Проверяем кошелек
  SELECT * INTO v_wallet
  FROM diamond_wallets
  WHERE player_id = p_player_id;

  IF NOT FOUND OR v_wallet.balance < v_tournament.rebuy_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Списываем стоимость ребая
  UPDATE diamond_wallets
  SET 
    balance = balance - v_tournament.rebuy_cost,
    total_spent = total_spent + v_tournament.rebuy_cost,
    updated_at = now()
  WHERE player_id = p_player_id
  RETURNING balance INTO v_new_balance;

  -- Обновляем участника
  UPDATE online_poker_tournament_participants
  SET 
    rebuys_count = rebuys_count + 1,
    chips = chips + COALESCE(v_tournament.rebuy_chips, v_tournament.starting_chips)
  WHERE tournament_id = p_tournament_id AND player_id = p_player_id;

  -- Пересчитываем призовой пул
  PERFORM calculate_online_tournament_prize_pool(p_tournament_id);

  RETURN jsonb_build_object(
    'success', true,
    'new_chips', v_participant.chips + COALESCE(v_tournament.rebuy_chips, v_tournament.starting_chips),
    'rebuy_cost', v_tournament.rebuy_cost,
    'new_balance', v_new_balance
  );
END;
$function$;

-- Функция для аддона в онлайн турнире
CREATE OR REPLACE FUNCTION public.process_online_tournament_addon(
  p_tournament_id UUID,
  p_player_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tournament RECORD;
  v_participant RECORD;
  v_wallet RECORD;
  v_new_balance INTEGER;
BEGIN
  -- Получаем данные турнира
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  IF NOT v_tournament.addon_enabled THEN
    RETURN jsonb_build_object('success', false, 'error', 'Addons are not enabled');
  END IF;

  IF v_tournament.current_level != COALESCE(v_tournament.addon_level, 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Addon not available at this level');
  END IF;

  -- Получаем данные участника
  SELECT * INTO v_participant
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND player_id = p_player_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not in tournament');
  END IF;

  IF v_participant.addons_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Addon already taken');
  END IF;

  -- Проверяем кошелек
  SELECT * INTO v_wallet
  FROM diamond_wallets
  WHERE player_id = p_player_id;

  IF NOT FOUND OR v_wallet.balance < v_tournament.addon_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Списываем стоимость аддона
  UPDATE diamond_wallets
  SET 
    balance = balance - v_tournament.addon_cost,
    total_spent = total_spent + v_tournament.addon_cost,
    updated_at = now()
  WHERE player_id = p_player_id
  RETURNING balance INTO v_new_balance;

  -- Обновляем участника
  UPDATE online_poker_tournament_participants
  SET 
    addons_count = 1,
    chips = chips + COALESCE(v_tournament.addon_chips, v_tournament.starting_chips * 2)
  WHERE tournament_id = p_tournament_id AND player_id = p_player_id;

  -- Пересчитываем призовой пул
  PERFORM calculate_online_tournament_prize_pool(p_tournament_id);

  RETURN jsonb_build_object(
    'success', true,
    'new_chips', v_participant.chips + COALESCE(v_tournament.addon_chips, v_tournament.starting_chips * 2),
    'addon_cost', v_tournament.addon_cost,
    'new_balance', v_new_balance
  );
END;
$function$;

-- Обновляем функцию расчета пула с учетом ребаев и аддонов
CREATE OR REPLACE FUNCTION public.calculate_online_tournament_prize_pool(tournament_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tournament RECORD;
  v_participant_count INTEGER;
  v_total_rebuys INTEGER;
  v_total_addons INTEGER;
  v_base_pool INTEGER;
  v_rebuy_pool INTEGER;
  v_addon_pool INTEGER;
  v_total_pool INTEGER;
BEGIN
  -- Получаем данные турнира
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = tournament_id_param;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Считаем количество участников
  SELECT COUNT(*) INTO v_participant_count
  FROM online_poker_tournament_participants
  WHERE tournament_id = tournament_id_param 
    AND status != 'cancelled';

  -- Считаем общее количество ребаев и аддонов
  SELECT 
    COALESCE(SUM(rebuys_count), 0),
    COALESCE(SUM(addons_count), 0)
  INTO v_total_rebuys, v_total_addons
  FROM online_poker_tournament_participants
  WHERE tournament_id = tournament_id_param;

  -- Рассчитываем пулы
  v_base_pool := v_participant_count * COALESCE(v_tournament.buy_in, 0);
  v_rebuy_pool := v_total_rebuys * COALESCE(v_tournament.rebuy_cost, 0);
  v_addon_pool := v_total_addons * COALESCE(v_tournament.addon_cost, 0);
  
  v_total_pool := v_base_pool + v_rebuy_pool + v_addon_pool;
  
  -- Если есть гарантия и она больше собранного пула - используем гарантию
  IF v_tournament.guaranteed_prize_pool IS NOT NULL AND v_tournament.guaranteed_prize_pool > v_total_pool THEN
    v_total_pool := v_tournament.guaranteed_prize_pool;
  END IF;

  -- Обновляем призовой пул в турнире
  UPDATE online_poker_tournaments 
  SET prize_pool = v_total_pool 
  WHERE id = tournament_id_param;

  RETURN v_total_pool;
END;
$function$;

-- Обновляем функцию расчета RPS пула с учетом ребаев и аддонов
CREATE OR REPLACE FUNCTION public.calculate_online_tournament_rps_pool(tournament_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tournament RECORD;
  v_participant_count INTEGER;
  v_total_rebuys INTEGER;
  v_total_addons INTEGER;
  v_total_rps INTEGER;
BEGIN
  -- Получаем данные турнира
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = tournament_id_param;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Считаем количество участников
  SELECT COUNT(*) INTO v_participant_count
  FROM online_poker_tournament_participants
  WHERE tournament_id = tournament_id_param 
    AND status != 'cancelled';

  -- Считаем ребаи и аддоны
  SELECT 
    COALESCE(SUM(rebuys_count), 0),
    COALESCE(SUM(addons_count), 0)
  INTO v_total_rebuys, v_total_addons
  FROM online_poker_tournament_participants
  WHERE tournament_id = tournament_id_param;

  -- Рассчитываем общий RPS пул по формуле: сумма входов / 10
  -- 1000₽ = 100 RPS баллов
  v_total_rps := ROUND(
    (v_participant_count * COALESCE(v_tournament.buy_in, 0) +
     v_total_rebuys * COALESCE(v_tournament.rebuy_cost, 0) +
     v_total_addons * COALESCE(v_tournament.addon_cost, 0)) / 10.0
  )::INTEGER;

  RETURN v_total_rps;
END;
$function$;

-- ============================================================
-- ПРОФЕССИОНАЛЬНАЯ СИСТЕМА РАССАДКИ В ТУРНИРАХ ОНЛАЙН-ПОКЕРА
-- ============================================================

-- 1. ИСПРАВЛЯЕМ ФУНКЦИЮ ПОЗДНЕЙ РЕГИСТРАЦИИ
DROP FUNCTION IF EXISTS late_register_tournament_player(UUID, UUID);
CREATE OR REPLACE FUNCTION public.late_register_tournament_player(
  p_tournament_id UUID,
  p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament RECORD;
  v_table_id UUID;
  v_seat_number INTEGER;
  v_existing_participant RECORD;
  v_min_players_table_id UUID;
  v_max_players_per_table INTEGER;
  v_total_players INTEGER;
  v_active_tables INTEGER;
  v_ideal_tables INTEGER;
  v_need_new_table BOOLEAN := FALSE;
  v_balance_result JSONB;
BEGIN
  -- Получаем данные турнира
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Турнир не найден');
  END IF;
  
  IF v_tournament.status NOT IN ('running', 'starting', 'final_table') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Турнир не принимает регистрации');
  END IF;
  
  IF NOT COALESCE(v_tournament.late_registration_enabled, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Поздняя регистрация отключена');
  END IF;
  
  IF COALESCE(v_tournament.current_level, 1) > COALESCE(v_tournament.late_registration_level, 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Период поздней регистрации закончился');
  END IF;
  
  -- Проверяем существующую регистрацию
  SELECT * INTO v_existing_participant
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND player_id = p_player_id;
  
  IF FOUND AND v_existing_participant.status IN ('registered', 'playing') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Вы уже зарегистрированы');
  END IF;
  
  -- КРИТИЧНО: используем players_per_table, а НЕ max_players
  v_max_players_per_table := COALESCE(v_tournament.players_per_table, 6);
  -- Ограничиваем до 9 максимум
  IF v_max_players_per_table > 9 THEN v_max_players_per_table := 9; END IF;
  IF v_max_players_per_table < 2 THEN v_max_players_per_table := 6; END IF;
  
  -- Считаем текущее количество активных игроков
  SELECT COUNT(*) INTO v_total_players
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND status = 'playing';
  
  -- Считаем активные столы
  SELECT COUNT(*) INTO v_active_tables
  FROM poker_tables
  WHERE tournament_id = p_tournament_id AND status IN ('waiting', 'playing');
  
  -- После добавления нового игрока их станет на 1 больше
  v_total_players := v_total_players + 1;
  
  -- Вычисляем идеальное количество столов
  v_ideal_tables := CEIL(v_total_players::DECIMAL / v_max_players_per_table);
  
  -- Нужен новый стол?
  v_need_new_table := v_ideal_tables > v_active_tables;
  
  -- Если нужен новый стол - создаём
  IF v_need_new_table THEN
    INSERT INTO poker_tables (
      name, table_type, game_type, tournament_id, max_players,
      min_buy_in, max_buy_in, small_blind, big_blind, ante,
      action_time_seconds, status, auto_start_enabled
    ) VALUES (
      format('%s - Стол %s', v_tournament.name, v_active_tables + 1),
      'tournament', 'holdem', p_tournament_id, v_max_players_per_table,
      v_tournament.starting_chips, v_tournament.starting_chips,
      COALESCE(v_tournament.small_blind, 25), COALESCE(v_tournament.big_blind, 50), COALESCE(v_tournament.ante, 0),
      COALESCE(v_tournament.action_time_seconds, 30), 'waiting', true
    )
    RETURNING id INTO v_min_players_table_id;
    
    v_seat_number := 1; -- Новый стол - место 1
  ELSE
    -- Ищем стол с минимумом игроков (но меньше максимума)
    SELECT pt.id INTO v_min_players_table_id
    FROM poker_tables pt
    LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
    WHERE pt.tournament_id = p_tournament_id 
      AND pt.status IN ('waiting', 'playing')
    GROUP BY pt.id
    HAVING COUNT(ptp.id) < v_max_players_per_table
    ORDER BY COUNT(ptp.id) ASC
    LIMIT 1;
    
    -- Если все столы полные - создаём новый
    IF v_min_players_table_id IS NULL THEN
      INSERT INTO poker_tables (
        name, table_type, game_type, tournament_id, max_players,
        min_buy_in, max_buy_in, small_blind, big_blind, ante,
        action_time_seconds, status, auto_start_enabled
      ) VALUES (
        format('%s - Стол %s', v_tournament.name, v_active_tables + 1),
        'tournament', 'holdem', p_tournament_id, v_max_players_per_table,
        v_tournament.starting_chips, v_tournament.starting_chips,
        COALESCE(v_tournament.small_blind, 25), COALESCE(v_tournament.big_blind, 50), COALESCE(v_tournament.ante, 0),
        COALESCE(v_tournament.action_time_seconds, 30), 'waiting', true
      )
      RETURNING id INTO v_min_players_table_id;
      
      v_need_new_table := TRUE;
      v_seat_number := 1;
    ELSE
      -- Ищем свободное место
      SELECT MIN(s.seat) INTO v_seat_number
      FROM generate_series(1, v_max_players_per_table) s(seat)
      WHERE NOT EXISTS (
        SELECT 1 FROM poker_table_players 
        WHERE table_id = v_min_players_table_id AND seat_number = s.seat AND status = 'active'
      );
    END IF;
  END IF;
  
  IF v_seat_number IS NULL THEN
    v_seat_number := 1; -- Fallback
  END IF;
  
  -- Регистрируем участника
  IF FOUND AND v_existing_participant IS NOT NULL THEN
    UPDATE online_poker_tournament_participants
    SET status = 'playing',
        table_id = v_min_players_table_id,
        seat_number = v_seat_number,
        chips = v_tournament.starting_chips,
        eliminated_at = NULL,
        eliminated_by = NULL,
        finish_position = NULL
    WHERE id = v_existing_participant.id;
  ELSE
    INSERT INTO online_poker_tournament_participants (
      tournament_id, player_id, status, table_id, seat_number, chips
    ) VALUES (
      p_tournament_id, p_player_id, 'playing', 
      v_min_players_table_id, v_seat_number, v_tournament.starting_chips
    );
  END IF;
  
  -- Добавляем игрока за стол
  INSERT INTO poker_table_players (
    table_id, player_id, seat_number, stack, status, is_dealer
  ) VALUES (
    v_min_players_table_id, p_player_id, v_seat_number, 
    v_tournament.starting_chips, 'active', false
  )
  ON CONFLICT (table_id, player_id) 
  DO UPDATE SET 
    seat_number = v_seat_number,
    stack = v_tournament.starting_chips,
    status = 'active';
  
  -- Обновляем призовой фонд
  UPDATE online_poker_tournaments
  SET prize_pool = COALESCE(prize_pool, 0) + COALESCE(v_tournament.buy_in, 0)
  WHERE id = p_tournament_id;
  
  -- Если создан новый стол - балансируем ВСЕ столы
  IF v_need_new_table THEN
    v_balance_result := professional_balance_tables(p_tournament_id);
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'table_id', v_min_players_table_id,
    'seat_number', v_seat_number,
    'chips', v_tournament.starting_chips,
    'new_table_created', v_need_new_table,
    'total_tables', v_active_tables + (CASE WHEN v_need_new_table THEN 1 ELSE 0 END),
    'balance_result', v_balance_result
  );
END;
$$;

-- 2. ПРОФЕССИОНАЛЬНАЯ БАЛАНСИРОВКА СТОЛОВ (правила онлайн-покера)
-- Правила:
-- - Разница между столами не более 1 игрока (4,4,5 вместо 3,5,5)
-- - При пересадке выбираем игроков, которые будут следующими на BB
-- - Пересаживаем по одному с каждого переполненного стола
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
  v_tables_with_extra INTEGER;
  v_table_rec RECORD;
  v_player_to_move RECORD;
  v_target_table RECORD;
  v_new_seat INTEGER;
  v_moves JSONB := '[]'::JSONB;
  v_move_count INTEGER := 0;
  v_iteration INTEGER := 0;
  v_max_iterations INTEGER := 50;
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
  -- Например: 13 игроков / 3 стола = 4 базово, остаток 1
  -- Значит: 2 стола по 4, 1 стол по 5
  v_ideal_per_table := v_total_players / v_active_tables;
  v_remainder := v_total_players % v_active_tables;
  v_tables_with_extra := v_remainder; -- столько столов будут иметь ideal + 1
  
  -- Цикл балансировки
  WHILE v_iteration < v_max_iterations LOOP
    v_iteration := v_iteration + 1;
    
    -- Находим самый переполненный стол (больше ideal + 1)
    SELECT pt.id as table_id, COUNT(ptp.id) as player_count, pt.current_dealer_seat
    INTO v_table_rec
    FROM poker_tables pt
    JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
    WHERE pt.tournament_id = p_tournament_id 
      AND pt.status IN ('waiting', 'playing')
    GROUP BY pt.id
    HAVING COUNT(ptp.id) > v_ideal_per_table + 1
    ORDER BY COUNT(ptp.id) DESC
    LIMIT 1;
    
    -- Если нет переполненных - проверяем дисбаланс
    IF v_table_rec IS NULL THEN
      -- Ищем пару столов с разницей > 1
      SELECT 
        source.table_id as source_id,
        source.player_count as source_count,
        target.table_id as target_id,
        target.player_count as target_count
      INTO v_table_rec
      FROM (
        SELECT pt.id as table_id, COUNT(ptp.id) as player_count
        FROM poker_tables pt
        JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
        WHERE pt.tournament_id = p_tournament_id AND pt.status IN ('waiting', 'playing')
        GROUP BY pt.id
      ) source
      CROSS JOIN (
        SELECT pt.id as table_id, COUNT(ptp.id) as player_count
        FROM poker_tables pt
        JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
        WHERE pt.tournament_id = p_tournament_id AND pt.status IN ('waiting', 'playing')
        GROUP BY pt.id
      ) target
      WHERE source.table_id != target.table_id
        AND source.player_count - target.player_count > 1
      ORDER BY source.player_count - target.player_count DESC
      LIMIT 1;
      
      IF v_table_rec IS NULL THEN
        EXIT; -- Баланс достигнут
      END IF;
      
      v_table_rec.table_id := v_table_rec.source_id;
      v_table_rec.player_count := v_table_rec.source_count;
    END IF;
    
    -- Находим целевой стол (с минимумом игроков, меньше max)
    SELECT pt.id, COUNT(ptp.id) as player_count
    INTO v_target_table
    FROM poker_tables pt
    LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
    WHERE pt.tournament_id = p_tournament_id 
      AND pt.status IN ('waiting', 'playing')
      AND pt.id != v_table_rec.table_id
    GROUP BY pt.id
    HAVING COUNT(ptp.id) < v_max_players_per_table
    ORDER BY COUNT(ptp.id) ASC
    LIMIT 1;
    
    IF v_target_table IS NULL THEN
      EXIT; -- Нет доступных целевых столов
    END IF;
    
    -- ПРАВИЛО ПОКЕРА: выбираем игрока который будет следующим на BB
    -- Приоритет: не в активной раздаче, следующий после дилера по часовой стрелке
    SELECT ptp.* 
    INTO v_player_to_move
    FROM poker_table_players ptp
    JOIN poker_tables pt ON pt.id = ptp.table_id
    WHERE ptp.table_id = v_table_rec.table_id
      AND ptp.status = 'active'
      AND pt.current_hand_id IS NULL -- не в раздаче
    ORDER BY 
      -- Приоритет тем, кто дальше от текущего дилера (скоро будет BB)
      CASE 
        WHEN ptp.seat_number > COALESCE(pt.current_dealer_seat, 0) THEN ptp.seat_number - COALESCE(pt.current_dealer_seat, 0)
        ELSE ptp.seat_number + 9 - COALESCE(pt.current_dealer_seat, 0)
      END DESC,
      ptp.joined_at ASC
    LIMIT 1;
    
    IF v_player_to_move IS NULL THEN
      -- Стол в активной раздаче - пропускаем
      EXIT;
    END IF;
    
    -- Находим свободное место
    SELECT MIN(s.seat) INTO v_new_seat
    FROM generate_series(1, v_max_players_per_table) s(seat)
    WHERE NOT EXISTS (
      SELECT 1 FROM poker_table_players 
      WHERE table_id = v_target_table.id AND seat_number = s.seat AND status = 'active'
    );
    
    IF v_new_seat IS NULL THEN
      EXIT;
    END IF;
    
    -- Выполняем пересадку
    UPDATE poker_table_players
    SET table_id = v_target_table.id, seat_number = v_new_seat
    WHERE id = v_player_to_move.id;
    
    UPDATE online_poker_tournament_participants
    SET table_id = v_target_table.id, seat_number = v_new_seat
    WHERE tournament_id = p_tournament_id AND player_id = v_player_to_move.player_id;
    
    v_move_count := v_move_count + 1;
    v_moves := v_moves || jsonb_build_object(
      'player_id', v_player_to_move.player_id,
      'from_table', v_table_rec.table_id,
      'to_table', v_target_table.id,
      'from_seat', v_player_to_move.seat_number,
      'to_seat', v_new_seat
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_players', v_total_players,
    'active_tables', v_active_tables,
    'ideal_per_table', v_ideal_per_table,
    'tables_with_extra', v_tables_with_extra,
    'moves', v_move_count,
    'details', v_moves
  );
END;
$$;

-- 3. ОБНОВЛЯЕМ balance_tournament_tables чтобы использовать новую логику
DROP FUNCTION IF EXISTS balance_tournament_tables(UUID);
CREATE OR REPLACE FUNCTION public.balance_tournament_tables(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Делегируем профессиональной функции
  RETURN professional_balance_tables(p_tournament_id);
END;
$$;

-- 4. Функция для исправления существующих турниров с неправильной рассадкой
CREATE OR REPLACE FUNCTION public.fix_tournament_seating(p_tournament_id UUID)
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
  v_ideal_tables INTEGER;
  v_new_table_id UUID;
  v_tables_created INTEGER := 0;
  v_balance_result JSONB;
BEGIN
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Турнир не найден');
  END IF;
  
  v_max_players_per_table := COALESCE(v_tournament.players_per_table, 6);
  IF v_max_players_per_table > 9 THEN v_max_players_per_table := 9; END IF;
  
  -- Считаем активных игроков
  SELECT COUNT(*) INTO v_total_players
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND status = 'playing';
  
  -- Считаем активные столы
  SELECT COUNT(*) INTO v_active_tables
  FROM poker_tables
  WHERE tournament_id = p_tournament_id AND status IN ('waiting', 'playing');
  
  -- Вычисляем нужное количество столов
  v_ideal_tables := CEIL(v_total_players::DECIMAL / v_max_players_per_table);
  
  -- Создаём недостающие столы
  WHILE v_active_tables < v_ideal_tables LOOP
    INSERT INTO poker_tables (
      name, table_type, game_type, tournament_id, max_players,
      min_buy_in, max_buy_in, small_blind, big_blind, ante,
      action_time_seconds, status, auto_start_enabled
    ) VALUES (
      format('%s - Стол %s', v_tournament.name, v_active_tables + 1),
      'tournament', 'holdem', p_tournament_id, v_max_players_per_table,
      v_tournament.starting_chips, v_tournament.starting_chips,
      COALESCE(v_tournament.small_blind, 25), COALESCE(v_tournament.big_blind, 50), COALESCE(v_tournament.ante, 0),
      COALESCE(v_tournament.action_time_seconds, 30), 'waiting', true
    )
    RETURNING id INTO v_new_table_id;
    
    v_active_tables := v_active_tables + 1;
    v_tables_created := v_tables_created + 1;
  END LOOP;
  
  -- Балансируем
  v_balance_result := professional_balance_tables(p_tournament_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'total_players', v_total_players,
    'tables_before', v_active_tables - v_tables_created,
    'tables_after', v_active_tables,
    'tables_created', v_tables_created,
    'ideal_tables', v_ideal_tables,
    'balance_result', v_balance_result
  );
END;
$$;

-- Функция для поздней регистрации игрока в турнир с авторассадкой
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
  v_table_players_count INTEGER;
  v_min_players_table_id UUID;
  v_min_players_count INTEGER := 999;
  v_max_players_per_table INTEGER := 9;
BEGIN
  -- Check tournament exists and is in late registration period
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Турнир не найден');
  END IF;
  
  IF v_tournament.status NOT IN ('running', 'starting') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Турнир не принимает регистрации');
  END IF;
  
  IF NOT COALESCE(v_tournament.late_registration_enabled, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Поздняя регистрация отключена');
  END IF;
  
  IF COALESCE(v_tournament.current_level, 1) > COALESCE(v_tournament.late_registration_level, 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Период поздней регистрации закончился');
  END IF;
  
  -- Check if player is already registered
  SELECT * INTO v_existing_participant
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND player_id = p_player_id;
  
  IF FOUND AND v_existing_participant.status IN ('registered', 'playing') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Вы уже зарегистрированы');
  END IF;
  
  -- Get max players from tournament or default to 9
  v_max_players_per_table := COALESCE(v_tournament.max_players, 9);
  IF v_max_players_per_table > 9 THEN v_max_players_per_table := 9; END IF;
  
  -- Find the table with minimum players that has free seats
  FOR v_table_id, v_table_players_count IN
    SELECT pt.id, COUNT(ptp.id)::INTEGER
    FROM poker_tables pt
    LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
    WHERE pt.tournament_id = p_tournament_id 
      AND pt.status IN ('waiting', 'playing')
    GROUP BY pt.id
    HAVING COUNT(ptp.id) < v_max_players_per_table
    ORDER BY COUNT(ptp.id) ASC
    LIMIT 1
  LOOP
    v_min_players_table_id := v_table_id;
    v_min_players_count := v_table_players_count;
  END LOOP;
  
  -- If no table with free seats found, create a new one
  IF v_min_players_table_id IS NULL THEN
    INSERT INTO poker_tables (
      name, table_type, game_type, tournament_id, max_players,
      min_buy_in, max_buy_in, small_blind, big_blind, ante,
      action_time_seconds, status, auto_start_enabled
    ) VALUES (
      format('%s - Стол %s', v_tournament.name, 
        (SELECT COALESCE(COUNT(*), 0) + 1 FROM poker_tables WHERE tournament_id = p_tournament_id)),
      'tournament', 'holdem', p_tournament_id, v_max_players_per_table,
      v_tournament.starting_chips, v_tournament.starting_chips,
      v_tournament.small_blind, v_tournament.big_blind, v_tournament.ante,
      v_tournament.action_time_seconds, 'waiting', true
    )
    RETURNING id INTO v_min_players_table_id;
  END IF;
  
  -- Find free seat at the table
  SELECT MIN(s.seat) INTO v_seat_number
  FROM generate_series(1, v_max_players_per_table) s(seat)
  WHERE NOT EXISTS (
    SELECT 1 FROM poker_table_players 
    WHERE table_id = v_min_players_table_id AND seat_number = s.seat AND status = 'active'
  );
  
  IF v_seat_number IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Нет свободных мест');
  END IF;
  
  -- Register the participant
  IF FOUND AND v_existing_participant IS NOT NULL THEN
    -- Update existing (eliminated) participant for re-entry
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
    -- Insert new participant
    INSERT INTO online_poker_tournament_participants (
      tournament_id, player_id, status, table_id, seat_number, chips
    ) VALUES (
      p_tournament_id, p_player_id, 'playing', 
      v_min_players_table_id, v_seat_number, v_tournament.starting_chips
    );
  END IF;
  
  -- Add player to table
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
  
  -- Update prize pool
  UPDATE online_poker_tournaments
  SET prize_pool = COALESCE(prize_pool, 0) + v_tournament.buy_in
  WHERE id = p_tournament_id;
  
  -- Call balance after seating
  PERFORM balance_tournament_tables(p_tournament_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'table_id', v_min_players_table_id,
    'seat_number', v_seat_number,
    'chips', v_tournament.starting_chips,
    'message', 'Успешная регистрация'
  );
END;
$$;
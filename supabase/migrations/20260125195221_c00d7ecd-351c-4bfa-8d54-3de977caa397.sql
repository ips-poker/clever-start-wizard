
-- POKERSTARS-STYLE: Implement TRUE round-robin initial seating
-- Each player is assigned to the next table in sequence, ensuring perfect ±1 balance

CREATE OR REPLACE FUNCTION public.start_online_tournament_with_seating(p_tournament_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament RECORD;
  v_participant RECORD;
  v_table_id UUID;
  v_table_count INTEGER;
  v_players_per_table INTEGER;
  v_table_ids UUID[] := '{}';
  v_level_end_at TIMESTAMP WITH TIME ZONE;
  v_total_participants INTEGER;
  v_player_index INTEGER := 0;
  v_assigned_table INTEGER;
  v_table_seat_counts INTEGER[];  -- Track seat count per table
  v_seat_number INTEGER;
BEGIN
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Tournament not found');
  END IF;
  
  -- Allow starting from registration, running, or starting status (for resilience)
  IF v_tournament.status NOT IN ('registration', 'running', 'starting') THEN
    RETURN json_build_object('success', false, 'error', 'Tournament cannot be started from status: ' || v_tournament.status);
  END IF;
  
  SELECT COUNT(*) INTO v_total_participants
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND status IN ('registered', 'playing');
  
  IF v_total_participants < v_tournament.min_players THEN
    RETURN json_build_object('success', false, 'error', format('Minimum %s players required, only %s registered', v_tournament.min_players, v_total_participants));
  END IF;
  
  -- Get max players per table from tournament config
  v_players_per_table := COALESCE(v_tournament.players_per_table, 8);
  IF v_players_per_table > 9 THEN v_players_per_table := 9; END IF;
  IF v_players_per_table < 2 THEN v_players_per_table := 2; END IF;
  
  -- Calculate number of tables needed
  v_table_count := CEIL(v_total_participants::DECIMAL / v_players_per_table);
  
  -- Initialize seat counts array
  v_table_seat_counts := array_fill(0, ARRAY[v_table_count]);
  
  -- Create tables
  FOR i IN 1..v_table_count LOOP
    INSERT INTO poker_tables (
      name, table_type, game_type, tournament_id, max_players,
      min_buy_in, max_buy_in, small_blind, big_blind, ante,
      action_time_seconds, status, auto_start_enabled
    ) VALUES (
      format('%s - Стол %s', v_tournament.name, i),
      'tournament', 'holdem', p_tournament_id, v_players_per_table,
      v_tournament.starting_chips, v_tournament.starting_chips,
      COALESCE(v_tournament.small_blind, 25), COALESCE(v_tournament.big_blind, 50), 
      COALESCE(v_tournament.ante, 0),
      COALESCE(v_tournament.action_time_seconds, 30), 'waiting', true
    )
    RETURNING id INTO v_table_id;
    
    v_table_ids := array_append(v_table_ids, v_table_id);
  END LOOP;
  
  -- POKERSTARS TRUE ROUND-ROBIN SEATING:
  -- Player 1 → Table 1, Player 2 → Table 2, Player 3 → Table 3
  -- Player 4 → Table 1, Player 5 → Table 2, Player 6 → Table 3 ...
  -- This guarantees perfect ±1 distribution
  
  v_player_index := 0;
  
  FOR v_participant IN 
    SELECT p.player_id, p.id as participant_id
    FROM online_poker_tournament_participants p
    WHERE p.tournament_id = p_tournament_id AND p.status IN ('registered', 'playing')
    ORDER BY random()  -- Random order for fairness
  LOOP
    -- TRUE ROUND-ROBIN: Assign to table based on player index modulo table count
    -- Table index is 1-based, so add 1
    v_assigned_table := (v_player_index % v_table_count) + 1;
    v_table_id := v_table_ids[v_assigned_table];
    
    -- Get next available seat for this table (seats are 0-indexed)
    v_seat_number := v_table_seat_counts[v_assigned_table];
    v_table_seat_counts[v_assigned_table] := v_table_seat_counts[v_assigned_table] + 1;
    
    -- Update participant with table and seat assignment
    UPDATE online_poker_tournament_participants
    SET table_id = v_table_id, 
        seat_number = v_seat_number,
        status = 'playing', 
        chips = v_tournament.starting_chips
    WHERE id = v_participant.participant_id;
    
    -- Insert/update poker_table_players
    INSERT INTO poker_table_players (table_id, player_id, seat_number, stack, status, is_dealer)
    VALUES (v_table_id, v_participant.player_id, v_seat_number, v_tournament.starting_chips, 'active', v_seat_number = 0)
    ON CONFLICT (table_id, player_id) DO UPDATE SET
      seat_number = EXCLUDED.seat_number,
      stack = EXCLUDED.stack,
      status = 'active';
    
    v_player_index := v_player_index + 1;
  END LOOP;
  
  -- Calculate level end time
  v_level_end_at := NOW() + (COALESCE(v_tournament.level_duration, 600) * interval '1 second');
  
  -- Update tournament status
  UPDATE online_poker_tournaments
  SET status = 'running', started_at = NOW(), current_level = 1, level_end_at = v_level_end_at
  WHERE id = p_tournament_id;
  
  -- Generate payout structure if not already defined
  PERFORM generate_online_tournament_payouts(p_tournament_id, v_total_participants);
  
  RETURN json_build_object(
    'success', true, 
    'tables_created', v_table_count, 
    'table_ids', v_table_ids,
    'total_participants', v_total_participants, 
    'players_per_table', v_players_per_table,
    'distribution', v_table_seat_counts
  );
END;
$$;


-- Also improve the late registration seating to maintain balance
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
  v_target_table_id UUID;
  v_seat_number INTEGER;
  v_starting_chips INTEGER;
  v_existing_participant UUID;
  v_min_player_count INTEGER;
BEGIN
  -- Get tournament
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;
  
  -- Check if late registration is allowed
  IF v_tournament.status NOT IN ('running', 'break') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament is not accepting registrations');
  END IF;
  
  IF NOT COALESCE(v_tournament.late_registration_enabled, true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Late registration is disabled');
  END IF;
  
  IF v_tournament.current_level > COALESCE(v_tournament.late_registration_level, 6) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Late registration period has ended');
  END IF;
  
  -- Check if already registered
  SELECT id INTO v_existing_participant
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND player_id = p_player_id AND status IN ('registered', 'playing');
  
  IF v_existing_participant IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already registered');
  END IF;
  
  v_starting_chips := v_tournament.starting_chips;
  
  -- POKERSTARS BALANCE: Find table with FEWEST players (maintain ±1 rule)
  SELECT pt.id, COUNT(ptp.id) as player_count
  INTO v_target_table_id, v_min_player_count
  FROM poker_tables pt
  LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status IN ('active', 'sitting_out')
  WHERE pt.tournament_id = p_tournament_id 
    AND pt.status IN ('waiting', 'playing')
  GROUP BY pt.id
  ORDER BY COUNT(ptp.id) ASC, random()  -- Smallest table first, random tiebreaker
  LIMIT 1;
  
  IF v_target_table_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No available tables');
  END IF;
  
  -- Find available seat at target table
  SELECT s.seat INTO v_seat_number
  FROM generate_series(0, COALESCE(v_tournament.players_per_table, 8) - 1) s(seat)
  WHERE NOT EXISTS (
    SELECT 1 FROM poker_table_players 
    WHERE table_id = v_target_table_id 
      AND seat_number = s.seat 
      AND status IN ('active', 'sitting_out')
  )
  ORDER BY random()
  LIMIT 1;
  
  IF v_seat_number IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No available seats');
  END IF;
  
  -- Create or update participant
  INSERT INTO online_poker_tournament_participants (
    tournament_id, player_id, status, chips, table_id, seat_number
  ) VALUES (
    p_tournament_id, p_player_id, 'playing', v_starting_chips, v_target_table_id, v_seat_number
  )
  ON CONFLICT (tournament_id, player_id) DO UPDATE SET
    status = 'playing',
    chips = v_starting_chips,
    table_id = v_target_table_id,
    seat_number = v_seat_number;
  
  -- Add to poker_table_players
  INSERT INTO poker_table_players (table_id, player_id, seat_number, stack, status)
  VALUES (v_target_table_id, p_player_id, v_seat_number, v_starting_chips, 'active')
  ON CONFLICT (table_id, player_id) DO UPDATE SET
    seat_number = EXCLUDED.seat_number,
    stack = EXCLUDED.stack,
    status = 'active';
  
  -- Update prize pool
  UPDATE online_poker_tournaments
  SET prize_pool = COALESCE(prize_pool, 0) + v_tournament.buy_in
  WHERE id = p_tournament_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'table_id', v_target_table_id,
    'seat_number', v_seat_number,
    'chips', v_starting_chips
  );
END;
$$;


-- Fix start_online_tournament_with_seating to use players_per_table correctly
CREATE OR REPLACE FUNCTION public.start_online_tournament_with_seating(
  p_tournament_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_participant RECORD;
  v_table_id UUID;
  v_table_count INTEGER;
  v_players_per_table INTEGER;
  v_current_table INTEGER := 1;
  v_current_seat INTEGER := 1;
  v_table_ids UUID[] := '{}';
  v_level_end_at TIMESTAMP WITH TIME ZONE;
  v_total_participants INTEGER;
  v_players_in_current_table INTEGER := 0;
  v_ideal_per_table INTEGER;
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
  
  -- CRITICAL FIX: Use players_per_table from tournament config, NOT max_players!
  -- max_players = max tournament participants (e.g., 90)
  -- players_per_table = max players per table (e.g., 8)
  v_players_per_table := COALESCE(v_tournament.players_per_table, 8);
  IF v_players_per_table > 9 THEN v_players_per_table := 9; END IF;
  IF v_players_per_table < 2 THEN v_players_per_table := 2; END IF;
  
  -- Calculate number of tables needed
  v_table_count := CEIL(v_total_participants::DECIMAL / v_players_per_table);
  
  -- Calculate ideal players per table for even distribution
  -- This ensures ±1 player difference between tables (PokerStars standard)
  v_ideal_per_table := CEIL(v_total_participants::DECIMAL / v_table_count);
  
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
  
  v_current_table := 1;
  v_current_seat := 1;
  v_players_in_current_table := 0;
  
  -- Seat players with round-robin to ensure even distribution
  FOR v_participant IN 
    SELECT p.player_id, p.id as participant_id
    FROM online_poker_tournament_participants p
    WHERE p.tournament_id = p_tournament_id AND p.status IN ('registered', 'playing')
    ORDER BY random()
  LOOP
    v_table_id := v_table_ids[v_current_table];
    
    UPDATE online_poker_tournament_participants
    SET table_id = v_table_id, seat_number = v_current_seat,
        status = 'playing', chips = v_tournament.starting_chips
    WHERE id = v_participant.participant_id;
    
    INSERT INTO poker_table_players (table_id, player_id, seat_number, stack, status, is_dealer)
    VALUES (v_table_id, v_participant.player_id, v_current_seat, v_tournament.starting_chips, 'active', v_current_seat = 1)
    ON CONFLICT (table_id, player_id) DO UPDATE SET
      seat_number = EXCLUDED.seat_number,
      stack = EXCLUDED.stack,
      status = 'active';
    
    v_players_in_current_table := v_players_in_current_table + 1;
    v_current_seat := v_current_seat + 1;
    
    -- Move to next table when current one has ideal number of players
    -- This creates round-robin distribution for ±1 balance
    IF v_players_in_current_table >= v_ideal_per_table AND v_current_table < v_table_count THEN
      v_current_seat := 1;
      v_current_table := v_current_table + 1;
      v_players_in_current_table := 0;
    END IF;
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
    'ideal_per_table', v_ideal_per_table
  );
END;
$$;

-- Also update professional_balance_tables to ensure ±1 rule is enforced
CREATE OR REPLACE FUNCTION public.professional_balance_tables(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament RECORD;
  v_max_iterations INTEGER := 50;
  v_iteration INTEGER := 0;
  v_moves_made INTEGER := 0;
  v_total_moves INTEGER := 0;
  v_table_stats RECORD;
  v_min_count INTEGER;
  v_max_count INTEGER;
  v_source_table UUID;
  v_target_table UUID;
  v_player_to_move RECORD;
  v_new_seat INTEGER;
BEGIN
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;
  
  -- Main balancing loop - continues until ±1 difference achieved
  WHILE v_iteration < v_max_iterations LOOP
    v_iteration := v_iteration + 1;
    v_moves_made := 0;
    
    -- Get min and max player counts across active tables
    SELECT 
      MIN(player_count), 
      MAX(player_count)
    INTO v_min_count, v_max_count
    FROM (
      SELECT t.id, COUNT(ptp.id) as player_count
      FROM poker_tables t
      LEFT JOIN poker_table_players ptp ON ptp.table_id = t.id AND ptp.status = 'active'
      WHERE t.tournament_id = p_tournament_id AND t.status IN ('waiting', 'playing')
      GROUP BY t.id
      HAVING COUNT(ptp.id) > 0
    ) counts;
    
    -- Exit if balanced (difference ≤ 1)
    IF v_max_count - v_min_count <= 1 THEN
      EXIT;
    END IF;
    
    -- Find source table (one with max players)
    SELECT t.id INTO v_source_table
    FROM poker_tables t
    LEFT JOIN poker_table_players ptp ON ptp.table_id = t.id AND ptp.status = 'active'
    WHERE t.tournament_id = p_tournament_id AND t.status IN ('waiting', 'playing')
    GROUP BY t.id
    HAVING COUNT(ptp.id) = v_max_count
    LIMIT 1;
    
    -- Find target table (one with min players)
    SELECT t.id INTO v_target_table
    FROM poker_tables t
    LEFT JOIN poker_table_players ptp ON ptp.table_id = t.id AND ptp.status = 'active'
    WHERE t.tournament_id = p_tournament_id AND t.status IN ('waiting', 'playing')
    GROUP BY t.id
    HAVING COUNT(ptp.id) = v_min_count
    LIMIT 1;
    
    IF v_source_table IS NULL OR v_target_table IS NULL OR v_source_table = v_target_table THEN
      EXIT;
    END IF;
    
    -- Select player to move (prefer non-blind positions, prefer bigger stacks)
    SELECT ptp.* INTO v_player_to_move
    FROM poker_table_players ptp
    WHERE ptp.table_id = v_source_table AND ptp.status = 'active'
    ORDER BY 
      CASE WHEN ptp.is_dealer THEN 1 ELSE 0 END,  -- Don't move dealer if possible
      ptp.stack DESC  -- Move bigger stacks first (they're more "stable")
    LIMIT 1;
    
    IF v_player_to_move IS NULL THEN
      EXIT;
    END IF;
    
    -- Find available seat at target table
    SELECT s.seat INTO v_new_seat
    FROM generate_series(1, COALESCE(v_tournament.players_per_table, 8)) AS s(seat)
    WHERE NOT EXISTS (
      SELECT 1 FROM poker_table_players 
      WHERE table_id = v_target_table AND seat_number = s.seat
    )
    ORDER BY s.seat
    LIMIT 1;
    
    IF v_new_seat IS NULL THEN
      EXIT;
    END IF;
    
    -- Move player
    UPDATE poker_table_players
    SET table_id = v_target_table, seat_number = v_new_seat, is_dealer = false
    WHERE id = v_player_to_move.id;
    
    -- Update participant record
    UPDATE online_poker_tournament_participants
    SET table_id = v_target_table, seat_number = v_new_seat
    WHERE tournament_id = p_tournament_id AND player_id = v_player_to_move.player_id;
    
    v_moves_made := v_moves_made + 1;
    v_total_moves := v_total_moves + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'iterations', v_iteration,
    'players_moved', v_total_moves,
    'final_min', v_min_count,
    'final_max', v_max_count,
    'balanced', v_max_count - v_min_count <= 1
  );
END;
$$;

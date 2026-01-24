
-- Fix tournament seating to handle 'registered' players who weren't seated
-- This updates the fix_tournament_seating function to also seat 'registered' players

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
  v_unseated_players INTEGER;
  v_active_tables INTEGER;
  v_ideal_tables INTEGER;
  v_new_table_id UUID;
  v_tables_created INTEGER := 0;
  v_players_seated INTEGER := 0;
  v_balance_result JSONB;
  v_player RECORD;
  v_target_table_id UUID;
  v_seat_number INTEGER;
BEGIN
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Турнир не найден');
  END IF;
  
  v_max_players_per_table := COALESCE(v_tournament.players_per_table, 6);
  IF v_max_players_per_table > 9 THEN v_max_players_per_table := 9; END IF;
  
  -- Count all active/playing participants
  SELECT COUNT(*) INTO v_total_players
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND status IN ('playing', 'active', 'registered');
  
  -- Count unseated players (registered but not assigned to table)
  SELECT COUNT(*) INTO v_unseated_players
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id 
    AND status IN ('registered', 'playing', 'active')
    AND (table_id IS NULL OR seat_number IS NULL);
  
  -- Count active tables
  SELECT COUNT(*) INTO v_active_tables
  FROM poker_tables
  WHERE tournament_id = p_tournament_id AND status IN ('waiting', 'playing');
  
  -- Calculate needed tables
  v_ideal_tables := CEIL(v_total_players::DECIMAL / v_max_players_per_table);
  IF v_ideal_tables < 1 THEN v_ideal_tables := 1; END IF;
  
  -- Create missing tables
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
  
  -- Seat all unseated players
  FOR v_player IN 
    SELECT p.id, p.player_id, p.chips
    FROM online_poker_tournament_participants p
    WHERE p.tournament_id = p_tournament_id 
      AND p.status IN ('registered', 'playing', 'active')
      AND (p.table_id IS NULL OR p.seat_number IS NULL)
    ORDER BY random()
  LOOP
    -- Find table with fewest players that isn't full
    SELECT pt.id INTO v_target_table_id
    FROM poker_tables pt
    WHERE pt.tournament_id = p_tournament_id 
      AND pt.status IN ('waiting', 'playing')
      AND (SELECT COUNT(*) FROM poker_table_players WHERE table_id = pt.id) < v_max_players_per_table
    ORDER BY (SELECT COUNT(*) FROM poker_table_players WHERE table_id = pt.id) ASC
    LIMIT 1;
    
    IF v_target_table_id IS NULL THEN
      -- Need another table
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
      RETURNING id INTO v_target_table_id;
      
      v_active_tables := v_active_tables + 1;
      v_tables_created := v_tables_created + 1;
    END IF;
    
    -- Find available seat
    SELECT s.seat INTO v_seat_number
    FROM generate_series(1, v_max_players_per_table) AS s(seat)
    WHERE NOT EXISTS (
      SELECT 1 FROM poker_table_players 
      WHERE table_id = v_target_table_id AND seat_number = s.seat
    )
    ORDER BY s.seat
    LIMIT 1;
    
    -- Insert into poker_table_players
    INSERT INTO poker_table_players (
      table_id, player_id, seat_number, stack, status, is_dealer
    ) VALUES (
      v_target_table_id, v_player.player_id, v_seat_number,
      COALESCE(v_player.chips, v_tournament.starting_chips), 'active', false
    )
    ON CONFLICT (table_id, player_id) DO UPDATE SET
      seat_number = EXCLUDED.seat_number,
      status = 'active';
    
    -- Update participant record
    UPDATE online_poker_tournament_participants
    SET 
      table_id = v_target_table_id,
      seat_number = v_seat_number,
      status = 'playing'
    WHERE id = v_player.id;
    
    v_players_seated := v_players_seated + 1;
  END LOOP;
  
  -- Run table balancing
  v_balance_result := professional_balance_tables(p_tournament_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'total_players', v_total_players,
    'unseated_before', v_unseated_players,
    'players_seated', v_players_seated,
    'tables_before', v_active_tables - v_tables_created,
    'tables_after', v_active_tables,
    'tables_created', v_tables_created,
    'balance_result', v_balance_result
  );
END;
$$;

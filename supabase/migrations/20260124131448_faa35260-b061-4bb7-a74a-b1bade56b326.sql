-- Fix seating for running tournament "супер пупер"
DO $$
DECLARE
  v_tournament_id UUID := '29c806f7-a5f1-4b77-91ee-19c7aab6004d';
  v_tournament RECORD;
  v_table_id UUID;
  v_participant RECORD;
  v_current_seat INTEGER := 0;
  v_players_per_table INTEGER;
BEGIN
  SELECT * INTO v_tournament FROM online_poker_tournaments WHERE id = v_tournament_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Tournament not found';
    RETURN;
  END IF;
  
  v_players_per_table := COALESCE(v_tournament.players_per_table, 8);
  
  -- Create a table for the tournament
  INSERT INTO poker_tables (
    name, table_type, game_type, tournament_id, max_players,
    min_buy_in, max_buy_in, small_blind, big_blind, ante,
    action_time_seconds, status, auto_start_enabled
  ) VALUES (
    format('%s - Стол 1', v_tournament.name),
    'tournament', 'holdem', v_tournament_id, v_players_per_table,
    v_tournament.starting_chips, v_tournament.starting_chips,
    COALESCE(v_tournament.small_blind, 25), COALESCE(v_tournament.big_blind, 50), COALESCE(v_tournament.ante, 0),
    COALESCE(v_tournament.action_time_seconds, 30), 'waiting', true
  )
  RETURNING id INTO v_table_id;
  
  RAISE NOTICE 'Created table %', v_table_id;
  
  -- Seat all registered participants
  FOR v_participant IN 
    SELECT p.id, p.player_id
    FROM online_poker_tournament_participants p
    WHERE p.tournament_id = v_tournament_id 
      AND p.status IN ('registered', 'playing')
    ORDER BY p.registered_at
  LOOP
    -- Update participant
    UPDATE online_poker_tournament_participants
    SET table_id = v_table_id, 
        seat_number = v_current_seat,
        status = 'playing', 
        chips = v_tournament.starting_chips
    WHERE id = v_participant.id;
    
    -- Insert into poker_table_players
    INSERT INTO poker_table_players (table_id, player_id, seat_number, stack, status, is_dealer)
    VALUES (v_table_id, v_participant.player_id, v_current_seat, v_tournament.starting_chips, 'active', v_current_seat = 0)
    ON CONFLICT (table_id, seat_number) DO NOTHING;
    
    RAISE NOTICE 'Seated player % at seat %', v_participant.player_id, v_current_seat;
    
    v_current_seat := v_current_seat + 1;
  END LOOP;
  
  -- Extend level_end_at if needed
  UPDATE online_poker_tournaments
  SET level_end_at = COALESCE(level_end_at, NOW() + interval '5 minutes')
  WHERE id = v_tournament_id AND level_end_at < NOW();
  
  -- Generate payout structure
  PERFORM generate_online_tournament_payout_structure(v_tournament_id);
  
  RAISE NOTICE 'Tournament fixed: % players seated at table %', v_current_seat, v_table_id;
END $$;
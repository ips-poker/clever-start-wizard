-- Fix the stuck tournament by manually creating table and seating players

DO $$
DECLARE
  v_tournament_id UUID := '89cf927c-7940-4a26-8dcc-cd831d8c5f46';
  v_table_id UUID;
  v_participant RECORD;
  v_current_seat INTEGER := 0;
BEGIN
  -- Create a table for the tournament
  INSERT INTO poker_tables (
    name, table_type, game_type, tournament_id, max_players,
    min_buy_in, max_buy_in, small_blind, big_blind, ante,
    action_time_seconds, status, auto_start_enabled
  ) VALUES (
    'мой турнир - Стол 1',
    'tournament', 'holdem', v_tournament_id, 8,
    20000, 20000, 50, 100, 0,
    25, 'waiting', true
  )
  RETURNING id INTO v_table_id;
  
  -- Seat all participants
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
        chips = 20000
    WHERE id = v_participant.id;
    
    -- Insert into poker_table_players
    INSERT INTO poker_table_players (table_id, player_id, seat_number, stack, status, is_dealer)
    VALUES (v_table_id, v_participant.player_id, v_current_seat, 20000, 'active', v_current_seat = 0)
    ON CONFLICT (table_id, seat_number) DO NOTHING;
    
    v_current_seat := v_current_seat + 1;
  END LOOP;
  
  -- Update level_end_at if not set
  UPDATE online_poker_tournaments
  SET level_end_at = COALESCE(level_end_at, NOW() + interval '5 minutes')
  WHERE id = v_tournament_id AND level_end_at IS NULL;
  
  RAISE NOTICE 'Tournament fixed: table % created, % players seated', v_table_id, v_current_seat;
END $$;
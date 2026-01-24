-- Update start_online_tournament_with_seating to also work for running tournaments without seating
CREATE OR REPLACE FUNCTION start_online_tournament_with_seating(p_tournament_id UUID)
RETURNS json
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
  v_current_seat INTEGER := 0;
  v_table_ids UUID[] := '{}';
  v_level_end_at TIMESTAMP WITH TIME ZONE;
  v_total_participants INTEGER;
  v_already_seated INTEGER;
BEGIN
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Tournament not found');
  END IF;
  
  -- Allow both 'registration' and 'running' (for fixing stuck tournaments)
  IF v_tournament.status NOT IN ('registration', 'running', 'starting') THEN
    RETURN json_build_object('success', false, 'error', 'Tournament must be in registration, starting or running status');
  END IF;
  
  -- Check if already seated
  SELECT COUNT(*) INTO v_already_seated
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND table_id IS NOT NULL;
  
  IF v_already_seated > 0 THEN
    RETURN json_build_object('success', true, 'message', 'Players already seated', 'already_seated', v_already_seated);
  END IF;
  
  SELECT COUNT(*) INTO v_total_participants
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND status IN ('registered', 'playing');
  
  IF v_total_participants < v_tournament.min_players THEN
    RETURN json_build_object('success', false, 'error', format('Minimum %s players required, only %s registered', v_tournament.min_players, v_total_participants));
  END IF;
  
  v_players_per_table := COALESCE(v_tournament.players_per_table, 6);
  IF v_players_per_table > 9 THEN v_players_per_table := 9; END IF;
  v_table_count := CEIL(v_total_participants::DECIMAL / v_players_per_table);
  v_players_per_table := CEIL(v_total_participants::DECIMAL / v_table_count);
  
  FOR i IN 1..v_table_count LOOP
    INSERT INTO poker_tables (
      name, table_type, game_type, tournament_id, max_players,
      min_buy_in, max_buy_in, small_blind, big_blind, ante,
      action_time_seconds, status, auto_start_enabled
    ) VALUES (
      format('%s - Стол %s', v_tournament.name, i),
      'tournament', 'holdem', p_tournament_id, COALESCE(v_tournament.players_per_table, 6),
      v_tournament.starting_chips, v_tournament.starting_chips,
      COALESCE(v_tournament.small_blind, 25), COALESCE(v_tournament.big_blind, 50), COALESCE(v_tournament.ante, 0),
      COALESCE(v_tournament.action_time_seconds, 30), 'waiting', true
    )
    RETURNING id INTO v_table_id;
    
    v_table_ids := array_append(v_table_ids, v_table_id);
  END LOOP;
  
  v_current_table := 1;
  v_current_seat := 0;
  
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
    VALUES (v_table_id, v_participant.player_id, v_current_seat, v_tournament.starting_chips, 'active', v_current_seat = 0)
    ON CONFLICT (table_id, seat_number) DO NOTHING;
    
    v_current_seat := v_current_seat + 1;
    IF v_current_seat >= v_players_per_table THEN
      v_current_seat := 0;
      v_current_table := v_current_table + 1;
    END IF;
  END LOOP;
  
  v_level_end_at := NOW() + (COALESCE(v_tournament.level_duration, 300) * interval '1 second');
  
  -- Only update status if still in registration
  IF v_tournament.status = 'registration' THEN
    UPDATE online_poker_tournaments
    SET status = 'running', started_at = NOW(), current_level = 1, level_end_at = v_level_end_at
    WHERE id = p_tournament_id;
  ELSE
    -- Just update level_end_at if not set
    UPDATE online_poker_tournaments
    SET level_end_at = COALESCE(level_end_at, v_level_end_at)
    WHERE id = p_tournament_id AND (level_end_at IS NULL OR level_end_at < NOW());
  END IF;
  
  -- Generate payout structure
  PERFORM generate_online_tournament_payout_structure(p_tournament_id);
  
  RETURN json_build_object(
    'success', true, 'tables_created', v_table_count, 'table_ids', v_table_ids,
    'total_participants', v_total_participants, 'players_per_table', v_players_per_table
  );
END;
$$;
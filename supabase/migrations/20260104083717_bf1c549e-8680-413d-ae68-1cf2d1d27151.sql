
-- Исправляем search_path в функции
CREATE OR REPLACE FUNCTION public.start_online_tournament_with_seating(p_tournament_id uuid)
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
BEGIN
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Tournament not found');
  END IF;
  
  IF v_tournament.status != 'registration' THEN
    RETURN json_build_object('success', false, 'error', 'Tournament is not in registration status');
  END IF;
  
  SELECT COUNT(*) INTO v_total_participants
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND status = 'registered';
  
  IF v_total_participants < v_tournament.min_players THEN
    RETURN json_build_object('success', false, 'error', format('Minimum %s players required, only %s registered', v_tournament.min_players, v_total_participants));
  END IF;
  
  v_players_per_table := COALESCE(v_tournament.players_per_table, 6);
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
      v_tournament.small_blind, v_tournament.big_blind, v_tournament.ante,
      v_tournament.action_time_seconds, 'waiting', true
    )
    RETURNING id INTO v_table_id;
    
    v_table_ids := array_append(v_table_ids, v_table_id);
  END LOOP;
  
  v_current_table := 1;
  v_current_seat := 0;
  
  FOR v_participant IN 
    SELECT p.player_id, p.id as participant_id
    FROM online_poker_tournament_participants p
    WHERE p.tournament_id = p_tournament_id AND p.status = 'registered'
    ORDER BY random()
  LOOP
    v_table_id := v_table_ids[v_current_table];
    
    UPDATE online_poker_tournament_participants
    SET table_id = v_table_id, seat_number = v_current_seat,
        status = 'playing', chips = v_tournament.starting_chips
    WHERE id = v_participant.participant_id;
    
    INSERT INTO poker_table_players (table_id, player_id, seat_number, stack, status, is_dealer)
    VALUES (v_table_id, v_participant.player_id, v_current_seat, v_tournament.starting_chips, 'active', v_current_seat = 0);
    
    v_current_seat := v_current_seat + 1;
    IF v_current_seat >= v_players_per_table THEN
      v_current_seat := 0;
      v_current_table := v_current_table + 1;
    END IF;
  END LOOP;
  
  v_level_end_at := NOW() + (v_tournament.level_duration * interval '1 second');
  
  UPDATE online_poker_tournaments
  SET status = 'running', started_at = NOW(), current_level = 1, level_end_at = v_level_end_at
  WHERE id = p_tournament_id;
  
  RETURN json_build_object(
    'success', true, 'tables_created', v_table_count, 'table_ids', v_table_ids,
    'total_participants', v_total_participants, 'players_per_table', v_players_per_table
  );
END;
$$;

-- Также исправим существующие данные текущего турнира на 0-based seats
UPDATE poker_table_players ptp
SET seat_number = ptp.seat_number - 1
FROM poker_tables pt
WHERE ptp.table_id = pt.id
  AND pt.tournament_id = '16a796b5-56f9-4f70-826b-79010c7f1cbf'
  AND ptp.seat_number > 0;

UPDATE online_poker_tournament_participants
SET seat_number = seat_number - 1
WHERE tournament_id = '16a796b5-56f9-4f70-826b-79010c7f1cbf'
  AND seat_number > 0;

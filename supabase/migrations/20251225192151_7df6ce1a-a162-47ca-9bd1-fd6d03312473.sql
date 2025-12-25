-- Drop existing function first
DROP FUNCTION IF EXISTS public.eliminate_online_tournament_player(uuid, uuid, uuid);

-- =====================================================
-- TOURNAMENT SEATING SYSTEM
-- =====================================================

-- Function to create tournament tables and seat players when tournament starts
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
  
  v_players_per_table := LEAST(9, v_tournament.max_players);
  v_table_count := CEIL(v_total_participants::DECIMAL / v_players_per_table);
  v_players_per_table := CEIL(v_total_participants::DECIMAL / v_table_count);
  
  FOR i IN 1..v_table_count LOOP
    INSERT INTO poker_tables (
      name, table_type, game_type, tournament_id, max_players,
      min_buy_in, max_buy_in, small_blind, big_blind, ante,
      action_time_seconds, status, auto_start_enabled
    ) VALUES (
      format('%s - Стол %s', v_tournament.name, i),
      'tournament', 'holdem', p_tournament_id, v_players_per_table,
      v_tournament.starting_chips, v_tournament.starting_chips,
      v_tournament.small_blind, v_tournament.big_blind, v_tournament.ante,
      v_tournament.action_time_seconds, 'waiting', true
    )
    RETURNING id INTO v_table_id;
    
    v_table_ids := array_append(v_table_ids, v_table_id);
  END LOOP;
  
  v_current_table := 1;
  v_current_seat := 1;
  
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
    VALUES (v_table_id, v_participant.player_id, v_current_seat, v_tournament.starting_chips, 'active', v_current_seat = 1);
    
    v_current_seat := v_current_seat + 1;
    IF v_current_seat > v_players_per_table THEN
      v_current_seat := 1;
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

-- Function to get player's current table in a tournament
CREATE OR REPLACE FUNCTION public.get_player_tournament_table(p_tournament_id UUID, p_player_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_participant RECORD;
  v_table RECORD;
BEGIN
  SELECT * INTO v_participant
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND player_id = p_player_id AND status IN ('registered', 'playing');
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Player not registered');
  END IF;
  
  IF v_participant.table_id IS NULL THEN
    RETURN json_build_object('success', true, 'status', v_participant.status, 'table_assigned', false);
  END IF;
  
  SELECT * INTO v_table FROM poker_tables WHERE id = v_participant.table_id;
  
  RETURN json_build_object('success', true, 'status', v_participant.status, 'table_assigned', true,
    'table_id', v_participant.table_id, 'table_name', v_table.name,
    'seat_number', v_participant.seat_number, 'chips', v_participant.chips);
END;
$$;

-- Function to balance tables
CREATE OR REPLACE FUNCTION public.balance_tournament_tables(p_tournament_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tables RECORD;
  v_min_players INTEGER;
  v_max_players INTEGER;
  v_player_to_move RECORD;
  v_target_table RECORD;
  v_new_seat INTEGER;
  v_moves_made INTEGER := 0;
BEGIN
  SELECT MIN(player_count), MAX(player_count) INTO v_min_players, v_max_players
  FROM (SELECT t.id, COUNT(ptp.id) as player_count FROM poker_tables t
    LEFT JOIN poker_table_players ptp ON ptp.table_id = t.id AND ptp.status = 'active'
    WHERE t.tournament_id = p_tournament_id AND t.status != 'closed' GROUP BY t.id) tc;
  
  IF v_max_players IS NULL OR v_min_players IS NULL OR v_max_players - v_min_players <= 1 THEN
    RETURN json_build_object('success', true, 'moves', 0);
  END IF;
  
  WHILE v_max_players - v_min_players > 1 LOOP
    SELECT t.id, COUNT(ptp.id) as player_count INTO v_tables
    FROM poker_tables t LEFT JOIN poker_table_players ptp ON ptp.table_id = t.id AND ptp.status = 'active'
    WHERE t.tournament_id = p_tournament_id AND t.status != 'closed'
    GROUP BY t.id ORDER BY COUNT(ptp.id) DESC LIMIT 1;
    
    SELECT ptp.*, ph.id as hand_id INTO v_player_to_move
    FROM poker_table_players ptp LEFT JOIN poker_hands ph ON ph.table_id = ptp.table_id AND ph.completed_at IS NULL
    WHERE ptp.table_id = v_tables.id AND ptp.status = 'active'
    ORDER BY ph.id NULLS FIRST, ptp.seat_number DESC LIMIT 1;
    
    IF v_player_to_move IS NULL OR v_player_to_move.hand_id IS NOT NULL THEN EXIT; END IF;
    
    SELECT t.id, t.max_players INTO v_target_table
    FROM poker_tables t LEFT JOIN poker_table_players ptp ON ptp.table_id = t.id AND ptp.status = 'active'
    WHERE t.tournament_id = p_tournament_id AND t.id != v_tables.id AND t.status != 'closed'
    GROUP BY t.id, t.max_players HAVING COUNT(ptp.id) < t.max_players ORDER BY COUNT(ptp.id) ASC LIMIT 1;
    
    IF v_target_table IS NULL THEN EXIT; END IF;
    
    SELECT seat_num INTO v_new_seat FROM generate_series(1, v_target_table.max_players) seat_num
    WHERE seat_num NOT IN (SELECT seat_number FROM poker_table_players WHERE table_id = v_target_table.id) LIMIT 1;
    
    IF v_new_seat IS NULL THEN EXIT; END IF;
    
    UPDATE poker_table_players SET table_id = v_target_table.id, seat_number = v_new_seat WHERE id = v_player_to_move.id;
    UPDATE online_poker_tournament_participants SET table_id = v_target_table.id, seat_number = v_new_seat
    WHERE tournament_id = p_tournament_id AND player_id = v_player_to_move.player_id;
    
    v_moves_made := v_moves_made + 1;
    
    SELECT MIN(player_count), MAX(player_count) INTO v_min_players, v_max_players
    FROM (SELECT t.id, COUNT(ptp.id) as player_count FROM poker_tables t
      LEFT JOIN poker_table_players ptp ON ptp.table_id = t.id AND ptp.status = 'active'
      WHERE t.tournament_id = p_tournament_id AND t.status != 'closed' GROUP BY t.id) tc;
    
    IF v_max_players IS NULL OR v_min_players IS NULL THEN EXIT; END IF;
  END LOOP;
  
  RETURN json_build_object('success', true, 'moves', v_moves_made);
END;
$$;

-- Function to consolidate tables
CREATE OR REPLACE FUNCTION public.consolidate_tournament_tables(p_tournament_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_empty_table RECORD;
  v_tables_closed INTEGER := 0;
  v_total_players INTEGER;
  v_active_tables INTEGER;
BEGIN
  FOR v_empty_table IN
    SELECT t.id FROM poker_tables t LEFT JOIN poker_table_players ptp ON ptp.table_id = t.id AND ptp.status = 'active'
    WHERE t.tournament_id = p_tournament_id AND t.status != 'closed' GROUP BY t.id HAVING COUNT(ptp.id) = 0
  LOOP
    UPDATE poker_tables SET status = 'closed' WHERE id = v_empty_table.id;
    v_tables_closed := v_tables_closed + 1;
  END LOOP;
  
  SELECT COUNT(*) INTO v_total_players FROM online_poker_tournament_participants WHERE tournament_id = p_tournament_id AND status = 'playing';
  SELECT COUNT(*) INTO v_active_tables FROM poker_tables WHERE tournament_id = p_tournament_id AND status != 'closed';
  
  IF v_total_players <= 9 AND v_active_tables > 1 THEN
    PERFORM balance_tournament_tables(p_tournament_id);
    UPDATE online_poker_tournaments SET status = 'final_table' WHERE id = p_tournament_id;
  END IF;
  
  RETURN json_build_object('success', true, 'tables_closed', v_tables_closed, 'remaining_players', v_total_players);
END;
$$;

-- Updated eliminate function with balancing
CREATE OR REPLACE FUNCTION public.eliminate_online_tournament_player(
  p_tournament_id UUID, p_player_id UUID, p_eliminated_by UUID DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_participant RECORD;
  v_remaining_players INTEGER;
  v_position INTEGER;
  v_balance_result JSON;
BEGIN
  SELECT * INTO v_participant FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND player_id = p_player_id AND status = 'playing';
  
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Player not found'); END IF;
  
  SELECT COUNT(*) INTO v_remaining_players FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND status = 'playing' AND player_id != p_player_id;
  
  v_position := v_remaining_players + 1;
  
  UPDATE online_poker_tournament_participants
  SET status = 'eliminated', eliminated_at = NOW(), eliminated_by = p_eliminated_by, finish_position = v_position
  WHERE id = v_participant.id;
  
  DELETE FROM poker_table_players WHERE player_id = p_player_id AND table_id = v_participant.table_id;
  
  v_balance_result := balance_tournament_tables(p_tournament_id);
  PERFORM consolidate_tournament_tables(p_tournament_id);
  
  IF v_remaining_players = 1 THEN
    UPDATE online_poker_tournament_participants SET status = 'winner', finish_position = 1
    WHERE tournament_id = p_tournament_id AND status = 'playing';
    UPDATE online_poker_tournaments SET status = 'completed', finished_at = NOW() WHERE id = p_tournament_id;
    PERFORM generate_online_tournament_payout_structure(p_tournament_id);
  END IF;
  
  RETURN json_build_object('success', true, 'finish_position', v_position, 'remaining_players', v_remaining_players,
    'tournament_finished', v_remaining_players = 1, 'balance_result', v_balance_result);
END;
$$;
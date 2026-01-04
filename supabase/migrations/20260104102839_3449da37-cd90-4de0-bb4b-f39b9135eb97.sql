
-- Create admin function to fix stuck tournaments
CREATE OR REPLACE FUNCTION public.fix_stuck_tournament(
  p_tournament_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_next_level RECORD;
  v_current_level int;
  v_new_end_time timestamptz;
BEGIN
  -- Get tournament
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Tournament not found');
  END IF;
  
  v_current_level := COALESCE(v_tournament.current_level, 1);
  
  -- Get next level info
  SELECT * INTO v_next_level
  FROM online_poker_tournament_levels
  WHERE tournament_id = p_tournament_id
    AND level = v_current_level + 1;
  
  IF FOUND THEN
    -- Advance to next level
    v_new_end_time := NOW() + (COALESCE(v_next_level.duration, 300) * INTERVAL '1 second');
    
    UPDATE online_poker_tournaments
    SET 
      current_level = v_current_level + 1,
      small_blind = CASE WHEN v_next_level.is_break THEN v_tournament.small_blind ELSE v_next_level.small_blind END,
      big_blind = CASE WHEN v_next_level.is_break THEN v_tournament.big_blind ELSE v_next_level.big_blind END,
      ante = CASE WHEN v_next_level.is_break THEN v_tournament.ante ELSE v_next_level.ante END,
      status = CASE WHEN v_next_level.is_break THEN 'break' ELSE 'running' END,
      level_end_at = v_new_end_time
    WHERE id = p_tournament_id;
    
    -- Update tables if not break
    IF NOT COALESCE(v_next_level.is_break, false) THEN
      UPDATE poker_tables
      SET 
        small_blind = v_next_level.small_blind,
        big_blind = v_next_level.big_blind,
        ante = COALESCE(v_next_level.ante, 0)
      WHERE tournament_id = p_tournament_id;
    END IF;
    
    RETURN json_build_object(
      'success', true,
      'action', 'advanced',
      'new_level', v_current_level + 1,
      'new_end_at', v_new_end_time
    );
  ELSE
    -- No next level, just reset timer
    v_new_end_time := NOW() + (COALESCE(v_tournament.level_duration, 300) * INTERVAL '1 second');
    
    UPDATE online_poker_tournaments
    SET 
      status = 'running',
      level_end_at = v_new_end_time
    WHERE id = p_tournament_id;
    
    RETURN json_build_object(
      'success', true,
      'action', 'timer_reset',
      'level', v_current_level,
      'new_end_at', v_new_end_time
    );
  END IF;
END;
$$;

-- Grant execute to authenticated and service role
GRANT EXECUTE ON FUNCTION public.fix_stuck_tournament(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fix_stuck_tournament(uuid) TO service_role;

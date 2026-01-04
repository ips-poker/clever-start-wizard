-- Add bounty tracking columns to participants table
ALTER TABLE online_poker_tournament_participants
ADD COLUMN IF NOT EXISTS bounty_collected integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS bounty_value integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS knockouts_count integer DEFAULT 0;

-- Create index for faster bounty queries
CREATE INDEX IF NOT EXISTS idx_participants_eliminated_by 
ON online_poker_tournament_participants(eliminated_by) 
WHERE eliminated_by IS NOT NULL;

-- Create index for tournament status queries
CREATE INDEX IF NOT EXISTS idx_tournaments_auto_start 
ON online_poker_tournaments(auto_start, status, scheduled_start_at)
WHERE auto_start = true AND status = 'registration';

-- Add PKO format to tournament_format constraint comment (for documentation)
COMMENT ON COLUMN online_poker_tournaments.tournament_format IS 
'Tournament format: freezeout, rebuy, knockout, bounty, pko (Progressive Knockout)';

-- Function to process knockout and update bounties
CREATE OR REPLACE FUNCTION process_pko_knockout(
  p_tournament_id UUID,
  p_eliminated_player_id UUID,
  p_eliminator_player_id UUID
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_starting_bounty INTEGER;
  v_eliminated_bounty INTEGER;
  v_collected_amount INTEGER;
  v_added_to_bounty INTEGER;
BEGIN
  -- Get tournament info
  SELECT id, buy_in, tournament_format 
  INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;
  
  -- Check if PKO format
  IF v_tournament.tournament_format NOT IN ('pko', 'knockout', 'bounty') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a PKO tournament');
  END IF;
  
  -- Calculate starting bounty (50% of buy-in)
  v_starting_bounty := FLOOR(v_tournament.buy_in * 0.5);
  
  -- Get eliminated player's current bounty value
  SELECT COALESCE(bounty_value, v_starting_bounty)
  INTO v_eliminated_bounty
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND player_id = p_eliminated_player_id;
  
  IF v_eliminated_bounty IS NULL THEN
    v_eliminated_bounty := v_starting_bounty;
  END IF;
  
  -- Split: 50% collected, 50% added to winner's bounty
  v_collected_amount := FLOOR(v_eliminated_bounty * 0.5);
  v_added_to_bounty := v_eliminated_bounty - v_collected_amount;
  
  -- Update eliminator's stats
  UPDATE online_poker_tournament_participants
  SET 
    bounty_collected = COALESCE(bounty_collected, 0) + v_collected_amount,
    bounty_value = COALESCE(bounty_value, v_starting_bounty) + v_added_to_bounty,
    knockouts_count = COALESCE(knockouts_count, 0) + 1
  WHERE tournament_id = p_tournament_id AND player_id = p_eliminator_player_id;
  
  -- Update eliminated player
  UPDATE online_poker_tournament_participants
  SET 
    eliminated_by = p_eliminator_player_id,
    eliminated_at = NOW(),
    status = 'eliminated',
    bounty_value = 0
  WHERE tournament_id = p_tournament_id AND player_id = p_eliminated_player_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'eliminated_bounty', v_eliminated_bounty,
    'collected_amount', v_collected_amount,
    'added_to_bounty', v_added_to_bounty
  );
END;
$$;

-- Function to get bounty leaderboard
CREATE OR REPLACE FUNCTION get_pko_bounty_leaderboard(
  p_tournament_id UUID,
  p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  player_id UUID,
  player_name TEXT,
  knockouts INTEGER,
  bounty_collected INTEGER,
  current_bounty INTEGER,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    otp.player_id,
    p.name AS player_name,
    COALESCE(otp.knockouts_count, 0) AS knockouts,
    COALESCE(otp.bounty_collected, 0) AS bounty_collected,
    COALESCE(otp.bounty_value, FLOOR(ot.buy_in * 0.5)::INTEGER) AS current_bounty,
    p.avatar_url
  FROM online_poker_tournament_participants otp
  JOIN players p ON p.id = otp.player_id
  JOIN online_poker_tournaments ot ON ot.id = otp.tournament_id
  WHERE otp.tournament_id = p_tournament_id
    AND COALESCE(otp.knockouts_count, 0) > 0
  ORDER BY COALESCE(otp.knockouts_count, 0) DESC, COALESCE(otp.bounty_collected, 0) DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_pko_knockout(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pko_bounty_leaderboard(UUID, INTEGER) TO authenticated, anon;
-- ============================================
-- POKERSTARS-STYLE SIT-OUT SYSTEM
-- Professional sit-out tracking for cash games and tournaments
-- ============================================

-- 1. Add new columns to poker_table_players for sit-out tracking
ALTER TABLE poker_table_players 
ADD COLUMN IF NOT EXISTS sit_out_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sit_out_orbits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS missed_turns INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_orbit_dealer INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS missed_bb BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS missed_sb BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_post_blinds BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS wait_for_bb BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_posting_dead BOOLEAN DEFAULT FALSE;

-- 2. Add comments for documentation
COMMENT ON COLUMN poker_table_players.sit_out_at IS 'Timestamp when player started sitting out';
COMMENT ON COLUMN poker_table_players.sit_out_orbits IS 'Number of orbits player has been sitting out';
COMMENT ON COLUMN poker_table_players.missed_turns IS 'Consecutive missed turns (auto sit-out after threshold)';
COMMENT ON COLUMN poker_table_players.last_orbit_dealer IS 'Dealer seat when orbit tracking started';
COMMENT ON COLUMN poker_table_players.missed_bb IS 'True if player missed big blind while sitting out';
COMMENT ON COLUMN poker_table_players.missed_sb IS 'True if player missed small blind while sitting out';
COMMENT ON COLUMN poker_table_players.auto_post_blinds IS 'Auto-post blinds when returning from sit-out';
COMMENT ON COLUMN poker_table_players.wait_for_bb IS 'Wait for big blind before playing (new player or returning)';
COMMENT ON COLUMN poker_table_players.is_posting_dead IS 'Currently posting dead money (missed blinds)';

-- 3. Create index for efficient sit-out queries
CREATE INDEX IF NOT EXISTS idx_poker_table_players_sit_out 
ON poker_table_players (table_id, status) 
WHERE status = 'sitting_out';

-- 4. Create function to track sit-out orbits
CREATE OR REPLACE FUNCTION track_sit_out_orbit(
  p_table_id UUID,
  p_new_dealer_seat INTEGER
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_warned_players UUID[];
  v_removed_players UUID[];
BEGIN
  -- Update orbit count for all sitting-out players when dealer passes them
  WITH updated AS (
    UPDATE poker_table_players
    SET 
      sit_out_orbits = sit_out_orbits + 1,
      last_orbit_dealer = p_new_dealer_seat
    WHERE table_id = p_table_id
      AND status = 'sitting_out'
      AND (last_orbit_dealer IS NULL OR last_orbit_dealer != p_new_dealer_seat)
    RETURNING id, player_id, sit_out_orbits
  )
  SELECT COUNT(*), ARRAY_AGG(player_id)
  INTO v_updated_count, v_warned_players
  FROM updated
  WHERE sit_out_orbits >= 3; -- Warning at 3 orbits (1 before max of 4)
  
  RETURN json_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'warned_players', v_warned_players
  );
END;
$$;

-- 5. Create function to check missed blinds for cash games
CREATE OR REPLACE FUNCTION check_missed_blinds(
  p_table_id UUID,
  p_bb_seat INTEGER,
  p_sb_seat INTEGER
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_missed_bb_player UUID;
  v_missed_sb_player UUID;
BEGIN
  -- Check if BB position player is sitting out
  SELECT player_id INTO v_missed_bb_player
  FROM poker_table_players
  WHERE table_id = p_table_id
    AND seat_number = p_bb_seat
    AND status = 'sitting_out';
  
  IF v_missed_bb_player IS NOT NULL THEN
    UPDATE poker_table_players
    SET missed_bb = TRUE
    WHERE player_id = v_missed_bb_player AND table_id = p_table_id;
  END IF;
  
  -- Check if SB position player is sitting out
  SELECT player_id INTO v_missed_sb_player
  FROM poker_table_players
  WHERE table_id = p_table_id
    AND seat_number = p_sb_seat
    AND status = 'sitting_out';
  
  IF v_missed_sb_player IS NOT NULL THEN
    UPDATE poker_table_players
    SET missed_sb = TRUE
    WHERE player_id = v_missed_sb_player AND table_id = p_table_id;
  END IF;
  
  RETURN json_build_object(
    'missed_bb_player', v_missed_bb_player,
    'missed_sb_player', v_missed_sb_player
  );
END;
$$;

-- 6. Create function to handle player returning from sit-out
CREATE OR REPLACE FUNCTION player_sit_in(
  p_table_id UUID,
  p_player_id UUID,
  p_post_dead BOOLEAN DEFAULT FALSE
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player RECORD;
  v_dead_amount INTEGER := 0;
  v_bb INTEGER;
  v_sb INTEGER;
BEGIN
  SELECT * INTO v_player
  FROM poker_table_players
  WHERE table_id = p_table_id AND player_id = p_player_id;
  
  IF v_player IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Player not found');
  END IF;
  
  -- Get table blinds
  SELECT big_blind, small_blind INTO v_bb, v_sb
  FROM poker_tables
  WHERE id = p_table_id;
  
  -- Calculate dead money if posting
  IF p_post_dead AND v_player.missed_bb THEN
    v_dead_amount := v_bb;
    IF v_player.missed_sb THEN
      v_dead_amount := v_dead_amount + v_sb;
    END IF;
  END IF;
  
  -- Update player status
  UPDATE poker_table_players
  SET 
    status = 'active',
    sit_out_at = NULL,
    sit_out_orbits = 0,
    missed_turns = 0,
    missed_bb = FALSE,
    missed_sb = FALSE,
    is_posting_dead = (v_dead_amount > 0),
    wait_for_bb = (NOT p_post_dead AND v_player.missed_bb)
  WHERE table_id = p_table_id AND player_id = p_player_id;
  
  RETURN json_build_object(
    'success', true,
    'dead_amount', v_dead_amount,
    'wait_for_bb', (NOT p_post_dead AND v_player.missed_bb)
  );
END;
$$;

-- 7. Function to remove players who exceeded sit-out limit
CREATE OR REPLACE FUNCTION remove_excessive_sit_out_players(
  p_table_id UUID,
  p_max_orbits INTEGER DEFAULT 4,
  p_is_tournament BOOLEAN DEFAULT FALSE
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removed_count INTEGER := 0;
  v_removed_players UUID[];
  v_effective_max INTEGER;
BEGIN
  -- Tournaments have stricter limits (2 orbits) but players are not removed, just blinded out
  IF p_is_tournament THEN
    -- In tournaments, don't remove - just track for UI warning
    RETURN json_build_object(
      'success', true,
      'removed_count', 0,
      'message', 'Tournament players are not removed for sit-out'
    );
  END IF;
  
  v_effective_max := p_max_orbits;
  
  -- For cash games, remove players who exceeded orbit limit
  WITH removed AS (
    DELETE FROM poker_table_players
    WHERE table_id = p_table_id
      AND status = 'sitting_out'
      AND sit_out_orbits >= v_effective_max
    RETURNING player_id
  )
  SELECT COUNT(*), ARRAY_AGG(player_id)
  INTO v_removed_count, v_removed_players
  FROM removed;
  
  RETURN json_build_object(
    'success', true,
    'removed_count', v_removed_count,
    'removed_players', v_removed_players
  );
END;
$$;
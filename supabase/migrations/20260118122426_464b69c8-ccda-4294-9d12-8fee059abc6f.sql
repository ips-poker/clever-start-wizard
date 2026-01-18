-- Phase 1: Database Hardening - Prevention of Stuck Hands

-- 1.1 Unique index to prevent multiple active hands per table
-- This is the CRITICAL protection - only ONE active hand per table allowed
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_hand_per_table 
ON poker_hands (table_id) 
WHERE completed_at IS NULL;

-- 1.2 Add 'aborted' phase for stuck hand cleanup
-- First drop the old constraint if exists, then add new one with 'aborted'
DO $$ 
BEGIN
  -- Check if constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'poker_hands_phase_check'
  ) THEN
    ALTER TABLE poker_hands DROP CONSTRAINT poker_hands_phase_check;
  END IF;
END $$;

-- Add new constraint with 'aborted' phase
ALTER TABLE poker_hands ADD CONSTRAINT poker_hands_phase_check 
CHECK (phase IN ('preflop', 'flop', 'turn', 'river', 'showdown', 'complete', 'aborted'));

-- 1.3 Create atomic_start_hand function
-- This function atomically closes any existing uncompleted hands and creates a new one
CREATE OR REPLACE FUNCTION atomic_start_hand(
  p_table_id UUID,
  p_dealer_seat INTEGER,
  p_small_blind_seat INTEGER,
  p_big_blind_seat INTEGER,
  p_deck_state TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_hand_id UUID;
  v_hand_number INTEGER;
  v_closed_count INTEGER := 0;
BEGIN
  -- Step 1: Close any existing uncompleted hands for this table (safety net)
  UPDATE poker_hands 
  SET 
    completed_at = NOW(),
    phase = 'aborted'
  WHERE table_id = p_table_id 
    AND completed_at IS NULL;
  
  GET DIAGNOSTICS v_closed_count = ROW_COUNT;
  
  -- Step 2: Get next hand number
  SELECT COALESCE(MAX(hand_number), 0) + 1 
  INTO v_hand_number
  FROM poker_hands 
  WHERE table_id = p_table_id;
  
  -- Step 3: Create new hand
  INSERT INTO poker_hands (
    table_id,
    hand_number,
    dealer_seat,
    small_blind_seat,
    big_blind_seat,
    phase,
    pot,
    current_bet,
    deck_state,
    started_at,
    action_started_at
  ) VALUES (
    p_table_id,
    v_hand_number,
    p_dealer_seat,
    p_small_blind_seat,
    p_big_blind_seat,
    'preflop',
    0,
    0,
    p_deck_state,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_new_hand_id;
  
  -- Step 4: Update table with new hand reference
  UPDATE poker_tables 
  SET 
    current_hand_id = v_new_hand_id,
    current_dealer_seat = p_dealer_seat,
    status = 'playing',
    updated_at = NOW()
  WHERE id = p_table_id;
  
  RETURN json_build_object(
    'success', true,
    'hand_id', v_new_hand_id,
    'hand_number', v_hand_number,
    'closed_stale_hands', v_closed_count
  );
  
EXCEPTION WHEN unique_violation THEN
  -- This should only happen if there's a race condition
  -- The unique index protects us - return error
  RETURN json_build_object(
    'success', false,
    'error', 'Another hand is already active for this table',
    'code', 'HAND_ALREADY_ACTIVE'
  );
END;
$$;

-- 1.4 Create function to safely complete a hand
CREATE OR REPLACE FUNCTION atomic_complete_hand(
  p_hand_id UUID,
  p_winners JSON DEFAULT NULL,
  p_community_cards TEXT[] DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_id UUID;
BEGIN
  -- Get table_id and verify hand exists
  SELECT table_id INTO v_table_id
  FROM poker_hands
  WHERE id = p_hand_id AND completed_at IS NULL;
  
  IF v_table_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Hand not found or already completed'
    );
  END IF;
  
  -- Complete the hand
  UPDATE poker_hands
  SET 
    completed_at = NOW(),
    phase = 'complete',
    winners = p_winners,
    community_cards = COALESCE(p_community_cards, community_cards)
  WHERE id = p_hand_id;
  
  -- Clear current_hand_id from table
  UPDATE poker_tables
  SET 
    current_hand_id = NULL,
    status = 'waiting',
    updated_at = NOW()
  WHERE id = v_table_id AND current_hand_id = p_hand_id;
  
  RETURN json_build_object(
    'success', true,
    'hand_id', p_hand_id,
    'table_id', v_table_id
  );
END;
$$;

-- 1.5 Create watchdog function to cleanup stuck hands
CREATE OR REPLACE FUNCTION cleanup_stuck_hands_watchdog(
  p_timeout_seconds INTEGER DEFAULT 120
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cleaned_count INTEGER := 0;
  v_cleaned_hands UUID[];
BEGIN
  -- Find and abort all hands that have been stuck for too long
  WITH stuck_hands AS (
    UPDATE poker_hands
    SET 
      completed_at = NOW(),
      phase = 'aborted'
    WHERE completed_at IS NULL
      AND action_started_at < NOW() - (p_timeout_seconds || ' seconds')::INTERVAL
    RETURNING id, table_id
  )
  SELECT 
    COUNT(*),
    ARRAY_AGG(id)
  INTO v_cleaned_count, v_cleaned_hands
  FROM stuck_hands;
  
  -- Clear current_hand_id for any tables that had stuck hands
  UPDATE poker_tables pt
  SET 
    current_hand_id = NULL,
    status = 'waiting',
    updated_at = NOW()
  WHERE current_hand_id = ANY(v_cleaned_hands);
  
  RETURN json_build_object(
    'success', true,
    'cleaned_count', v_cleaned_count,
    'cleaned_hands', v_cleaned_hands
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION atomic_start_hand TO authenticated, anon;
GRANT EXECUTE ON FUNCTION atomic_complete_hand TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cleanup_stuck_hands_watchdog TO authenticated, anon;
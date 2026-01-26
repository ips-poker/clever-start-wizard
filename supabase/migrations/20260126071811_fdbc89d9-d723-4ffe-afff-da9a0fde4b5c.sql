
-- EMERGENCY FIX: Clear stuck table reference for tournament "Тот самый - Стол 3"
-- The watchdog function should have caught this, but updating directly to unblock the tournament

-- Fix the specific stuck table
UPDATE poker_tables
SET 
  current_hand_id = NULL,
  status = 'waiting',
  updated_at = now()
WHERE id = '5a64029f-ab65-46ab-9311-a0d060b55f83'
  AND current_hand_id = 'ade7892e-1ba0-478c-8c6a-8c4454641313';

-- Also fix any other orphaned tables (belt and suspenders)
UPDATE poker_tables pt
SET 
  current_hand_id = NULL,
  status = 'waiting',
  updated_at = now()
FROM poker_hands ph
WHERE pt.current_hand_id = ph.id
  AND (ph.completed_at IS NOT NULL OR ph.phase IN ('aborted', 'showdown'));

-- Recreate watchdog with GET DIAGNOSTICS fix
CREATE OR REPLACE FUNCTION cleanup_stuck_hands_watchdog(
  p_timeout_seconds INTEGER DEFAULT 120
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cleaned_count INTEGER := 0;
  v_orphan_count INTEGER := 0;
  v_phantom_count INTEGER := 0;
  v_cleaned_hands UUID[];
BEGIN
  -- Step 1: Abort hands that have been stuck for too long
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
    COALESCE(COUNT(*), 0),
    ARRAY_AGG(id)
  INTO v_cleaned_count, v_cleaned_hands
  FROM stuck_hands;
  
  -- Step 2: Clear current_hand_id for tables with stuck hands we just cleaned
  IF v_cleaned_hands IS NOT NULL AND array_length(v_cleaned_hands, 1) > 0 THEN
    UPDATE poker_tables pt
    SET 
      current_hand_id = NULL,
      status = 'waiting',
      updated_at = NOW()
    WHERE current_hand_id = ANY(v_cleaned_hands);
  END IF;
  
  -- Step 3: CRITICAL - Also clean tables pointing to already completed/aborted hands (orphaned references)
  WITH orphan_fix AS (
    UPDATE poker_tables pt
    SET 
      current_hand_id = NULL,
      status = 'waiting',
      updated_at = NOW()
    FROM poker_hands ph
    WHERE pt.current_hand_id = ph.id
      AND (ph.completed_at IS NOT NULL OR ph.phase IN ('aborted', 'showdown'))
    RETURNING pt.id
  )
  SELECT COUNT(*) INTO v_orphan_count FROM orphan_fix;
  
  -- Step 4: Clean phantom references (hand doesn't exist at all)
  WITH phantom_fix AS (
    UPDATE poker_tables
    SET 
      current_hand_id = NULL,
      status = 'waiting',
      updated_at = NOW()
    WHERE current_hand_id IS NOT NULL
      AND current_hand_id NOT IN (SELECT id FROM poker_hands)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_phantom_count FROM phantom_fix;
  
  RETURN json_build_object(
    'success', true,
    'cleaned_count', v_cleaned_count,
    'orphan_fixed', v_orphan_count,
    'phantom_fixed', v_phantom_count,
    'cleaned_hands', v_cleaned_hands
  );
END;
$$;

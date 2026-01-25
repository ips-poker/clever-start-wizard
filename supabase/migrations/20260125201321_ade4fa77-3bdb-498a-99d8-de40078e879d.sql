
-- Fix stuck tables where current_hand_id points to completed/aborted hands
-- This is a data fix + improved cleanup function

-- 1. IMMEDIATE FIX: Clear current_hand_id for all tables pointing to completed/aborted hands
UPDATE poker_tables pt
SET 
  current_hand_id = NULL,
  status = 'waiting',
  updated_at = now()
FROM poker_hands ph
WHERE pt.current_hand_id = ph.id
  AND (ph.completed_at IS NOT NULL OR ph.phase = 'aborted');

-- 2. IMPROVED FUNCTION: cleanup_stuck_hands_watchdog with additional check for completed hand references
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
    COUNT(*),
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
  
  -- Step 3: CRITICAL FIX - Also clean tables pointing to already completed/aborted hands (orphaned references)
  UPDATE poker_tables pt
  SET 
    current_hand_id = NULL,
    status = 'waiting',
    updated_at = NOW()
  FROM poker_hands ph
  WHERE pt.current_hand_id = ph.id
    AND (ph.completed_at IS NOT NULL OR ph.phase = 'aborted');
  
  GET DIAGNOSTICS v_orphan_count = ROW_COUNT;
  
  -- Step 4: Clean phantom references (hand doesn't exist at all)
  UPDATE poker_tables
  SET 
    current_hand_id = NULL,
    status = 'waiting',
    updated_at = NOW()
  WHERE current_hand_id IS NOT NULL
    AND current_hand_id NOT IN (SELECT id FROM poker_hands);
  
  RETURN json_build_object(
    'success', true,
    'cleaned_count', v_cleaned_count,
    'orphan_fixed', v_orphan_count,
    'cleaned_hands', v_cleaned_hands
  );
END;
$$;

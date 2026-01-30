-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Enable pg_net for HTTP calls (alternative approach)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create a more aggressive cleanup function that runs every minute
CREATE OR REPLACE FUNCTION cleanup_stuck_hands_aggressive()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cleaned_count INTEGER := 0;
  v_orphan_count INTEGER := 0;
  v_phantom_count INTEGER := 0;
  v_fast_cleanup INTEGER := 0;
BEGIN
  -- Step 1: Fast cleanup - hands stuck for 60+ seconds (more aggressive)
  WITH stuck_hands AS (
    UPDATE poker_hands
    SET 
      completed_at = NOW(),
      phase = 'aborted'
    WHERE completed_at IS NULL
      AND action_started_at < NOW() - INTERVAL '60 seconds'
      AND phase NOT IN ('complete', 'showdown', 'aborted')
    RETURNING id, table_id
  ),
  clear_tables AS (
    UPDATE poker_tables pt
    SET 
      current_hand_id = NULL,
      status = 'waiting',
      updated_at = NOW()
    FROM stuck_hands sh
    WHERE pt.current_hand_id = sh.id
    RETURNING pt.id
  )
  SELECT 
    (SELECT COUNT(*) FROM stuck_hands),
    (SELECT COUNT(*) FROM clear_tables)
  INTO v_cleaned_count, v_fast_cleanup;

  -- Step 2: Clean orphaned references (table points to completed hand)
  WITH orphan_fix AS (
    UPDATE poker_tables pt
    SET 
      current_hand_id = NULL,
      status = 'waiting',
      updated_at = NOW()
    FROM poker_hands ph
    WHERE pt.current_hand_id = ph.id
      AND (ph.completed_at IS NOT NULL OR ph.phase IN ('aborted', 'showdown', 'complete'))
    RETURNING pt.id
  )
  SELECT COUNT(*) INTO v_orphan_count FROM orphan_fix;

  -- Step 3: Clean phantom references (hand doesn't exist)
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

  -- Log if anything was cleaned
  IF v_cleaned_count > 0 OR v_orphan_count > 0 OR v_phantom_count > 0 THEN
    RAISE LOG 'POKER WATCHDOG: cleaned=%, orphans=%, phantoms=%, tables_reset=%', 
      v_cleaned_count, v_orphan_count, v_phantom_count, v_fast_cleanup;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'cleaned_count', v_cleaned_count,
    'orphan_fixed', v_orphan_count,
    'phantom_fixed', v_phantom_count,
    'tables_reset', v_fast_cleanup
  );
END;
$$;

-- Schedule the aggressive watchdog to run every minute
SELECT cron.schedule(
  'poker-watchdog-aggressive',
  '* * * * *',
  'SELECT cleanup_stuck_hands_aggressive()'
);

-- Also add a 30-second variant using pg_cron's seconds support (if available)
-- Note: Standard pg_cron doesn't support seconds, but some versions do
DO $$
BEGIN
  -- Try to create a more frequent job (may fail if seconds not supported)
  PERFORM cron.schedule(
    'poker-watchdog-fast',
    '*/30 * * * * *',
    'SELECT cleanup_stuck_hands_aggressive()'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Sub-minute cron not supported, using 1-minute interval';
END;
$$;
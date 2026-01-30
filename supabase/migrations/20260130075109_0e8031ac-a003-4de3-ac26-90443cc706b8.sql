-- Enhanced watchdog that also triggers hand start for idle tables
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
  v_idle_tables INTEGER := 0;
  v_idle_table RECORD;
BEGIN
  -- Step 1: Fast cleanup - hands stuck for 60+ seconds
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

  -- Step 4: NEW - Find idle tables with enough players and "wake them up"
  -- by updating their updated_at timestamp (triggers realtime subscription)
  FOR v_idle_table IN
    SELECT 
      pt.id,
      pt.name,
      pt.auto_start_enabled,
      COUNT(ptp.id) FILTER (WHERE ptp.status = 'active' AND ptp.stack > 0) as active_players
    FROM poker_tables pt
    LEFT JOIN poker_table_players ptp ON ptp.table_id = pt.id
    WHERE pt.status = 'waiting'
      AND pt.current_hand_id IS NULL
      AND pt.auto_start_enabled = true
      AND pt.updated_at < NOW() - INTERVAL '30 seconds'  -- Hasn't been touched in 30s
    GROUP BY pt.id, pt.name, pt.auto_start_enabled
    HAVING COUNT(ptp.id) FILTER (WHERE ptp.status = 'active' AND ptp.stack > 0) >= 2
  LOOP
    -- "Poke" the table to trigger realtime updates
    UPDATE poker_tables 
    SET updated_at = NOW()
    WHERE id = v_idle_table.id;
    
    v_idle_tables := v_idle_tables + 1;
    
    RAISE LOG 'POKER WATCHDOG: Poked idle table % (%) with % active players', 
      v_idle_table.name, v_idle_table.id, v_idle_table.active_players;
  END LOOP;

  -- Log if anything was cleaned
  IF v_cleaned_count > 0 OR v_orphan_count > 0 OR v_phantom_count > 0 OR v_idle_tables > 0 THEN
    RAISE LOG 'POKER WATCHDOG: cleaned=%, orphans=%, phantoms=%, tables_reset=%, idle_poked=%', 
      v_cleaned_count, v_orphan_count, v_phantom_count, v_fast_cleanup, v_idle_tables;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'cleaned_count', v_cleaned_count,
    'orphan_fixed', v_orphan_count,
    'phantom_fixed', v_phantom_count,
    'tables_reset', v_fast_cleanup,
    'idle_tables_poked', v_idle_tables
  );
END;
$$;
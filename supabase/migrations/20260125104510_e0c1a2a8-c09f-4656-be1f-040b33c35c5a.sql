
-- =====================================================
-- TOURNAMENT SYNC FIX: Repair seating and stack sync
-- =====================================================

-- 1. Function to repair tournament seating synchronization
CREATE OR REPLACE FUNCTION public.repair_tournament_seating(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_participant RECORD;
  v_table_player_exists BOOLEAN;
  v_repaired INTEGER := 0;
  v_orphans_removed INTEGER := 0;
  v_stacks_synced INTEGER := 0;
BEGIN
  -- Step 1: Add missing players to poker_table_players from participants
  FOR v_participant IN
    SELECT 
      p.player_id,
      p.table_id,
      p.seat_number,
      p.chips,
      p.status
    FROM online_poker_tournament_participants p
    WHERE p.tournament_id = p_tournament_id
      AND p.status = 'playing'
      AND p.table_id IS NOT NULL
      AND p.seat_number IS NOT NULL
  LOOP
    -- Check if player exists in poker_table_players
    SELECT EXISTS(
      SELECT 1 FROM poker_table_players 
      WHERE table_id = v_participant.table_id 
        AND player_id = v_participant.player_id
    ) INTO v_table_player_exists;
    
    IF NOT v_table_player_exists THEN
      -- Insert missing player into poker_table_players
      INSERT INTO poker_table_players (
        table_id, player_id, seat_number, stack, status, is_dealer
      ) VALUES (
        v_participant.table_id,
        v_participant.player_id,
        v_participant.seat_number,
        v_participant.chips,
        'active',
        FALSE
      )
      ON CONFLICT (table_id, seat_number) DO UPDATE
      SET player_id = EXCLUDED.player_id,
          stack = EXCLUDED.stack,
          status = EXCLUDED.status;
      
      v_repaired := v_repaired + 1;
    ELSE
      -- Sync stack from participants to poker_table_players (participants is source of truth)
      UPDATE poker_table_players
      SET stack = v_participant.chips
      WHERE table_id = v_participant.table_id
        AND player_id = v_participant.player_id
        AND stack != v_participant.chips;
      
      IF FOUND THEN
        v_stacks_synced := v_stacks_synced + 1;
      END IF;
    END IF;
  END LOOP;
  
  -- Step 2: Remove orphaned entries from poker_table_players (players not in participants)
  DELETE FROM poker_table_players ptp
  USING poker_tables pt
  WHERE ptp.table_id = pt.id
    AND pt.tournament_id = p_tournament_id
    AND NOT EXISTS (
      SELECT 1 FROM online_poker_tournament_participants p
      WHERE p.tournament_id = p_tournament_id
        AND p.player_id = ptp.player_id
        AND p.status = 'playing'
    );
  
  GET DIAGNOSTICS v_orphans_removed = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'players_repaired', v_repaired,
    'orphans_removed', v_orphans_removed,
    'stacks_synced', v_stacks_synced
  );
END;
$$;

-- 2. Improved consolidate_tournament_tables that properly moves players
CREATE OR REPLACE FUNCTION public.consolidate_tournament_tables(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_players INTEGER;
  v_active_tables INTEGER;
  v_min_tables_needed INTEGER;
  v_max_per_table INTEGER;
  v_players_moved INTEGER := 0;
  v_tables_closed INTEGER := 0;
  v_source_table RECORD;
  v_target_table_id UUID;
  v_player RECORD;
  v_new_seat INTEGER;
BEGIN
  -- First, repair any synchronization issues
  PERFORM repair_tournament_seating(p_tournament_id);
  
  -- Get tournament config
  SELECT COALESCE(players_per_table, 9) INTO v_max_per_table
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;
  
  IF v_max_per_table > 9 THEN v_max_per_table := 9; END IF;
  
  -- Count ACTUAL players (from participants, which is source of truth)
  SELECT COUNT(*) INTO v_total_players
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND status = 'playing';
  
  -- Count active tables
  SELECT COUNT(*) INTO v_active_tables
  FROM poker_tables
  WHERE tournament_id = p_tournament_id AND status IN ('waiting', 'playing');
  
  -- Calculate minimum tables needed
  v_min_tables_needed := GREATEST(1, CEIL(v_total_players::DECIMAL / v_max_per_table));
  
  -- If we need fewer tables, consolidate
  IF v_active_tables > v_min_tables_needed THEN
    -- Find tables with fewest players to close (excluding tables with active hands)
    FOR v_source_table IN
      SELECT pt.id, COUNT(ptp.id) as player_count
      FROM poker_tables pt
      LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
      WHERE pt.tournament_id = p_tournament_id 
        AND pt.status IN ('waiting', 'playing')
        AND pt.current_hand_id IS NULL  -- Only close tables without active hands
      GROUP BY pt.id
      ORDER BY COUNT(ptp.id) ASC
      LIMIT (v_active_tables - v_min_tables_needed)
    LOOP
      -- Move all players from this table to other tables
      FOR v_player IN
        SELECT player_id FROM poker_table_players 
        WHERE table_id = v_source_table.id AND status = 'active'
      LOOP
        -- Find target table with space
        SELECT pt.id INTO v_target_table_id
        FROM poker_tables pt
        LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
        WHERE pt.tournament_id = p_tournament_id 
          AND pt.status IN ('waiting', 'playing')
          AND pt.id != v_source_table.id
        GROUP BY pt.id
        HAVING COUNT(ptp.id) < v_max_per_table
        ORDER BY COUNT(ptp.id) ASC
        LIMIT 1;
        
        IF v_target_table_id IS NOT NULL THEN
          -- Find available seat
          SELECT s.seat INTO v_new_seat
          FROM generate_series(0, v_max_per_table - 1) s(seat)
          WHERE NOT EXISTS (
            SELECT 1 FROM poker_table_players 
            WHERE table_id = v_target_table_id 
              AND seat_number = s.seat 
              AND status = 'active'
          )
          LIMIT 1;
          
          IF v_new_seat IS NOT NULL THEN
            -- Move player in poker_table_players
            UPDATE poker_table_players
            SET table_id = v_target_table_id, seat_number = v_new_seat
            WHERE player_id = v_player.player_id AND table_id = v_source_table.id;
            
            -- CRITICAL: Also update participants to stay in sync
            UPDATE online_poker_tournament_participants
            SET table_id = v_target_table_id, seat_number = v_new_seat
            WHERE player_id = v_player.player_id AND tournament_id = p_tournament_id;
            
            v_players_moved := v_players_moved + 1;
          END IF;
        END IF;
      END LOOP;
      
      -- Close the source table if empty
      IF NOT EXISTS (SELECT 1 FROM poker_table_players WHERE table_id = v_source_table.id AND status = 'active') THEN
        UPDATE poker_tables SET status = 'closed' WHERE id = v_source_table.id;
        v_tables_closed := v_tables_closed + 1;
      END IF;
    END LOOP;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_players', v_total_players,
    'active_tables', v_active_tables - v_tables_closed,
    'tables_closed', v_tables_closed,
    'players_moved', v_players_moved,
    'min_tables_needed', v_min_tables_needed
  );
END;
$$;

-- 3. Improved professional_balance_tables that also syncs participants
CREATE OR REPLACE FUNCTION public.professional_balance_tables(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament RECORD;
  v_max_players_per_table INTEGER;
  v_total_players INTEGER;
  v_active_tables INTEGER;
  v_ideal_per_table INTEGER;
  v_remainder INTEGER;
  v_source_table_id UUID;
  v_source_player_count INTEGER;
  v_target_table_id UUID;
  v_target_player_count INTEGER;
  v_player_to_move RECORD;
  v_new_seat INTEGER;
  v_moves JSONB := '[]'::JSONB;
  v_move_count INTEGER := 0;
  v_iteration INTEGER := 0;
  v_max_iterations INTEGER := 50;
  v_current_dealer_seat INTEGER;
BEGIN
  -- First repair any sync issues
  PERFORM repair_tournament_seating(p_tournament_id);
  
  -- Get tournament data
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;
  
  v_max_players_per_table := COALESCE(v_tournament.players_per_table, 6);
  IF v_max_players_per_table > 9 THEN v_max_players_per_table := 9; END IF;
  
  -- Count active players (from poker_table_players, which should now be in sync)
  SELECT COUNT(*) INTO v_total_players
  FROM poker_table_players ptp
  JOIN poker_tables pt ON pt.id = ptp.table_id
  WHERE pt.tournament_id = p_tournament_id 
    AND pt.status IN ('waiting', 'playing')
    AND ptp.status = 'active';
  
  SELECT COUNT(*) INTO v_active_tables
  FROM poker_tables
  WHERE tournament_id = p_tournament_id AND status IN ('waiting', 'playing');
  
  IF v_active_tables <= 1 OR v_total_players = 0 THEN
    RETURN jsonb_build_object('success', true, 'message', 'No balancing needed', 'moves', 0);
  END IF;
  
  v_ideal_per_table := v_total_players / v_active_tables;
  v_remainder := v_total_players % v_active_tables;
  
  -- Balancing loop
  WHILE v_iteration < v_max_iterations LOOP
    v_iteration := v_iteration + 1;
    
    -- Find source table (most players)
    SELECT pt.id, COUNT(ptp.id)::INTEGER, pt.current_dealer_seat
    INTO v_source_table_id, v_source_player_count, v_current_dealer_seat
    FROM poker_tables pt
    JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
    WHERE pt.tournament_id = p_tournament_id 
      AND pt.status IN ('waiting', 'playing')
      AND pt.current_hand_id IS NULL  -- Don't move from tables with active hands
    GROUP BY pt.id
    ORDER BY COUNT(ptp.id) DESC
    LIMIT 1;
    
    IF v_source_table_id IS NULL THEN
      EXIT;
    END IF;
    
    -- Find target table (fewest players)
    SELECT pt.id, COUNT(ptp.id)::INTEGER
    INTO v_target_table_id, v_target_player_count
    FROM poker_tables pt
    LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
    WHERE pt.tournament_id = p_tournament_id 
      AND pt.status IN ('waiting', 'playing')
      AND pt.id != v_source_table_id
      AND pt.current_hand_id IS NULL  -- Don't move to tables with active hands
    GROUP BY pt.id
    HAVING COUNT(ptp.id) < v_max_players_per_table
    ORDER BY COUNT(ptp.id) ASC
    LIMIT 1;
    
    IF v_target_table_id IS NULL THEN
      EXIT;
    END IF;
    
    -- Check if balancing is needed (difference > 1)
    IF v_source_player_count - v_target_player_count <= 1 THEN
      EXIT;
    END IF;
    
    -- Select player to move (closest to BB position)
    SELECT ptp.* 
    INTO v_player_to_move
    FROM poker_table_players ptp
    JOIN poker_tables pt ON pt.id = ptp.table_id
    WHERE ptp.table_id = v_source_table_id
      AND ptp.status = 'active'
    ORDER BY 
      CASE 
        WHEN ptp.seat_number > COALESCE(v_current_dealer_seat, 0) 
        THEN ptp.seat_number - COALESCE(v_current_dealer_seat, 0)
        ELSE ptp.seat_number + v_max_players_per_table - COALESCE(v_current_dealer_seat, 0)
      END DESC,
      ptp.joined_at ASC
    LIMIT 1;
    
    IF v_player_to_move IS NULL THEN
      EXIT;
    END IF;
    
    -- Find available seat on target table
    SELECT s.seat INTO v_new_seat
    FROM generate_series(0, v_max_players_per_table - 1) s(seat)
    WHERE NOT EXISTS (
      SELECT 1 FROM poker_table_players 
      WHERE table_id = v_target_table_id 
        AND seat_number = s.seat
        AND status = 'active'
    )
    ORDER BY s.seat
    LIMIT 1;
    
    IF v_new_seat IS NULL THEN
      EXIT;
    END IF;
    
    -- Move player
    UPDATE poker_table_players
    SET table_id = v_target_table_id, seat_number = v_new_seat
    WHERE id = v_player_to_move.id;
    
    -- CRITICAL: Also update participants to stay in sync
    UPDATE online_poker_tournament_participants
    SET table_id = v_target_table_id, seat_number = v_new_seat
    WHERE player_id = v_player_to_move.player_id AND tournament_id = p_tournament_id;
    
    v_moves := v_moves || jsonb_build_object(
      'player_id', v_player_to_move.player_id,
      'from_table', v_source_table_id,
      'to_table', v_target_table_id,
      'new_seat', v_new_seat
    );
    v_move_count := v_move_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true, 
    'moves', v_move_count, 
    'details', v_moves,
    'iterations', v_iteration
  );
END;
$$;

-- 4. Function to sync stacks between participants and table_players
CREATE OR REPLACE FUNCTION public.sync_tournament_stacks(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_synced INTEGER := 0;
BEGIN
  -- Sync from poker_table_players to participants (table_players is live source)
  UPDATE online_poker_tournament_participants p
  SET chips = ptp.stack
  FROM poker_table_players ptp
  JOIN poker_tables pt ON ptp.table_id = pt.id
  WHERE pt.tournament_id = p_tournament_id
    AND ptp.player_id = p.player_id
    AND p.tournament_id = p_tournament_id
    AND p.status = 'playing'
    AND p.chips != ptp.stack;
  
  GET DIAGNOSTICS v_synced = ROW_COUNT;
  
  RETURN jsonb_build_object('success', true, 'stacks_synced', v_synced);
END;
$$;

-- 5. Trigger to auto-sync stacks after updates to poker_table_players
CREATE OR REPLACE FUNCTION public.trigger_sync_tournament_stack()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament_id UUID;
BEGIN
  -- Get tournament_id for this table
  SELECT tournament_id INTO v_tournament_id
  FROM poker_tables
  WHERE id = NEW.table_id;
  
  -- If tournament table and stack changed, sync to participants
  IF v_tournament_id IS NOT NULL AND NEW.stack != OLD.stack THEN
    UPDATE online_poker_tournament_participants
    SET chips = NEW.stack
    WHERE tournament_id = v_tournament_id
      AND player_id = NEW.player_id
      AND status = 'playing';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS sync_tournament_stack_trigger ON poker_table_players;
CREATE TRIGGER sync_tournament_stack_trigger
AFTER UPDATE OF stack ON poker_table_players
FOR EACH ROW
EXECUTE FUNCTION trigger_sync_tournament_stack();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.repair_tournament_seating(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_tournament_stacks(UUID) TO anon, authenticated, service_role;

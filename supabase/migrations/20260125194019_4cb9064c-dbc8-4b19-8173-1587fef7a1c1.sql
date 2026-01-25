
-- Move Anna's existing record from Стол 1 (closed) to Стол 3 (active)
-- First delete any duplicate entries, keep only the tournament table record
DELETE FROM poker_table_players 
WHERE player_id = '342df8b9-b34f-4009-a75d-36fba76c0c06'
  AND table_id != 'ae44958f-7e89-497b-ac42-1869fee861d2'
  AND table_id IN (
    SELECT id FROM poker_tables WHERE tournament_id = '555ff327-3ade-4367-af6b-3eec6724562a'
  );

-- Now move Anna to the active table (Стол 3)
UPDATE poker_table_players
SET table_id = '784cc6b7-f755-44e2-9231-bd473c12d00c', 
    seat_number = 0,
    status = 'active'
WHERE player_id = '342df8b9-b34f-4009-a75d-36fba76c0c06'
  AND table_id = 'ae44958f-7e89-497b-ac42-1869fee861d2';

-- Update participants reference
UPDATE online_poker_tournament_participants
SET table_id = '784cc6b7-f755-44e2-9231-bd473c12d00c',
    seat_number = 0
WHERE player_id = '342df8b9-b34f-4009-a75d-36fba76c0c06'
  AND tournament_id = '555ff327-3ade-4367-af6b-3eec6724562a';

-- Make sure Стол 1 is properly closed
UPDATE poker_tables 
SET status = 'closed' 
WHERE id = 'ae44958f-7e89-497b-ac42-1869fee861d2';

-- Fix consolidate_tournament_tables to handle sitting_out players
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
    -- FIXED: Include both 'active' and 'sitting_out' players in count
    FOR v_source_table IN
      SELECT pt.id, COUNT(ptp.id) as player_count
      FROM poker_tables pt
      LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status IN ('active', 'sitting_out')
      WHERE pt.tournament_id = p_tournament_id 
        AND pt.status IN ('waiting', 'playing')
        AND pt.current_hand_id IS NULL
      GROUP BY pt.id
      ORDER BY COUNT(ptp.id) ASC
      LIMIT (v_active_tables - v_min_tables_needed)
    LOOP
      -- Move all players from this table to other tables
      -- FIXED: Include sitting_out players in the move
      FOR v_player IN
        SELECT player_id, status as player_status, stack FROM poker_table_players 
        WHERE table_id = v_source_table.id AND status IN ('active', 'sitting_out')
      LOOP
        -- Find target table with space
        SELECT pt.id INTO v_target_table_id
        FROM poker_tables pt
        LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status IN ('active', 'sitting_out')
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
              AND status IN ('active', 'sitting_out')
          )
          LIMIT 1;
          
          IF v_new_seat IS NOT NULL THEN
            -- Move player in poker_table_players, preserve their status
            UPDATE poker_table_players
            SET table_id = v_target_table_id, seat_number = v_new_seat
            WHERE player_id = v_player.player_id AND table_id = v_source_table.id;
            
            -- Also update participants to stay in sync
            UPDATE online_poker_tournament_participants
            SET table_id = v_target_table_id, seat_number = v_new_seat
            WHERE player_id = v_player.player_id AND tournament_id = p_tournament_id;
            
            v_players_moved := v_players_moved + 1;
          END IF;
        END IF;
      END LOOP;
      
      -- Close the source table if empty
      IF NOT EXISTS (SELECT 1 FROM poker_table_players WHERE table_id = v_source_table.id AND status IN ('active', 'sitting_out')) THEN
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

-- Fix professional_balance_tables to also include sitting_out
CREATE OR REPLACE FUNCTION public.professional_balance_tables(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tables JSONB;
  v_max_diff INTEGER;
  v_iterations INTEGER := 0;
  v_max_iterations INTEGER := 20;
  v_players_moved INTEGER := 0;
  v_max_count INTEGER;
  v_min_count INTEGER;
  v_source_table_id UUID;
  v_target_table_id UUID;
  v_player_to_move UUID;
  v_new_seat INTEGER;
  v_max_per_table INTEGER;
BEGIN
  -- Get tournament config
  SELECT COALESCE(players_per_table, 9) INTO v_max_per_table
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;
  
  IF v_max_per_table > 9 THEN v_max_per_table := 9; END IF;

  -- First run consolidation if needed
  PERFORM consolidate_tournament_tables(p_tournament_id);
  
  -- Balance loop - ensure ±1 player difference
  LOOP
    EXIT WHEN v_iterations >= v_max_iterations;
    v_iterations := v_iterations + 1;
    
    -- Get current table player counts (include sitting_out)
    SELECT 
      MAX(cnt), MIN(cnt),
      (SELECT table_id FROM (
        SELECT pt.id as table_id, COUNT(ptp.id) as cnt
        FROM poker_tables pt
        LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status IN ('active', 'sitting_out')
        WHERE pt.tournament_id = p_tournament_id AND pt.status IN ('waiting', 'playing')
        GROUP BY pt.id
      ) t ORDER BY cnt DESC LIMIT 1),
      (SELECT table_id FROM (
        SELECT pt.id as table_id, COUNT(ptp.id) as cnt
        FROM poker_tables pt
        LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status IN ('active', 'sitting_out')
        WHERE pt.tournament_id = p_tournament_id AND pt.status IN ('waiting', 'playing')
        GROUP BY pt.id
      ) t ORDER BY cnt ASC LIMIT 1)
    INTO v_max_count, v_min_count, v_source_table_id, v_target_table_id
    FROM (
      SELECT pt.id as table_id, COUNT(ptp.id) as cnt
      FROM poker_tables pt
      LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status IN ('active', 'sitting_out')
      WHERE pt.tournament_id = p_tournament_id AND pt.status IN ('waiting', 'playing')
      GROUP BY pt.id
    ) counts;
    
    -- If difference is <=1, we're balanced
    v_max_diff := COALESCE(v_max_count, 0) - COALESCE(v_min_count, 0);
    EXIT WHEN v_max_diff <= 1;
    
    -- No valid tables
    EXIT WHEN v_source_table_id IS NULL OR v_target_table_id IS NULL;
    EXIT WHEN v_source_table_id = v_target_table_id;
    
    -- Find a player to move from source table
    -- Prefer: sitting_out players first (less disruptive), then by stack
    SELECT player_id INTO v_player_to_move
    FROM poker_table_players
    WHERE table_id = v_source_table_id
      AND status IN ('active', 'sitting_out')
    ORDER BY 
      CASE WHEN status = 'sitting_out' THEN 0 ELSE 1 END,  -- Prefer moving sitting_out players first
      stack DESC
    LIMIT 1;
    
    EXIT WHEN v_player_to_move IS NULL;
    
    -- Find available seat at target
    SELECT s.seat INTO v_new_seat
    FROM generate_series(0, v_max_per_table - 1) s(seat)
    WHERE NOT EXISTS (
      SELECT 1 FROM poker_table_players 
      WHERE table_id = v_target_table_id 
        AND seat_number = s.seat 
        AND status IN ('active', 'sitting_out')
    )
    LIMIT 1;
    
    EXIT WHEN v_new_seat IS NULL;
    
    -- Move the player
    UPDATE poker_table_players
    SET table_id = v_target_table_id, seat_number = v_new_seat
    WHERE player_id = v_player_to_move AND table_id = v_source_table_id;
    
    UPDATE online_poker_tournament_participants
    SET table_id = v_target_table_id, seat_number = v_new_seat
    WHERE player_id = v_player_to_move AND tournament_id = p_tournament_id;
    
    v_players_moved := v_players_moved + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'players_moved', v_players_moved,
    'iterations', v_iterations,
    'final_max_diff', v_max_diff
  );
END;
$$;

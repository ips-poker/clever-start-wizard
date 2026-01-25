
-- Add more blind levels to the tournament structure (levels 11-20)
INSERT INTO online_poker_tournament_levels (tournament_id, level, small_blind, big_blind, ante, duration, is_break)
VALUES 
  ('29c806f7-a5f1-4b77-91ee-19c7aab6004d', 11, 1500, 3000, 400, 300, false),
  ('29c806f7-a5f1-4b77-91ee-19c7aab6004d', 12, 2000, 4000, 500, 300, false),
  ('29c806f7-a5f1-4b77-91ee-19c7aab6004d', 13, 2500, 5000, 600, 300, false),
  ('29c806f7-a5f1-4b77-91ee-19c7aab6004d', 14, 3000, 6000, 800, 300, false),
  ('29c806f7-a5f1-4b77-91ee-19c7aab6004d', 15, 4000, 8000, 1000, 300, false),
  ('29c806f7-a5f1-4b77-91ee-19c7aab6004d', 16, 5000, 10000, 1500, 300, false),
  ('29c806f7-a5f1-4b77-91ee-19c7aab6004d', 17, 7500, 15000, 2000, 300, false),
  ('29c806f7-a5f1-4b77-91ee-19c7aab6004d', 18, 10000, 20000, 3000, 300, false),
  ('29c806f7-a5f1-4b77-91ee-19c7aab6004d', 19, 15000, 30000, 4000, 300, false),
  ('29c806f7-a5f1-4b77-91ee-19c7aab6004d', 20, 20000, 40000, 5000, 300, false)
ON CONFLICT (tournament_id, level) DO NOTHING;

-- Also update the tournament-level-manager to extend levels automatically if needed
-- Create a function to auto-extend blind levels when tournament reaches max level
CREATE OR REPLACE FUNCTION public.extend_tournament_levels(p_tournament_id UUID, p_current_level INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_max_level INTEGER;
  v_last_sb INTEGER;
  v_last_bb INTEGER;
  v_last_ante INTEGER;
  v_last_duration INTEGER;
  v_new_level INTEGER;
  v_levels_added INTEGER := 0;
BEGIN
  -- Get current max level
  SELECT MAX(level), MAX(small_blind), MAX(big_blind), MAX(COALESCE(ante, 0)), MAX(COALESCE(duration, 300))
  INTO v_max_level, v_last_sb, v_last_bb, v_last_ante, v_last_duration
  FROM online_poker_tournament_levels
  WHERE tournament_id = p_tournament_id;
  
  -- If current level is at or near max, add more levels
  IF p_current_level >= v_max_level - 1 THEN
    FOR i IN 1..5 LOOP
      v_new_level := v_max_level + i;
      v_last_sb := ROUND(v_last_sb * 1.5 / 100) * 100; -- Round to nearest 100
      v_last_bb := v_last_sb * 2;
      v_last_ante := ROUND(v_last_bb * 0.25 / 100) * 100;
      
      INSERT INTO online_poker_tournament_levels (
        tournament_id, level, small_blind, big_blind, ante, duration, is_break
      ) VALUES (
        p_tournament_id, v_new_level, v_last_sb, v_last_bb, v_last_ante, v_last_duration, false
      )
      ON CONFLICT (tournament_id, level) DO NOTHING;
      
      v_levels_added := v_levels_added + 1;
    END LOOP;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'current_level', p_current_level,
    'max_level_before', v_max_level,
    'levels_added', v_levels_added
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.extend_tournament_levels(UUID, INTEGER) TO anon, authenticated, service_role;

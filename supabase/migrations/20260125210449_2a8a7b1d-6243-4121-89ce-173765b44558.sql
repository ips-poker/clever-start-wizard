-- Update RLS policies to allow admins to manage ONLY bots (players without user_id)

-- 1. INSERT: Admins can seat bots, players can seat themselves
DROP POLICY IF EXISTS "Players can join/leave tables" ON poker_table_players;

CREATE POLICY "Players can join/leave tables" ON poker_table_players
  FOR INSERT
  WITH CHECK (
    -- Admins can seat BOTS ONLY (players without user_id and without telegram)
    (
      is_admin(auth.uid())
      AND EXISTS (
        SELECT 1 FROM players p
        WHERE p.id = poker_table_players.player_id 
        AND p.user_id IS NULL 
        AND p.telegram IS NULL
      )
    )
    OR
    -- Real players can seat themselves
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = poker_table_players.player_id 
      AND (p.user_id = auth.uid() OR p.telegram IS NOT NULL)
    )
  );

-- 2. DELETE: Admins can remove bots, players can remove themselves  
DROP POLICY IF EXISTS "Players can leave tables" ON poker_table_players;

CREATE POLICY "Players can leave tables" ON poker_table_players
  FOR DELETE
  USING (
    -- Admins can remove BOTS ONLY
    (
      is_admin(auth.uid())
      AND EXISTS (
        SELECT 1 FROM players p
        WHERE p.id = poker_table_players.player_id 
        AND p.user_id IS NULL 
        AND p.telegram IS NULL
      )
    )
    OR
    -- Real players can remove themselves
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = poker_table_players.player_id 
      AND (p.user_id = auth.uid() OR p.telegram IS NOT NULL)
    )
  );

-- 3. UPDATE: Admins can update bots, players can update themselves
DROP POLICY IF EXISTS "Players can update their own seat" ON poker_table_players;

CREATE POLICY "Players can update their own seat" ON poker_table_players
  FOR UPDATE
  USING (
    -- Admins can update BOTS ONLY
    (
      is_admin(auth.uid())
      AND EXISTS (
        SELECT 1 FROM players p
        WHERE p.id = poker_table_players.player_id 
        AND p.user_id IS NULL 
        AND p.telegram IS NULL
      )
    )
    OR
    -- Real players can update themselves
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = poker_table_players.player_id 
      AND (p.user_id = auth.uid() OR p.telegram IS NOT NULL)
    )
  );
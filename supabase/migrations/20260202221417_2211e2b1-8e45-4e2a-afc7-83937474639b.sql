-- Drop the restrictive admin-only policy
DROP POLICY IF EXISTS "Only admins can manage blind levels" ON blind_levels;

-- Create new policy allowing club staff to manage blind levels for their club's tournaments
CREATE POLICY "Club staff can manage blind levels" 
ON blind_levels 
FOR ALL 
USING (
  -- System admins can manage all
  is_admin(auth.uid()) 
  OR 
  -- Club staff can manage levels for their club's tournaments
  EXISTS (
    SELECT 1 FROM tournaments t
    JOIN club_staff cs ON cs.clan_id = t.clan_id
    JOIN players p ON p.id = cs.player_id
    WHERE t.id = blind_levels.tournament_id 
    AND p.user_id = auth.uid()
    AND cs.is_active = true
  )
  OR
  -- Clan owner (don) can manage levels
  EXISTS (
    SELECT 1 FROM tournaments t
    JOIN clans c ON c.id = t.clan_id
    JOIN players p ON p.id = c.don_player_id
    WHERE t.id = blind_levels.tournament_id 
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  is_admin(auth.uid()) 
  OR 
  EXISTS (
    SELECT 1 FROM tournaments t
    JOIN club_staff cs ON cs.clan_id = t.clan_id
    JOIN players p ON p.id = cs.player_id
    WHERE t.id = blind_levels.tournament_id 
    AND p.user_id = auth.uid()
    AND cs.is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM tournaments t
    JOIN clans c ON c.id = t.clan_id
    JOIN players p ON p.id = c.don_player_id
    WHERE t.id = blind_levels.tournament_id 
    AND p.user_id = auth.uid()
  )
);
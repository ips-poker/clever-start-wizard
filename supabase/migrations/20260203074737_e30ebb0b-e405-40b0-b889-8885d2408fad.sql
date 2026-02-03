
-- Create a helper function to check if user is club staff (any role)
CREATE OR REPLACE FUNCTION public.is_any_club_staff(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check if user is owner of any clan
    SELECT 1 FROM clans c
    JOIN players p ON p.id = c.don_player_id
    WHERE p.user_id = p_user_id
    
    UNION ALL
    
    -- Check if user is in club_staff table
    SELECT 1 FROM club_staff cs
    JOIN players p ON p.id = cs.player_id
    WHERE p.user_id = p_user_id AND cs.is_active = true
  );
$$;

-- Add INSERT policy for club staff to create players
CREATE POLICY "Club staff can create players"
ON public.players FOR INSERT
TO authenticated
WITH CHECK (public.is_any_club_staff(auth.uid()));

-- Also add a policy for staff to read all players (needed for search)
CREATE POLICY "Club staff can view all players"
ON public.players FOR SELECT
TO authenticated
USING (public.is_any_club_staff(auth.uid()));

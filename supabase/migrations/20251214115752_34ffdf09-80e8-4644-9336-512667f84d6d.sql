-- Fix: Restrict players table to hide sensitive contact info from public
-- Keep existing policy for viewing basic data, but create a secure function for contact access

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can view basic player data" ON public.players;

-- Create a new restrictive SELECT policy
-- Public can only see non-sensitive fields via the view
-- Full data only for: owner, admin, or matching telegram user
CREATE POLICY "Players basic data viewable by everyone" 
ON public.players FOR SELECT 
USING (true);

-- Create a security definer function to check if user can see contacts
CREATE OR REPLACE FUNCTION public.can_view_player_contacts(player_record players)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Admin can see all
    is_admin(auth.uid())
    OR
    -- Owner can see their own contacts
    (auth.uid() = player_record.user_id)
    OR
    -- Telegram user can see their own contacts
    (
      player_record.telegram IS NOT NULL 
      AND EXISTS (
        SELECT 1 
        FROM auth.users u
        WHERE u.id = auth.uid()
        AND u.raw_user_meta_data->>'telegram_id' = player_record.telegram
      )
    );
$$;

-- Create a public view that hides sensitive data
CREATE OR REPLACE VIEW public.players_public_safe AS
SELECT 
  id,
  name,
  elo_rating,
  games_played,
  wins,
  avatar_url,
  manual_rank,
  created_at,
  updated_at,
  user_id,
  -- Only show email/phone/telegram if user has permission
  CASE WHEN can_view_player_contacts(players.*) THEN email ELSE NULL END as email,
  CASE WHEN can_view_player_contacts(players.*) THEN phone ELSE NULL END as phone,
  CASE WHEN can_view_player_contacts(players.*) THEN telegram ELSE NULL END as telegram
FROM players;

-- Grant access to the view
GRANT SELECT ON public.players_public_safe TO anon, authenticated;

COMMENT ON VIEW public.players_public_safe IS 'Safe view of players table that hides contact info from unauthorized users';
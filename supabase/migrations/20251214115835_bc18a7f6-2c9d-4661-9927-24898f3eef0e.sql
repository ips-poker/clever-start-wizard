-- Fix: Recreate view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.players_public_safe;

CREATE VIEW public.players_public_safe 
WITH (security_invoker = true)
AS
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

COMMENT ON VIEW public.players_public_safe IS 'Safe view of players table that hides contact info from unauthorized users. Uses SECURITY INVOKER.';
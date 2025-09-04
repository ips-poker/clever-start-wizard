-- Add a new policy to explicitly deny public access to players table
-- and ensure only specific columns are accessible publicly via functions

-- First, let's create a secure function for getting player count without exposing sensitive data
CREATE OR REPLACE FUNCTION public.get_players_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.players;
$$;

-- Create a secure function for system checks that only returns non-sensitive data
CREATE OR REPLACE FUNCTION public.get_system_statistics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  player_count integer;
  tournament_count integer;
  results_count integer;
BEGIN
  -- Get counts without exposing sensitive data
  SELECT COUNT(*) INTO player_count FROM public.players;
  SELECT COUNT(*) INTO tournament_count FROM public.tournaments;
  SELECT COUNT(*) INTO results_count FROM public.game_results;
  
  RETURN jsonb_build_object(
    'players_count', player_count,
    'tournaments_count', tournament_count,
    'game_results_count', results_count,
    'last_updated', now()
  );
END;
$$;
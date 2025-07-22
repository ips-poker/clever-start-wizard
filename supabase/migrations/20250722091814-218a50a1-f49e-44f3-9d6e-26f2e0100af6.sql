-- Create function to update player wins based on game results
CREATE OR REPLACE FUNCTION public.update_player_wins()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update wins count for all players based on position 1 in game_results
  UPDATE public.players 
  SET wins = (
    SELECT COUNT(*) 
    FROM public.game_results 
    WHERE game_results.player_id = players.id 
    AND game_results.position = 1
  ),
  updated_at = now();
END;
$$;

-- Execute the function to fix current data
SELECT public.update_player_wins();

-- Create a trigger function to update wins automatically
CREATE OR REPLACE FUNCTION public.update_player_wins_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update wins count for the affected player
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update for the new/updated record
    UPDATE public.players 
    SET wins = (
      SELECT COUNT(*) 
      FROM public.game_results 
      WHERE game_results.player_id = NEW.player_id 
      AND game_results.position = 1
    ),
    updated_at = now()
    WHERE id = NEW.player_id;
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.player_id != NEW.player_id THEN
    -- Update for the old player if player_id changed
    UPDATE public.players 
    SET wins = (
      SELECT COUNT(*) 
      FROM public.game_results 
      WHERE game_results.player_id = OLD.player_id 
      AND game_results.position = 1
    ),
    updated_at = now()
    WHERE id = OLD.player_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    -- Update for the deleted record
    UPDATE public.players 
    SET wins = (
      SELECT COUNT(*) 
      FROM public.game_results 
      WHERE game_results.player_id = OLD.player_id 
      AND game_results.position = 1
    ),
    updated_at = now()
    WHERE id = OLD.player_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically update wins when game_results change
DROP TRIGGER IF EXISTS trigger_update_player_wins ON public.game_results;
CREATE TRIGGER trigger_update_player_wins
  AFTER INSERT OR UPDATE OR DELETE ON public.game_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_player_wins_trigger();
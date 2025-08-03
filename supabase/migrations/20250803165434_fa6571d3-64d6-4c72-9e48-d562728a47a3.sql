-- Function to start tournament registration
CREATE OR REPLACE FUNCTION public.start_tournament_registration(tournament_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.tournaments 
  SET 
    status = 'registration',
    is_published = true,
    updated_at = now()
  WHERE id = tournament_id_param AND status = 'scheduled';
  
  RETURN FOUND;
END;
$$;

-- Function to start tournament
CREATE OR REPLACE FUNCTION public.start_tournament(tournament_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.tournaments 
  SET 
    status = 'running',
    updated_at = now()
  WHERE id = tournament_id_param AND status = 'registration';
  
  RETURN FOUND;
END;
$$;

-- Function to pause tournament
CREATE OR REPLACE FUNCTION public.pause_tournament(tournament_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.tournaments 
  SET 
    status = 'paused',
    updated_at = now()
  WHERE id = tournament_id_param AND status = 'running';
  
  RETURN FOUND;
END;
$$;

-- Function to resume tournament
CREATE OR REPLACE FUNCTION public.resume_tournament(tournament_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.tournaments 
  SET 
    status = 'running',
    updated_at = now()
  WHERE id = tournament_id_param AND status = 'paused';
  
  RETURN FOUND;
END;
$$;

-- Function to complete tournament
CREATE OR REPLACE FUNCTION public.complete_tournament(tournament_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.tournaments 
  SET 
    status = 'completed',
    finished_at = now(),
    updated_at = now()
  WHERE id = tournament_id_param AND status IN ('running', 'paused');
  
  RETURN FOUND;
END;
$$;
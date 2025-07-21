-- Add columns for tournament synchronization and management
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS finished_at timestamp with time zone;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tournaments_published ON public.tournaments(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_archived ON public.tournaments(is_archived) WHERE is_archived = false;

-- Update existing tournaments to be unpublished by default
UPDATE public.tournaments SET is_published = false WHERE is_published IS NULL;

-- Add function to automatically sync timer with database
CREATE OR REPLACE FUNCTION public.update_tournament_timer(
  tournament_id_param uuid,
  new_timer_remaining integer,
  new_timer_active boolean DEFAULT false
) RETURNS void AS $$
BEGIN
  UPDATE public.tournaments 
  SET 
    timer_remaining = new_timer_remaining,
    updated_at = now()
  WHERE id = tournament_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to publish tournament
CREATE OR REPLACE FUNCTION public.publish_tournament(
  tournament_id_param uuid
) RETURNS boolean AS $$
BEGIN
  UPDATE public.tournaments 
  SET 
    is_published = true,
    status = 'registration',
    updated_at = now()
  WHERE id = tournament_id_param AND status = 'scheduled';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to archive tournament
CREATE OR REPLACE FUNCTION public.archive_tournament(
  tournament_id_param uuid
) RETURNS boolean AS $$
BEGIN
  UPDATE public.tournaments 
  SET 
    is_archived = true,
    updated_at = now()
  WHERE id = tournament_id_param AND status = 'completed';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
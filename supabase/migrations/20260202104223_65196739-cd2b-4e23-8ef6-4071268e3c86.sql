-- Add pending request fields to tournament_registrations
ALTER TABLE public.tournament_registrations
ADD COLUMN IF NOT EXISTS pending_reentry boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pending_addon boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pending_reentry_at timestamptz DEFAULT null,
ADD COLUMN IF NOT EXISTS pending_addon_at timestamptz DEFAULT null;

-- Create index for finding pending requests quickly
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_pending_requests 
ON public.tournament_registrations (tournament_id, pending_reentry, pending_addon) 
WHERE pending_reentry = true OR pending_addon = true;

-- Comment
COMMENT ON COLUMN public.tournament_registrations.pending_reentry IS 'Player requested re-entry, awaiting admin confirmation';
COMMENT ON COLUMN public.tournament_registrations.pending_addon IS 'Player requested addon, awaiting admin confirmation';
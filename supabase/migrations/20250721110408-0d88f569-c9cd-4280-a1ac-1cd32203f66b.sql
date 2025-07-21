-- Add rebuy and addon fields to tournaments table
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS rebuy_cost integer DEFAULT 0;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS addon_cost integer DEFAULT 0;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS rebuy_chips integer DEFAULT 0;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS addon_chips integer DEFAULT 0;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS tournament_format text DEFAULT 'freezeout'::text;

-- Add check constraint for tournament format
ALTER TABLE public.tournaments ADD CONSTRAINT valid_tournament_format 
CHECK (tournament_format IN ('rebuy', 'reentry', 'freezeout'));
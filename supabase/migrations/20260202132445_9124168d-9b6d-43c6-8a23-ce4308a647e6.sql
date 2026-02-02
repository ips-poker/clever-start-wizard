-- Add players_per_table setting to tournaments
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS players_per_table integer DEFAULT 9;

-- Comment for clarity
COMMENT ON COLUMN public.tournaments.players_per_table IS 'Max players per table for seating calculations (6, 8, or 9)';
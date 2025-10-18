-- Change default ELO rating from 1000 to 100 for new players
ALTER TABLE public.players 
ALTER COLUMN elo_rating SET DEFAULT 100;

-- Update existing players with default 1000 rating to 100
-- (keeping those who actually earned their ratings through games)
UPDATE public.players 
SET elo_rating = 100 
WHERE elo_rating = 1000 AND games_played = 0;
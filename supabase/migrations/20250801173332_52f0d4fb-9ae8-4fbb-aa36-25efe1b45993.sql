-- Add avatar_url column to players table
ALTER TABLE public.players 
ADD COLUMN avatar_url TEXT;

-- Add starting_chips column to tournaments table  
ALTER TABLE public.tournaments 
ADD COLUMN starting_chips INTEGER DEFAULT 10000;
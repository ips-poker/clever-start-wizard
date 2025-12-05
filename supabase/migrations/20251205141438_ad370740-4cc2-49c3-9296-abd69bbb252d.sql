-- Add manual_rank column to players table for manual hierarchy assignment
ALTER TABLE public.players 
ADD COLUMN manual_rank text DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.players.manual_rank IS 'Manually assigned mafia hierarchy rank by tournament director';
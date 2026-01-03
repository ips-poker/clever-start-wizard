-- Add players_per_table column to online_poker_tournaments
ALTER TABLE public.online_poker_tournaments 
ADD COLUMN IF NOT EXISTS players_per_table integer DEFAULT 6;

COMMENT ON COLUMN public.online_poker_tournaments.players_per_table IS 'Maximum players per table (6-max or 9-max)';
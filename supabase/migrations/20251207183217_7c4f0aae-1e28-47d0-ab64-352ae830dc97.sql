-- Add unique constraint to prevent duplicate players at same table
-- This prevents race conditions when multiple clients try to join simultaneously

-- First, clean up any existing duplicates (keep the oldest entry by joined_at)
DELETE FROM public.poker_table_players 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY table_id, player_id ORDER BY joined_at ASC) as rn
    FROM public.poker_table_players
  ) t WHERE rn > 1
);

-- Add unique constraint for player per table (drop if exists first)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_player_per_table') THEN
    ALTER TABLE public.poker_table_players DROP CONSTRAINT unique_player_per_table;
  END IF;
END $$;

ALTER TABLE public.poker_table_players
ADD CONSTRAINT unique_player_per_table UNIQUE (table_id, player_id);

-- Clean up duplicate seats
DELETE FROM public.poker_table_players 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY table_id, seat_number ORDER BY joined_at ASC) as rn
    FROM public.poker_table_players
  ) t WHERE rn > 1
);

-- Add unique constraint for seat per table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_seat_per_table') THEN
    ALTER TABLE public.poker_table_players DROP CONSTRAINT unique_seat_per_table;
  END IF;
END $$;

ALTER TABLE public.poker_table_players
ADD CONSTRAINT unique_seat_per_table UNIQUE (table_id, seat_number);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_poker_table_players_table_status 
ON public.poker_table_players (table_id, status);
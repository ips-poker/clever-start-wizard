-- Add bomb_pot_interval column to poker_tables
ALTER TABLE public.poker_tables
ADD COLUMN IF NOT EXISTS bomb_pot_interval integer DEFAULT 10;
-- Add tournament level settings
ALTER TABLE public.tournaments 
ADD COLUMN rebuy_end_level integer DEFAULT 6,
ADD COLUMN addon_level integer DEFAULT 7,
ADD COLUMN break_start_level integer DEFAULT 4;
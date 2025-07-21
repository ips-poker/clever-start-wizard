-- Add starting chips field to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN starting_chips integer NOT NULL DEFAULT 10000;
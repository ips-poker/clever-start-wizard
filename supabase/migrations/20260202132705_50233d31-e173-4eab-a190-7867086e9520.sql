-- Update players_per_table to 8 for the active tournament (as used in admin seating)
UPDATE public.tournaments 
SET players_per_table = 8 
WHERE id = '5ac17257-d082-47d6-bf3b-c7c2984f4b0f';
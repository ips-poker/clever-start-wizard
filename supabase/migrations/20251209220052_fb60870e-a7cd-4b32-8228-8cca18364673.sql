-- Fix seat_number constraint to allow seat 0 (poker tables use 0-indexed seats)
ALTER TABLE poker_table_players 
DROP CONSTRAINT IF EXISTS poker_table_players_seat_number_check;

ALTER TABLE poker_table_players 
ADD CONSTRAINT poker_table_players_seat_number_check 
CHECK (seat_number >= 0 AND seat_number <= 9);
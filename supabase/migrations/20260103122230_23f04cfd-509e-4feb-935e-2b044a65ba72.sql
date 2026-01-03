-- Clean up zero-stack players from tournament tables (they should have been eliminated)
DELETE FROM poker_table_players 
WHERE stack = 0 
AND table_id IN (
  SELECT id FROM poker_tables WHERE table_type = 'tournament'
);
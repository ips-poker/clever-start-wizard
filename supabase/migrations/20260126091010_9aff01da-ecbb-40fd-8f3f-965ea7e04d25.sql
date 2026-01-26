
-- Fix default action_time_seconds for online_poker_tournaments to PokerStars standard (25s)
ALTER TABLE online_poker_tournaments 
  ALTER COLUMN action_time_seconds SET DEFAULT 25;

-- Fix default time_bank_initial to 60s (PokerStars tournament standard)
ALTER TABLE online_poker_tournaments 
  ALTER COLUMN time_bank_initial SET DEFAULT 60;

-- Update existing tournament tables with wrong action_time to PokerStars standard
UPDATE poker_tables 
SET action_time_seconds = 25 
WHERE table_type = 'tournament' 
  AND action_time_seconds = 30;

-- Add comment for documentation
COMMENT ON COLUMN online_poker_tournaments.action_time_seconds IS 'Action time in seconds. PokerStars standard: 25s for tournaments, 15s for cash games';
COMMENT ON COLUMN online_poker_tournaments.time_bank_initial IS 'Initial time bank in seconds. PokerStars standard: 60s for tournaments, 30s for cash games';
COMMENT ON COLUMN poker_tables.action_time_seconds IS 'Action time in seconds. 15s for cash, 25s for tournament (PokerStars standard)';
COMMENT ON COLUMN poker_tables.time_bank_seconds IS 'Time bank in seconds. 30s for cash, 60s for tournament (PokerStars standard)';

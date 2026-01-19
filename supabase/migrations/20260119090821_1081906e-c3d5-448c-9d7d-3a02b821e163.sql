-- Update tournament tables to use 25s base (matches TOURNAMENT_TIMINGS.preflopUnraised)
-- The server's getActionTimeForPhase() will adjust to 20s for raised pots and postflop
UPDATE poker_tables 
SET action_time_seconds = 25 
WHERE table_type = 'tournament' AND action_time_seconds != 25;

-- Ensure cash tables use correct 15s
UPDATE poker_tables 
SET action_time_seconds = 15 
WHERE table_type = 'cash' AND action_time_seconds != 15;

-- Also update online_poker_tournaments to match
UPDATE online_poker_tournaments
SET action_time_seconds = 25
WHERE action_time_seconds != 25;

-- Update default values for new tables
COMMENT ON COLUMN poker_tables.action_time_seconds IS 'PokerStars-style: Cash=15s, Tournament=25s base (server adjusts per phase)';
-- Align existing tournament rows to PokerStars-standard action/timer settings
-- NOTE: This is a data-only migration (no schema changes).

BEGIN;

-- Tournament poker tables (tables created for online tournaments)
UPDATE public.poker_tables
SET
  action_time_seconds = 25,
  updated_at = now()
WHERE
  table_type = 'tournament'
  AND tournament_id IS NOT NULL
  AND (action_time_seconds IS NULL OR action_time_seconds = 30);

UPDATE public.poker_tables
SET
  time_bank_seconds = 60,
  updated_at = now()
WHERE
  table_type = 'tournament'
  AND tournament_id IS NOT NULL
  AND (time_bank_seconds IS NULL OR time_bank_seconds = 30);

-- Online tournaments master settings
UPDATE public.online_poker_tournaments
SET
  action_time_seconds = 25,
  updated_at = now()
WHERE
  (action_time_seconds IS NULL OR action_time_seconds = 30);

UPDATE public.online_poker_tournaments
SET
  time_bank_initial = 60,
  updated_at = now()
WHERE
  (time_bank_initial IS NULL OR time_bank_initial = 30);

COMMIT;
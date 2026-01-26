-- Clean up zombie players from completed tournaments
DELETE FROM poker_table_players
WHERE table_id IN (
  SELECT pt.id FROM poker_tables pt
  JOIN online_poker_tournaments t ON pt.tournament_id = t.id
  WHERE t.status = 'completed' OR t.finished_at IS NOT NULL
);

-- Also clean up empty tournament tables from completed tournaments
UPDATE poker_tables
SET status = 'closed'
WHERE tournament_id IN (
  SELECT id FROM online_poker_tournaments
  WHERE status = 'completed' OR finished_at IS NOT NULL
) AND status IN ('waiting', 'playing');
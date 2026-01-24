-- Clean up stuck tables where current_hand_id points to completed/aborted hands
-- This fixes existing stuck state

UPDATE poker_tables pt
SET 
  current_hand_id = NULL,
  status = 'waiting',
  updated_at = now()
FROM poker_hands ph
WHERE pt.current_hand_id = ph.id
  AND ph.completed_at IS NOT NULL;

-- Also clean any orphaned hands (in DB but not completed)
UPDATE poker_hands
SET 
  completed_at = now(),
  phase = 'aborted'
WHERE completed_at IS NULL
  AND created_at < now() - interval '5 minutes';
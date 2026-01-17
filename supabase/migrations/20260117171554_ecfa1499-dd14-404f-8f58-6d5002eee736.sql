-- Fix all stuck hands that have phase='complete' but completed_at is NULL
UPDATE poker_hands 
SET completed_at = action_started_at 
WHERE phase = 'complete' AND completed_at IS NULL;
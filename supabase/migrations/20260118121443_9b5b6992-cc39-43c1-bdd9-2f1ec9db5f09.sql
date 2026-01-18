-- Complete all stuck hands for this table
UPDATE poker_hands 
SET completed_at = NOW(), phase = 'complete'
WHERE completed_at IS NULL 
  AND table_id = '5bcd7338-00c0-4e00-a2ee-68b5b727c3fe';

-- Also cleanup any other stuck hands older than 1 hour
UPDATE poker_hands 
SET completed_at = NOW(), phase = 'complete'
WHERE completed_at IS NULL 
  AND created_at < NOW() - INTERVAL '1 hour';
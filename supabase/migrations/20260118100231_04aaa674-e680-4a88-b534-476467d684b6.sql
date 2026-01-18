-- Clean up orphaned hand (no players associated)
-- Mark hand as completed/aborted and reset table status
UPDATE poker_hands 
SET completed_at = NOW(), phase = 'aborted'
WHERE id = '1b989cd9-653d-48a5-ad88-711504a98577' 
AND completed_at IS NULL;

-- Reset table to waiting state
UPDATE poker_tables
SET current_hand_id = NULL, status = 'waiting', updated_at = NOW()
WHERE id = '5bcd7338-00c0-4e00-a2ee-68b5b727c3fe'
AND current_hand_id = '1b989cd9-653d-48a5-ad88-711504a98577';
-- Fix phantom hand reference for table 'нговый год'
UPDATE poker_tables 
SET current_hand_id = NULL, status = 'waiting'
WHERE id = '24fa3090-44dd-44d4-ac17-976be0212ca9'
AND current_hand_id = '0c3f7018-4176-4998-ad39-2f0511649cc3';

-- Also clean up any phantom hand references in other tables
UPDATE poker_tables
SET current_hand_id = NULL
WHERE current_hand_id IS NOT NULL
AND current_hand_id NOT IN (SELECT id FROM poker_hands);
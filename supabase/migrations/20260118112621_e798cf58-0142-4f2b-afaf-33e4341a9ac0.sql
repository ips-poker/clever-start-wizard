-- Create unique constraint for poker_actions upsert
-- This enables efficient upsert by (hand_id, action_order) 
CREATE UNIQUE INDEX IF NOT EXISTS poker_actions_hand_action_unique 
ON poker_actions (hand_id, action_order);

-- Add index for faster history lookups
CREATE INDEX IF NOT EXISTS poker_actions_hand_id_idx 
ON poker_actions (hand_id);

CREATE INDEX IF NOT EXISTS poker_actions_player_id_idx 
ON poker_actions (player_id);
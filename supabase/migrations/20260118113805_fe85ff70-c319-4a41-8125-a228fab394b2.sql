-- Add policy for service role to insert actions (server uses service_role key)
CREATE POLICY "Service role can manage actions"
ON poker_actions
FOR ALL
USING (true)
WITH CHECK (true);

-- Also clean up stuck hands
UPDATE poker_hands 
SET completed_at = NOW(), phase = 'complete'
WHERE completed_at IS NULL 
  AND action_started_at < NOW() - INTERVAL '5 minutes';

-- Delete test action if it was created
DELETE FROM poker_actions WHERE action_type = 'test_action';
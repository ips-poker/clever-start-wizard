-- 1. Drop old constraint and add new with cash game types
ALTER TABLE diamond_transactions DROP CONSTRAINT IF EXISTS diamond_transactions_transaction_type_check;

ALTER TABLE diamond_transactions ADD CONSTRAINT diamond_transactions_transaction_type_check 
CHECK (transaction_type = ANY (ARRAY[
  'purchase'::text, 
  'admin_add'::text, 
  'admin_remove'::text, 
  'tournament_entry'::text, 
  'tournament_prize'::text, 
  'refund'::text, 
  'bonus'::text,
  'cash_game_buyin'::text,
  'cash_game_cashout'::text,
  'cash_game_rebuy'::text
]));

-- 2. Update RLS policy to allow admins to seat any player (including bots)
DROP POLICY IF EXISTS "Players can join/leave tables" ON poker_table_players;

CREATE POLICY "Players can join/leave tables" ON poker_table_players
  FOR INSERT
  WITH CHECK (
    -- Admins can seat anyone (including bots)
    is_admin(auth.uid())
    OR
    -- Players can seat themselves
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = poker_table_players.player_id 
      AND (p.user_id = auth.uid() OR p.telegram IS NOT NULL)
    )
  );

-- 3. Also update DELETE policy for admins
DROP POLICY IF EXISTS "Players can leave tables" ON poker_table_players;

CREATE POLICY "Players can leave tables" ON poker_table_players
  FOR DELETE
  USING (
    is_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = poker_table_players.player_id 
      AND (p.user_id = auth.uid() OR p.telegram IS NOT NULL)
    )
  );

-- 4. Update UPDATE policy for admins
DROP POLICY IF EXISTS "Players can update their own seat" ON poker_table_players;

CREATE POLICY "Players can update their own seat" ON poker_table_players
  FOR UPDATE
  USING (
    is_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = poker_table_players.player_id 
      AND (p.user_id = auth.uid() OR p.telegram IS NOT NULL)
    )
  );
-- Update RLS policy for player_balances to allow Telegram users to view their balance
DROP POLICY IF EXISTS "Players can view their own balance" ON public.player_balances;

CREATE POLICY "Players can view their own balance"
ON public.player_balances
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM players p 
    WHERE p.id = player_balances.player_id 
    AND (
      p.user_id = auth.uid() 
      OR (p.telegram IS NOT NULL AND auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM auth.users u 
        WHERE u.id = auth.uid() 
        AND (u.raw_user_meta_data->>'telegram_id') = p.telegram
      ))
    )
  )
);

-- Also ensure the ensure_player_balance function can be called by authenticated users
-- It already uses SECURITY DEFINER so it should work
-- Add admin INSERT policy for online_poker_tournament_participants
-- so that admins can register bots/test players

CREATE POLICY "Admins can register participants"
ON public.online_poker_tournament_participants
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

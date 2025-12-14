-- Добавляем политику чтобы игрок мог сам вступить в клан после принятия приглашения
CREATE POLICY "Players can add themselves when accepting invitation"
ON public.clan_members
FOR INSERT
WITH CHECK (
  -- Игрок добавляет себя
  player_id IN (
    SELECT p.id FROM players p WHERE p.user_id = auth.uid()
    OR (p.telegram IS NOT NULL AND auth.uid() IS NOT NULL)
  )
  -- И у него есть pending/accepted приглашение в этот клан
  AND EXISTS (
    SELECT 1 FROM clan_invitations ci
    WHERE ci.clan_id = clan_members.clan_id
    AND ci.player_id = clan_members.player_id
    AND ci.status IN ('pending', 'accepted')
  )
);
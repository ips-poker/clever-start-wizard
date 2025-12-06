-- Добавляем политику UPDATE для clan_members (для изменения ролей)
CREATE POLICY "Don can update member roles"
ON public.clan_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM clans c
    JOIN players p ON p.id = c.don_player_id
    WHERE c.id = clan_members.clan_id AND p.user_id = auth.uid()
  )
);

-- Добавляем политику для повторной отправки приглашений (удаление старых declined/expired)
CREATE POLICY "Don can update invitations"
ON public.clan_invitations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM clans c
    JOIN players p ON p.id = c.don_player_id
    WHERE c.id = clan_invitations.clan_id AND p.user_id = auth.uid()
  )
);
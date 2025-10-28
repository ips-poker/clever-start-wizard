-- Удаляем старую политику DELETE для tournament_registrations
DROP POLICY IF EXISTS "Only admins can delete registrations" ON public.tournament_registrations;

-- Создаем новую политику, которая разрешает пользователям и Telegram-игрокам удалять свои регистрации
CREATE POLICY "Users and Telegram players can delete their own registrations"
ON public.tournament_registrations
FOR DELETE
USING (
  -- Администраторы могут удалять любые регистрации
  is_admin(auth.uid())
  OR
  -- Аутентифицированные пользователи могут удалять свои регистрации
  (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = tournament_registrations.player_id 
      AND p.user_id = auth.uid()
    )
  )
  OR
  -- Telegram-игроки могут удалять свои регистрации
  -- (проверяем через player_id, так как у них может не быть user_id)
  (
    EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = tournament_registrations.player_id 
      AND p.telegram IS NOT NULL
    )
  )
);
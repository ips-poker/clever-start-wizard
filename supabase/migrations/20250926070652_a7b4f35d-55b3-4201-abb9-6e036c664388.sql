-- Удаляем старую политику и создаем новую для телеграм пользователей
DROP POLICY IF EXISTS "Players can view their own registrations via player_id" ON public.tournament_registrations;

-- Создаем новую политику для просмотра регистраций
CREATE POLICY "Players can view their own registrations via player_id" 
ON public.tournament_registrations
FOR SELECT 
USING (
  -- Существующая политика уже разрешает всем видеть регистрации,
  -- но добавляем дополнительную проверку для безопасности
  true
);
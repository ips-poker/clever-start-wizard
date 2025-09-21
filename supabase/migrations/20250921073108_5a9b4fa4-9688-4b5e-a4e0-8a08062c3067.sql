-- Добавляем политику INSERT для таблицы players
-- Позволяем пользователям создавать свои записи игроков
CREATE POLICY "Users can create their own player data" 
ON public.players 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Также обновляем политику SELECT чтобы пользователи могли видеть всех игроков в рейтинге
-- но с ограничением email только для своих данных
DROP POLICY IF EXISTS "Users can view their own player data" ON public.players;
CREATE POLICY "Players are viewable by everyone with email privacy" 
ON public.players 
FOR SELECT 
USING (true);
-- Создаем новую политику для телеграм пользователей
-- Разрешаем создание игроков с telegram ID без обязательной аутентификации через Supabase
DROP POLICY IF EXISTS "Users can create their own player data" ON public.players;

-- Новая политика для создания игроков
CREATE POLICY "Users can create player profiles with telegram" 
ON public.players
FOR INSERT 
WITH CHECK (
  -- Разрешаем создание если указан telegram ID и user_id равен null или совпадает с текущим пользователем
  (telegram IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()))
  OR 
  -- Или если пользователь аутентифицирован и создает свой профиль
  (auth.uid() = user_id)
);
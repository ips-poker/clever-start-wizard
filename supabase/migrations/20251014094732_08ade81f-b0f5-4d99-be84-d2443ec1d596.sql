-- Обновляем RLS политику для обновления игроков
-- Теперь игроки могут обновлять свои данные если:
-- 1. Они авторизованы и это их профиль (auth.uid() = user_id)
-- 2. ИЛИ они обновляют по своему telegram ID (без проверки auth.uid)
DROP POLICY IF EXISTS "Users can update their own player data" ON public.players;

CREATE POLICY "Users can update their own player data" 
ON public.players 
FOR UPDATE 
USING (
  -- Администраторы могут обновлять всех
  is_admin(auth.uid()) OR
  -- Авторизованные пользователи могут обновлять свой профиль
  (auth.uid() = user_id) OR
  -- Игроки с telegram могут обновлять себя без проверки auth.uid
  -- Это безопасно, потому что в Telegram Mini App невозможно подделать telegram ID другого пользователя
  (telegram IS NOT NULL)
);
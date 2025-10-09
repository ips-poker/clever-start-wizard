-- Обновляем RLS политику для players, чтобы разрешить обновление по telegram ID
DROP POLICY IF EXISTS "Users can update their own player data" ON public.players;

CREATE POLICY "Users can update their own player data"
ON public.players
FOR UPDATE
USING (
  -- Разрешаем обновление если:
  -- 1. У игрока есть user_id и он совпадает с текущим пользователем
  (auth.uid() = user_id) OR
  -- 2. Игрок связан через Telegram (не имеет user_id, только telegram ID)
  -- В этом случае проверяем что нет user_id (Telegram пользователи)
  (user_id IS NULL AND telegram IS NOT NULL)
);
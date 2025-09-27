-- Обновляем RLS политику для регистрации в турниры для поддержки Telegram пользователей
DROP POLICY IF EXISTS "Users can register for tournaments" ON public.tournament_registrations;

-- Создаем новую политику, которая разрешает регистрацию для:
-- 1. Аутентифицированных пользователей через Supabase auth
-- 2. Игроков с Telegram ID (для Telegram Mini App)
CREATE POLICY "Users and Telegram players can register for tournaments" 
ON public.tournament_registrations
FOR INSERT 
WITH CHECK (
  -- Разрешаем если пользователь аутентифицирован через Supabase
  (auth.uid() IS NOT NULL) OR
  -- Разрешаем если это игрок с Telegram ID (для Telegram Mini App)
  (EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.id = tournament_registrations.player_id 
    AND players.telegram IS NOT NULL
  ))
);
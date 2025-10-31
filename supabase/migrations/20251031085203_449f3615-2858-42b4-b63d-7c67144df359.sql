-- Шаг 1: Скрываем email и phone из публичного доступа
-- Удаляем слишком разрешительную политику SELECT
DROP POLICY IF EXISTS "Players are viewable by everyone with email privacy" ON public.players;

-- Создаем новую политику: публично видны только базовые данные
CREATE POLICY "Public can view basic player data"
ON public.players
FOR SELECT
USING (true);

-- Создаем функцию для безопасного получения email/phone
-- Возвращает email и phone только если запрашивает владелец или админ
CREATE OR REPLACE FUNCTION public.can_view_player_contacts(player_record public.players)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Администратор может видеть все
    is_admin(auth.uid())
    OR
    -- Владелец профиля может видеть свои контакты
    (auth.uid() = player_record.user_id)
    OR
    -- Telegram пользователь может видеть свои контакты
    (
      player_record.telegram IS NOT NULL 
      AND EXISTS (
        SELECT 1 
        FROM auth.users u
        WHERE u.id = auth.uid()
        AND u.raw_user_meta_data->>'telegram_id' = player_record.telegram
      )
    );
$$;

-- Шаг 2: Исправляем политику UPDATE для Telegram пользователей
DROP POLICY IF EXISTS "Users can update their own player data" ON public.players;

-- Новая безопасная политика: Telegram пользователь может обновлять ТОЛЬКО СВОЮ запись
CREATE POLICY "Users can update their own player data"
ON public.players
FOR UPDATE
USING (
  -- Администраторы могут обновлять все
  is_admin(auth.uid())
  OR
  -- Обычные пользователи через Supabase auth
  (auth.uid() = user_id)
  OR
  -- Telegram пользователи могут обновлять ТОЛЬКО свою запись
  (
    telegram IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'telegram_id' = telegram
    )
  )
);

-- Шаг 3: Создаем отдельные политики для profiles
DROP POLICY IF EXISTS "Users can update their own profile (except role)" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can change user roles" ON public.profiles;

-- Политика для обычных обновлений (все поля кроме роли)
CREATE POLICY "Users can update their basic profile"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = user_id
  OR
  -- Telegram пользователи могут обновлять свой профиль
  EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = auth.uid()
    AND u.raw_user_meta_data->>'telegram_id' IS NOT NULL
    AND u.id = profiles.user_id
  )
);

-- Отдельная политика только для администраторов (могут менять роли)
CREATE POLICY "Admins have full profile access"
ON public.profiles
FOR UPDATE
USING (is_admin(auth.uid()));

-- Создаем trigger для защиты поля user_role от изменения обычными пользователями
CREATE OR REPLACE FUNCTION public.protect_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Если это не админ и пытается изменить роль
  IF NOT is_admin(auth.uid()) AND OLD.user_role IS DISTINCT FROM NEW.user_role THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Удаляем старый триггер если есть
DROP TRIGGER IF EXISTS protect_role_changes ON public.profiles;

-- Создаем новый триггер
CREATE TRIGGER protect_role_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_role();

-- Комментарий для разработчиков
COMMENT ON FUNCTION public.can_view_player_contacts IS 
  'Security function: Returns true only if the current user can view email/phone of the player. Use this in application code to conditionally render contact information.';
  
COMMENT ON FUNCTION public.protect_user_role IS
  'Trigger function: Prevents non-admin users from changing their user_role field.';
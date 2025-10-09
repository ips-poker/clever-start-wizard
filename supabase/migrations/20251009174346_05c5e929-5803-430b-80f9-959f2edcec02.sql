-- Обновляем функцию двусторонней синхронизации аватаров
CREATE OR REPLACE FUNCTION public.sync_avatar_bidirectional()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Если это обновление players и есть user_id, синхронизируем с profiles
  IF TG_TABLE_NAME = 'players' AND NEW.user_id IS NOT NULL THEN
    -- Синхронизируем аватар
    IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
      UPDATE public.profiles 
      SET avatar_url = NEW.avatar_url,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
    
    -- Синхронизируем имя
    IF NEW.name IS DISTINCT FROM OLD.name THEN
      UPDATE public.profiles 
      SET full_name = NEW.name,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  -- Если это обновление profiles, синхронизируем со всеми связанными players
  IF TG_TABLE_NAME = 'profiles' THEN
    -- Синхронизируем аватар
    IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
      UPDATE public.players 
      SET avatar_url = NEW.avatar_url,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
    
    -- Синхронизируем имя
    IF NEW.full_name IS DISTINCT FROM OLD.full_name AND NEW.full_name IS NOT NULL THEN
      UPDATE public.players 
      SET name = NEW.full_name,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Удаляем старые триггеры если они есть
DROP TRIGGER IF EXISTS sync_player_avatar_on_update ON public.players;
DROP TRIGGER IF EXISTS sync_profile_avatar_on_update ON public.profiles;

-- Создаем новые триггеры для обеих таблиц
CREATE TRIGGER sync_player_avatar_on_update
  AFTER UPDATE ON public.players
  FOR EACH ROW
  WHEN (OLD.avatar_url IS DISTINCT FROM NEW.avatar_url OR OLD.name IS DISTINCT FROM NEW.name)
  EXECUTE FUNCTION public.sync_avatar_bidirectional();

CREATE TRIGGER sync_profile_avatar_on_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.avatar_url IS DISTINCT FROM NEW.avatar_url OR OLD.full_name IS DISTINCT FROM NEW.full_name)
  EXECUTE FUNCTION public.sync_avatar_bidirectional();

-- Обновляем RLS политику для profiles, чтобы разрешить обновление через триггеры
DROP POLICY IF EXISTS "Users can update their own profile (except role)" ON public.profiles;

CREATE POLICY "Users can update their own profile (except role)"
  ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = user_id OR 
    -- Разрешаем обновление через триггеры от players
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE players.user_id = profiles.user_id 
      AND players.telegram IS NOT NULL
    )
  );

-- Синхронизируем существующие данные
-- Сначала из profiles в players
UPDATE public.players p
SET avatar_url = pr.avatar_url,
    name = COALESCE(p.name, pr.full_name)
FROM public.profiles pr
WHERE p.user_id = pr.user_id 
  AND p.user_id IS NOT NULL
  AND (
    (pr.avatar_url IS NOT NULL AND p.avatar_url IS NULL) OR
    (pr.full_name IS NOT NULL AND p.name IS NULL)
  );

-- Затем из players в profiles
UPDATE public.profiles pr
SET avatar_url = p.avatar_url,
    full_name = COALESCE(pr.full_name, p.name)
FROM public.players p
WHERE pr.user_id = p.user_id 
  AND p.user_id IS NOT NULL
  AND (
    (p.avatar_url IS NOT NULL AND pr.avatar_url IS NULL) OR
    (p.name IS NOT NULL AND pr.full_name IS NULL)
  );
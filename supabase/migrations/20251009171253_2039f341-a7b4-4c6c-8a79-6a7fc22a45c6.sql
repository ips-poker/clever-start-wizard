-- Создаем функцию для двусторонней синхронизации аватаров между players и profiles
CREATE OR REPLACE FUNCTION public.sync_avatar_bidirectional()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Если это обновление players и есть user_id, синхронизируем с profiles
  IF TG_TABLE_NAME = 'players' AND NEW.user_id IS NOT NULL THEN
    IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
      UPDATE public.profiles 
      SET avatar_url = NEW.avatar_url,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  -- Если это обновление profiles, синхронизируем со всеми связанными players
  IF TG_TABLE_NAME = 'profiles' THEN
    IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
      UPDATE public.players 
      SET avatar_url = NEW.avatar_url,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Удаляем старый триггер если существует
DROP TRIGGER IF EXISTS sync_player_avatar_trigger ON public.profiles;

-- Создаем новый триггер на profiles для синхронизации с players
CREATE TRIGGER sync_avatar_from_profiles_trigger
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (OLD.avatar_url IS DISTINCT FROM NEW.avatar_url)
EXECUTE FUNCTION public.sync_avatar_bidirectional();

-- Создаем триггер на players для синхронизации с profiles
CREATE TRIGGER sync_avatar_from_players_trigger
AFTER UPDATE ON public.players
FOR EACH ROW
WHEN (OLD.avatar_url IS DISTINCT FROM NEW.avatar_url AND NEW.user_id IS NOT NULL)
EXECUTE FUNCTION public.sync_avatar_bidirectional();
-- Восстанавливаем функцию синхронизации аватаров игроков с профилями
CREATE OR REPLACE FUNCTION public.sync_player_avatar_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Обновляем avatar_url игрока при изменении профиля
  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    UPDATE public.players 
    SET avatar_url = NEW.avatar_url 
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Создаем триггер для автоматической синхронизации при обновлении профиля
DROP TRIGGER IF EXISTS sync_player_avatar_trigger ON public.profiles;
CREATE TRIGGER sync_player_avatar_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_player_avatar_from_profile();

-- Функция для ручной синхронизации всех аватаров
CREATE OR REPLACE FUNCTION public.sync_all_player_avatars()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Обновляем аватары у всех игроков из их профилей
  UPDATE public.players 
  SET avatar_url = p.avatar_url
  FROM public.profiles p
  WHERE players.user_id = p.user_id 
    AND players.user_id IS NOT NULL
    AND (players.avatar_url IS NULL OR players.avatar_url != p.avatar_url);
    
  -- Также обновляем случаи где avatar_url у профиля null, а у игрока есть
  UPDATE public.players 
  SET avatar_url = NULL
  FROM public.profiles p
  WHERE players.user_id = p.user_id 
    AND players.user_id IS NOT NULL
    AND p.avatar_url IS NULL
    AND players.avatar_url IS NOT NULL;
END;
$function$;

-- Выполняем синхронизацию аватаров
SELECT public.sync_all_player_avatars();
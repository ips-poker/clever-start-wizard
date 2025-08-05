-- Создаем функцию для ручного обновления аватаров игроков из профилей
CREATE OR REPLACE FUNCTION public.sync_all_player_avatars()
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Выполняем синхронизацию существующих аватаров
SELECT sync_all_player_avatars();
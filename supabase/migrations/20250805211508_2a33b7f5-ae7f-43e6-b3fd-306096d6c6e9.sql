-- Исправляем функции с правильным search_path для безопасности
CREATE OR REPLACE FUNCTION public.sync_player_avatar_from_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Обновляем avatar_url игрока при изменении профиля
  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    UPDATE public.players 
    SET avatar_url = NEW.avatar_url 
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.link_players_to_profiles()
RETURNS void AS $$
BEGIN
  -- Связываем игроков с профилями по email
  UPDATE public.players 
  SET user_id = p.user_id,
      avatar_url = p.avatar_url
  FROM public.profiles p
  INNER JOIN auth.users u ON p.user_id = u.id
  WHERE players.email = u.email 
    AND players.user_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';
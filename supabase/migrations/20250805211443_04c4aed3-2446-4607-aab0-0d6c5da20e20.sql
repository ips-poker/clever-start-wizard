-- Добавляем поле user_id в таблицу players для связи с профилями
ALTER TABLE public.players 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Создаем индекс для быстрого поиска
CREATE INDEX idx_players_user_id ON public.players(user_id);

-- Создаем функцию для автоматического обновления avatar_url игрока из профиля
CREATE OR REPLACE FUNCTION sync_player_avatar_from_profile()
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем триггер для автоматической синхронизации аватаров
DROP TRIGGER IF EXISTS sync_avatar_trigger ON public.profiles;
CREATE TRIGGER sync_avatar_trigger
  AFTER UPDATE OF avatar_url ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_player_avatar_from_profile();

-- Создаем функцию для связывания существующих игроков с профилями по email
CREATE OR REPLACE FUNCTION link_players_to_profiles()
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Выполняем связывание существующих записей
SELECT link_players_to_profiles();
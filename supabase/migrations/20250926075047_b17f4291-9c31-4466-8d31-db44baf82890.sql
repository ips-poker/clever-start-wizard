-- Функция для связывания игроков при авторизации через Telegram
CREATE OR REPLACE FUNCTION public.merge_player_profiles(telegram_user_id TEXT, telegram_email TEXT, supabase_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  existing_player_id UUID;
  telegram_player_id UUID;
BEGIN
  -- Ищем существующего игрока по user_id (созданного через сайт)
  SELECT id INTO existing_player_id
  FROM public.players 
  WHERE user_id = supabase_user_id;

  -- Ищем игрока созданного через Telegram
  SELECT id INTO telegram_player_id
  FROM public.players 
  WHERE telegram = telegram_user_id;

  -- Если есть оба игрока, объединяем их
  IF existing_player_id IS NOT NULL AND telegram_player_id IS NOT NULL AND existing_player_id != telegram_player_id THEN
    -- Переносим регистрации с Telegram игрока на основного
    UPDATE public.tournament_registrations 
    SET player_id = existing_player_id 
    WHERE player_id = telegram_player_id;
    
    -- Переносим результаты игр
    UPDATE public.game_results 
    SET player_id = existing_player_id 
    WHERE player_id = telegram_player_id;
    
    -- Обновляем Telegram ID у основного игрока
    UPDATE public.players 
    SET telegram = telegram_user_id,
        updated_at = now()
    WHERE id = existing_player_id;
    
    -- Удаляем дублирующего Telegram игрока
    DELETE FROM public.players WHERE id = telegram_player_id;
    
    RETURN existing_player_id;
  END IF;

  -- Если есть только игрок созданный через сайт, добавляем ему Telegram ID
  IF existing_player_id IS NOT NULL AND telegram_player_id IS NULL THEN
    UPDATE public.players 
    SET telegram = telegram_user_id,
        updated_at = now()
    WHERE id = existing_player_id;
    
    RETURN existing_player_id;
  END IF;

  -- Если есть только Telegram игрок, привязываем его к user_id
  IF telegram_player_id IS NOT NULL AND existing_player_id IS NULL THEN
    UPDATE public.players 
    SET user_id = supabase_user_id,
        updated_at = now()
    WHERE id = telegram_player_id;
    
    RETURN telegram_player_id;
  END IF;

  -- Если нет ни одного игрока, возвращаем NULL (будет создан новый)
  RETURN NULL;
END;
$$;
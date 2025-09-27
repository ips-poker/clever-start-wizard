-- Улучшаем функцию объединения профилей для лучшего поиска пользователей
CREATE OR REPLACE FUNCTION public.merge_player_profiles(telegram_user_id text, telegram_email text, supabase_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existing_player_id UUID;
  telegram_player_id UUID;
  email_player_id UUID;
  existing_user_id UUID;
BEGIN
  -- ПРИОРИТЕТ 1: Ищем игрока по Telegram ID (самый надежный идентификатор)
  SELECT id, user_id INTO telegram_player_id, existing_user_id
  FROM public.players 
  WHERE telegram = telegram_user_id;

  -- Если нашли игрока по Telegram ID
  IF telegram_player_id IS NOT NULL THEN
    -- Если у игрока еще нет привязки к Supabase пользователю, привязываем
    IF existing_user_id IS NULL THEN
      UPDATE public.players 
      SET user_id = supabase_user_id,
          email = telegram_email,
          updated_at = now()
      WHERE id = telegram_player_id;
    END IF;
    
    -- Если есть еще игрок по user_id (но это другой игрок), объединяем их
    SELECT id INTO existing_player_id
    FROM public.players 
    WHERE user_id = supabase_user_id AND id != telegram_player_id;
    
    IF existing_player_id IS NOT NULL THEN
      -- Переносим данные с игрока created через сайт на Telegram игрока
      UPDATE public.tournament_registrations 
      SET player_id = telegram_player_id 
      WHERE player_id = existing_player_id
        AND NOT EXISTS (
          SELECT 1 FROM public.tournament_registrations tr2 
          WHERE tr2.player_id = telegram_player_id 
            AND tr2.tournament_id = tournament_registrations.tournament_id
        );
      
      DELETE FROM public.tournament_registrations WHERE player_id = existing_player_id;
      
      UPDATE public.game_results 
      SET player_id = telegram_player_id 
      WHERE player_id = existing_player_id
        AND NOT EXISTS (
          SELECT 1 FROM public.game_results gr2 
          WHERE gr2.player_id = telegram_player_id 
            AND gr2.tournament_id = game_results.tournament_id
        );
      
      DELETE FROM public.game_results WHERE player_id = existing_player_id;
      DELETE FROM public.players WHERE id = existing_player_id;
    END IF;
    
    RETURN telegram_player_id;
  END IF;

  -- ПРИОРИТЕТ 2: Ищем существующего игрока по user_id (созданного через сайт)
  SELECT id INTO existing_player_id
  FROM public.players 
  WHERE user_id = supabase_user_id;

  IF existing_player_id IS NOT NULL THEN
    -- Добавляем Telegram ID к существующему игроку
    UPDATE public.players 
    SET telegram = telegram_user_id,
        updated_at = now()
    WHERE id = existing_player_id;
    
    RETURN existing_player_id;
  END IF;

  -- ПРИОРИТЕТ 3: Ищем игрока по email (последний шанс)
  SELECT id INTO email_player_id
  FROM public.players 
  WHERE email = telegram_email;

  IF email_player_id IS NOT NULL THEN
    UPDATE public.players 
    SET user_id = supabase_user_id,
        telegram = telegram_user_id,
        updated_at = now()
    WHERE id = email_player_id;
    
    RETURN email_player_id;
  END IF;

  -- Если не нашли ни одного подходящего игрока, возвращаем NULL 
  -- (будет создан новый игрок)
  RETURN NULL;
END;
$function$;
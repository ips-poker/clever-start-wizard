-- Исправляем функцию объединения профилей для правильной обработки дублирующих регистраций
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
BEGIN
  -- Ищем существующего игрока по user_id (созданного через сайт)
  SELECT id INTO existing_player_id
  FROM public.players 
  WHERE user_id = supabase_user_id;

  -- Ищем игрока созданного через Telegram
  SELECT id INTO telegram_player_id
  FROM public.players 
  WHERE telegram = telegram_user_id;

  -- Ищем игрока по email
  SELECT id INTO email_player_id
  FROM public.players 
  WHERE email = telegram_email;

  -- Логика объединения
  -- Если есть игрок по user_id, это приоритетный
  IF existing_player_id IS NOT NULL THEN
    -- Обновляем telegram ID у основного игрока
    UPDATE public.players 
    SET telegram = telegram_user_id,
        updated_at = now()
    WHERE id = existing_player_id;
    
    -- Если есть отдельный Telegram игрок, переносим данные и удаляем дубль
    IF telegram_player_id IS NOT NULL AND telegram_player_id != existing_player_id THEN
      -- Переносим регистрации только те, которых еще нет у основного игрока
      UPDATE public.tournament_registrations 
      SET player_id = existing_player_id 
      WHERE player_id = telegram_player_id
        AND NOT EXISTS (
          SELECT 1 FROM public.tournament_registrations tr2 
          WHERE tr2.player_id = existing_player_id 
            AND tr2.tournament_id = tournament_registrations.tournament_id
        );
      
      -- Удаляем оставшиеся регистрации дублирующего игрока
      DELETE FROM public.tournament_registrations 
      WHERE player_id = telegram_player_id;
      
      -- Переносим результаты игр только уникальные
      UPDATE public.game_results 
      SET player_id = existing_player_id 
      WHERE player_id = telegram_player_id
        AND NOT EXISTS (
          SELECT 1 FROM public.game_results gr2 
          WHERE gr2.player_id = existing_player_id 
            AND gr2.tournament_id = game_results.tournament_id
        );
      
      -- Удаляем оставшиеся результаты дублирующего игрока
      DELETE FROM public.game_results 
      WHERE player_id = telegram_player_id;
      
      -- Удаляем дублирующего игрока
      DELETE FROM public.players WHERE id = telegram_player_id;
    END IF;
    
    -- Если есть игрок по email, но это не тот же что по user_id
    IF email_player_id IS NOT NULL AND email_player_id != existing_player_id THEN
      -- Переносим данные и удаляем дубль
      UPDATE public.tournament_registrations 
      SET player_id = existing_player_id 
      WHERE player_id = email_player_id
        AND NOT EXISTS (
          SELECT 1 FROM public.tournament_registrations tr2 
          WHERE tr2.player_id = existing_player_id 
            AND tr2.tournament_id = tournament_registrations.tournament_id
        );
      
      DELETE FROM public.tournament_registrations 
      WHERE player_id = email_player_id;
      
      UPDATE public.game_results 
      SET player_id = existing_player_id 
      WHERE player_id = email_player_id
        AND NOT EXISTS (
          SELECT 1 FROM public.game_results gr2 
          WHERE gr2.player_id = existing_player_id 
            AND gr2.tournament_id = game_results.tournament_id
        );
      
      DELETE FROM public.game_results 
      WHERE player_id = email_player_id;
      
      DELETE FROM public.players WHERE id = email_player_id;
    END IF;
    
    RETURN existing_player_id;
  END IF;

  -- Если есть только Telegram игрок, привязываем его к user_id
  IF telegram_player_id IS NOT NULL THEN
    UPDATE public.players 
    SET user_id = supabase_user_id,
        email = telegram_email,
        updated_at = now()
    WHERE id = telegram_player_id;
    
    -- Если есть еще и игрок по email, объединяем
    IF email_player_id IS NOT NULL AND email_player_id != telegram_player_id THEN
      UPDATE public.tournament_registrations 
      SET player_id = telegram_player_id 
      WHERE player_id = email_player_id
        AND NOT EXISTS (
          SELECT 1 FROM public.tournament_registrations tr2 
          WHERE tr2.player_id = telegram_player_id 
            AND tr2.tournament_id = tournament_registrations.tournament_id
        );
      
      DELETE FROM public.tournament_registrations 
      WHERE player_id = email_player_id;
      
      UPDATE public.game_results 
      SET player_id = telegram_player_id 
      WHERE player_id = email_player_id
        AND NOT EXISTS (
          SELECT 1 FROM public.game_results gr2 
          WHERE gr2.player_id = telegram_player_id 
            AND gr2.tournament_id = game_results.tournament_id
        );
      
      DELETE FROM public.game_results 
      WHERE player_id = email_player_id;
      
      DELETE FROM public.players WHERE id = email_player_id;
    END IF;
    
    RETURN telegram_player_id;
  END IF;

  -- Если есть только игрок по email, привязываем его
  IF email_player_id IS NOT NULL THEN
    UPDATE public.players 
    SET user_id = supabase_user_id,
        telegram = telegram_user_id,
        updated_at = now()
    WHERE id = email_player_id;
    
    RETURN email_player_id;
  END IF;

  -- Если нет ни одного игрока, возвращаем NULL (будет создан новый)
  RETURN NULL;
END;
$function$;
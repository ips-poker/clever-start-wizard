-- Исправление начального значения elo_rating (RPS) при создании игрока
-- Обновляем функцию create_player_safe, чтобы новые игроки получали 100 RPS вместо 1000

CREATE OR REPLACE FUNCTION public.create_player_safe(
  p_name text, 
  p_email text DEFAULT NULL::text, 
  p_telegram text DEFAULT NULL::text, 
  p_avatar_url text DEFAULT NULL::text, 
  p_user_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_player RECORD;
  v_existing_player_id UUID;
BEGIN
  -- Проверяем, не существует ли уже игрок
  IF p_telegram IS NOT NULL THEN
    SELECT id INTO v_existing_player_id
    FROM public.players
    WHERE telegram = p_telegram;
    
    IF v_existing_player_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Player with this Telegram ID already exists',
        'player_id', v_existing_player_id
      );
    END IF;
  END IF;

  IF p_email IS NOT NULL THEN
    SELECT id INTO v_existing_player_id
    FROM public.players
    WHERE email = p_email;
    
    IF v_existing_player_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Player with this email already exists',
        'player_id', v_existing_player_id
      );
    END IF;
  END IF;

  -- Создаем нового игрока с начальным рейтингом 100 RPS
  INSERT INTO public.players (
    name,
    email,
    telegram,
    avatar_url,
    user_id,
    elo_rating,
    games_played,
    wins
  )
  VALUES (
    p_name,
    p_email,
    p_telegram,
    p_avatar_url,
    p_user_id,
    100,  -- Изменено с 1000 на 100 RPS
    0,
    0
  )
  RETURNING * INTO v_new_player;

  RETURN jsonb_build_object(
    'success', true,
    'player', row_to_json(v_new_player)
  );
END;
$function$;
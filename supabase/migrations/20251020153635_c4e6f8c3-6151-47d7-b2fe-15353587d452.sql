-- Создание безопасных RPC функций для работы с профилями игроков

-- Функция для безопасного обновления данных игрока
CREATE OR REPLACE FUNCTION public.update_player_safe(
  p_player_id UUID,
  p_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_player RECORD;
BEGIN
  -- Обновляем данные игрока (только переданные поля)
  UPDATE public.players
  SET
    name = COALESCE(p_name, name),
    avatar_url = CASE 
      WHEN p_avatar_url IS NOT NULL THEN p_avatar_url 
      ELSE avatar_url 
    END,
    updated_at = now()
  WHERE id = p_player_id
  RETURNING * INTO v_updated_player;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'player', row_to_json(v_updated_player)
  );
END;
$$;

-- Функция для безопасного создания игрока
CREATE OR REPLACE FUNCTION public.create_player_safe(
  p_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_telegram TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Создаем нового игрока
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
    1000,
    0,
    0
  )
  RETURNING * INTO v_new_player;

  RETURN jsonb_build_object(
    'success', true,
    'player', row_to_json(v_new_player)
  );
END;
$$;

-- Функция для безопасной регистрации на турнир
CREATE OR REPLACE FUNCTION public.register_tournament_safe(
  p_tournament_id UUID,
  p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_registration UUID;
  v_tournament RECORD;
  v_registration_count INTEGER;
BEGIN
  -- Проверяем существование турнира
  SELECT * INTO v_tournament
  FROM public.tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- Проверяем, не зарегистрирован ли уже игрок
  SELECT id INTO v_existing_registration
  FROM public.tournament_registrations
  WHERE tournament_id = p_tournament_id 
    AND player_id = p_player_id;

  IF v_existing_registration IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already registered');
  END IF;

  -- Проверяем лимит игроков
  SELECT COUNT(*) INTO v_registration_count
  FROM public.tournament_registrations
  WHERE tournament_id = p_tournament_id
    AND status IN ('registered', 'confirmed', 'playing');

  IF v_registration_count >= v_tournament.max_players THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament is full');
  END IF;

  -- Регистрируем игрока
  INSERT INTO public.tournament_registrations (
    tournament_id,
    player_id,
    status
  )
  VALUES (
    p_tournament_id,
    p_player_id,
    'registered'
  );

  RETURN jsonb_build_object('success', true, 'message', 'Successfully registered');
END;
$$;
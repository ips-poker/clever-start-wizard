-- Создаем безопасные RPC функции для операций турнирного директора
-- Все функции используют SECURITY DEFINER для обхода проблем с auth.uid() через кастомный домен

-- 1. Функция для создания турнира (обходит RLS)
CREATE OR REPLACE FUNCTION public.create_tournament_safe(
  p_name text,
  p_description text,
  p_participation_fee integer,
  p_reentry_fee integer,
  p_additional_fee integer,
  p_reentry_chips integer,
  p_additional_chips integer,
  p_starting_chips integer,
  p_max_players integer,
  p_start_time timestamptz,
  p_tournament_format text,
  p_reentry_end_level integer,
  p_additional_level integer,
  p_break_start_level integer,
  p_timer_duration integer,
  p_is_published boolean,
  p_voice_control_enabled boolean,
  p_status text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament_id uuid;
  v_is_admin boolean;
BEGIN
  -- Проверяем, является ли пользователь администратором
  SELECT is_admin(auth.uid()) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only administrators can create tournaments';
  END IF;

  -- Создаем турнир
  INSERT INTO public.tournaments (
    name,
    description,
    participation_fee,
    reentry_fee,
    additional_fee,
    reentry_chips,
    additional_chips,
    starting_chips,
    max_players,
    start_time,
    tournament_format,
    reentry_end_level,
    additional_level,
    break_start_level,
    timer_duration,
    is_published,
    voice_control_enabled,
    status
  ) VALUES (
    p_name,
    p_description,
    p_participation_fee,
    p_reentry_fee,
    p_additional_fee,
    p_reentry_chips,
    p_additional_chips,
    p_starting_chips,
    p_max_players,
    p_start_time,
    p_tournament_format,
    p_reentry_end_level,
    p_additional_level,
    p_break_start_level,
    p_timer_duration,
    p_is_published,
    p_voice_control_enabled,
    p_status
  ) RETURNING id INTO v_tournament_id;

  RETURN v_tournament_id;
END;
$$;

-- 2. Функция для обновления турнира
CREATE OR REPLACE FUNCTION public.update_tournament_safe(
  p_tournament_id uuid,
  p_name text,
  p_description text,
  p_participation_fee integer,
  p_reentry_fee integer,
  p_additional_fee integer,
  p_reentry_chips integer,
  p_additional_chips integer,
  p_starting_chips integer,
  p_max_players integer,
  p_start_time timestamptz,
  p_tournament_format text,
  p_reentry_end_level integer,
  p_additional_level integer,
  p_break_start_level integer,
  p_timer_duration integer,
  p_is_published boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Проверяем права администратора
  SELECT is_admin(auth.uid()) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only administrators can update tournaments';
  END IF;

  UPDATE public.tournaments
  SET
    name = p_name,
    description = p_description,
    participation_fee = p_participation_fee,
    reentry_fee = p_reentry_fee,
    additional_fee = p_additional_fee,
    reentry_chips = p_reentry_chips,
    additional_chips = p_additional_chips,
    starting_chips = p_starting_chips,
    max_players = p_max_players,
    start_time = p_start_time,
    tournament_format = p_tournament_format,
    reentry_end_level = p_reentry_end_level,
    additional_level = p_additional_level,
    break_start_level = p_break_start_level,
    timer_duration = p_timer_duration,
    is_published = p_is_published,
    updated_at = now()
  WHERE id = p_tournament_id;
END;
$$;

-- 3. Функция для удаления турнира
CREATE OR REPLACE FUNCTION public.delete_tournament_safe(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT is_admin(auth.uid()) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only administrators can delete tournaments';
  END IF;

  -- Удаляем связанные данные
  DELETE FROM public.blind_levels WHERE tournament_id = p_tournament_id;
  DELETE FROM public.tournament_payouts WHERE tournament_id = p_tournament_id;
  DELETE FROM public.tournament_registrations WHERE tournament_id = p_tournament_id;
  DELETE FROM public.game_results WHERE tournament_id = p_tournament_id;
  
  -- Удаляем сам турнир
  DELETE FROM public.tournaments WHERE id = p_tournament_id;
END;
$$;

-- 4. Функция для создания уровней блайндов
CREATE OR REPLACE FUNCTION public.create_blind_levels_safe(
  p_tournament_id uuid,
  p_blind_levels jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_level jsonb;
BEGIN
  SELECT is_admin(auth.uid()) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only administrators can create blind levels';
  END IF;

  -- Вставляем уровни блайндов из JSON
  FOR v_level IN SELECT * FROM jsonb_array_elements(p_blind_levels)
  LOOP
    INSERT INTO public.blind_levels (
      tournament_id,
      level,
      small_blind,
      big_blind,
      ante,
      duration,
      is_break
    ) VALUES (
      p_tournament_id,
      (v_level->>'level')::integer,
      (v_level->>'small_blind')::integer,
      (v_level->>'big_blind')::integer,
      COALESCE((v_level->>'ante')::integer, 0),
      (v_level->>'duration')::integer,
      COALESCE((v_level->>'is_break')::boolean, false)
    );
  END LOOP;
END;
$$;

-- 5. Функция для обновления статуса турнира (используется в управлении)
CREATE OR REPLACE FUNCTION public.update_tournament_status_safe(
  p_tournament_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT is_admin(auth.uid()) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only administrators can change tournament status';
  END IF;

  UPDATE public.tournaments
  SET 
    status = p_status,
    updated_at = now(),
    finished_at = CASE WHEN p_status = 'completed' THEN now() ELSE finished_at END
  WHERE id = p_tournament_id;
END;
$$;
-- Дополнительные безопасные RPC функции для турнирного директора

-- 6. Функция для обновления уровня блайндов и таймера
CREATE OR REPLACE FUNCTION public.update_tournament_level_safe(
  p_tournament_id uuid,
  p_current_level integer,
  p_small_blind integer,
  p_big_blind integer,
  p_timer_remaining integer,
  p_timer_duration integer
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
    RAISE EXCEPTION 'Only administrators can update tournament levels';
  END IF;

  UPDATE public.tournaments
  SET
    current_level = p_current_level,
    current_small_blind = p_small_blind,
    current_big_blind = p_big_blind,
    timer_remaining = p_timer_remaining,
    timer_duration = p_timer_duration,
    updated_at = now()
  WHERE id = p_tournament_id;
END;
$$;

-- 7. Функция для создания стандартной структуры блайндов
CREATE OR REPLACE FUNCTION public.create_default_blind_structure_safe(
  p_tournament_id uuid
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
    RAISE EXCEPTION 'Only administrators can create blind structures';
  END IF;

  -- Удаляем существующие уровни, если есть
  DELETE FROM public.blind_levels WHERE tournament_id = p_tournament_id;

  -- Создаем стандартную структуру блайндов
  INSERT INTO public.blind_levels (tournament_id, level, small_blind, big_blind, ante, duration) VALUES
    (p_tournament_id, 1, 25, 50, 0, 1200),
    (p_tournament_id, 2, 50, 100, 0, 1200),
    (p_tournament_id, 3, 75, 150, 25, 1200),
    (p_tournament_id, 4, 100, 200, 25, 1200),
    (p_tournament_id, 5, 150, 300, 50, 1200),
    (p_tournament_id, 6, 200, 400, 50, 1200),
    (p_tournament_id, 7, 300, 600, 75, 1200),
    (p_tournament_id, 8, 400, 800, 100, 1200),
    (p_tournament_id, 9, 500, 1000, 100, 1200),
    (p_tournament_id, 10, 600, 1200, 200, 1200),
    (p_tournament_id, 11, 800, 1600, 200, 1200),
    (p_tournament_id, 12, 1000, 2000, 300, 1200),
    (p_tournament_id, 13, 1500, 3000, 500, 1200),
    (p_tournament_id, 14, 2000, 4000, 500, 1200),
    (p_tournament_id, 15, 3000, 6000, 1000, 1200),
    (p_tournament_id, 16, 4000, 8000, 1000, 1200),
    (p_tournament_id, 17, 5000, 10000, 1500, 1200),
    (p_tournament_id, 18, 7500, 15000, 2000, 1200),
    (p_tournament_id, 19, 10000, 20000, 3000, 1200);
END;
$$;

-- 8. Функция для обновления только таймера (используется часто)
CREATE OR REPLACE FUNCTION public.update_timer_only_safe(
  p_tournament_id uuid,
  p_timer_remaining integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Эта функция доступна всем, т.к. таймер может обновляться часто
  -- и не требует проверки администратора для каждого обновления
  UPDATE public.tournaments
  SET
    timer_remaining = p_timer_remaining,
    updated_at = now()
  WHERE id = p_tournament_id;
END;
$$;
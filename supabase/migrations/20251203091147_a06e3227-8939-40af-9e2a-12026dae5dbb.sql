-- Создаем функцию для безопасного обновления рейтинга игрока администратором
CREATE OR REPLACE FUNCTION public.update_player_rating_safe(
  p_player_id uuid,
  p_new_rating integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
  v_old_rating integer;
  v_player_name text;
BEGIN
  -- Проверяем права администратора
  SELECT is_admin(auth.uid()) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only administrators can update player ratings');
  END IF;

  -- Получаем текущий рейтинг и имя игрока
  SELECT elo_rating, name INTO v_old_rating, v_player_name
  FROM public.players
  WHERE id = p_player_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;

  -- Обновляем рейтинг
  UPDATE public.players
  SET 
    elo_rating = p_new_rating,
    updated_at = now()
  WHERE id = p_player_id;

  RETURN jsonb_build_object(
    'success', true,
    'player_name', v_player_name,
    'old_rating', v_old_rating,
    'new_rating', p_new_rating,
    'change', p_new_rating - v_old_rating
  );
END;
$function$;
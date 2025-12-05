-- Создаем безопасную функцию для назначения ранга игроку
CREATE OR REPLACE FUNCTION public.assign_player_rank_safe(
  p_player_id uuid,
  p_rank text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_player_name text;
  v_old_rank text;
BEGIN
  -- Проверяем права администратора
  SELECT is_admin(auth.uid()) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only administrators can assign ranks');
  END IF;

  -- Получаем текущие данные игрока
  SELECT name, manual_rank INTO v_player_name, v_old_rank
  FROM public.players
  WHERE id = p_player_id;

  IF v_player_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;

  -- Обновляем ранг
  UPDATE public.players
  SET 
    manual_rank = p_rank,
    updated_at = now()
  WHERE id = p_player_id;

  RETURN jsonb_build_object(
    'success', true,
    'player_name', v_player_name,
    'old_rank', v_old_rank,
    'new_rank', p_rank
  );
END;
$$;
-- Обновляем функцию get_player_safe для работы с новой политикой
-- Теперь email возвращается только для собственных данных или админов
CREATE OR REPLACE FUNCTION public.get_player_safe(player_id_param uuid)
RETURNS TABLE(id uuid, name text, email text, elo_rating integer, games_played integer, wins integer, avatar_url text, created_at timestamp with time zone, updated_at timestamp with time zone, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Возвращаем данные включая email только если:
  -- 1. Это собственные данные пользователя, или
  -- 2. Пользователь является администратором
  IF auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.players WHERE players.id = player_id_param AND players.user_id = auth.uid()) OR
    is_admin(auth.uid())
  ) THEN
    RETURN QUERY
    SELECT p.id, p.name, p.email, p.elo_rating, p.games_played, p.wins, p.avatar_url, p.created_at, p.updated_at, p.user_id
    FROM public.players p
    WHERE p.id = player_id_param;
  ELSE
    -- Для всех остальных возвращаем данные без email
    RETURN QUERY
    SELECT p.id, p.name, NULL::text as email, p.elo_rating, p.games_played, p.wins, p.avatar_url, p.created_at, p.updated_at, p.user_id
    FROM public.players p
    WHERE p.id = player_id_param;
  END IF;
END;
$$;
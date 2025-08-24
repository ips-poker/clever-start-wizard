-- Исправление уязвимости: защита email адресов игроков
-- Удаляем существующие слишком разрешительные политики
DROP POLICY IF EXISTS "Allow all operations on players" ON public.players;
DROP POLICY IF EXISTS "Players are viewable by everyone" ON public.players;

-- Создаем новые безопасные RLS политики
-- Пользователи могут видеть и обновлять только свои данные
CREATE POLICY "Users can view their own player data" 
ON public.players 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own player data" 
ON public.players 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Администраторы имеют полный доступ
CREATE POLICY "Admins can manage all players" 
ON public.players 
FOR ALL 
USING (is_admin(auth.uid()));

-- Создаем безопасное представление для публичного доступа (без email)
CREATE OR REPLACE VIEW public.players_public AS
SELECT 
  id,
  name,
  elo_rating,
  games_played,
  wins,
  avatar_url,
  created_at,
  updated_at,
  user_id
FROM public.players;

-- Разрешаем всем читать публичное представление
GRANT SELECT ON public.players_public TO anon, authenticated;

-- Создаем функцию для безопасного получения данных игрока
CREATE OR REPLACE FUNCTION public.get_player_safe(player_id_param uuid)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  elo_rating integer,
  games_played integer,
  wins integer,
  avatar_url text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
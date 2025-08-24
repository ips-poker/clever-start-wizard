-- Исправление предупреждения Security Definer View
-- Удаляем view и создаем обычную функцию
DROP VIEW IF EXISTS public.players_public;

-- Создаем функцию для безопасного получения публичных данных игроков
CREATE OR REPLACE FUNCTION public.get_players_public()
RETURNS TABLE (
  id uuid,
  name text,
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
  -- Возвращаем только публичные данные без email
  RETURN QUERY
  SELECT 
    p.id, 
    p.name, 
    p.elo_rating, 
    p.games_played, 
    p.wins, 
    p.avatar_url, 
    p.created_at, 
    p.updated_at, 
    p.user_id
  FROM public.players p;
END;
$$;

-- Создаем обычное представление без SECURITY DEFINER
CREATE VIEW public.players_public AS
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

-- Разрешаем всем читать представление
GRANT SELECT ON public.players_public TO anon, authenticated;
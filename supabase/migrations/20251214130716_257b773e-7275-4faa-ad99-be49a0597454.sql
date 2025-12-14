-- Добавляем Дона клана Акулетти в clan_members (если ещё не добавлен)
INSERT INTO public.clan_members (clan_id, player_id, hierarchy_role)
SELECT 'b318466a-9b42-4b1f-a4ef-f3c52990a2a4', '19a5d4e9-0589-4559-802a-421ac37b8ce2', 'don'
WHERE NOT EXISTS (
  SELECT 1 FROM public.clan_members 
  WHERE clan_id = 'b318466a-9b42-4b1f-a4ef-f3c52990a2a4' 
  AND player_id = '19a5d4e9-0589-4559-802a-421ac37b8ce2'
);

-- Пересчитываем рейтинг для всех кланов (на случай если Дон не был добавлен ранее)
UPDATE public.clans c
SET total_rating = (
  SELECT COALESCE(SUM(p.elo_rating), 0)
  FROM public.clan_members cm
  JOIN public.players p ON p.id = cm.player_id
  WHERE cm.clan_id = c.id
),
updated_at = now();
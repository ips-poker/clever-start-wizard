
-- Добавляем подписки и staff для существующих кланов
INSERT INTO public.club_subscriptions (clan_id, plan)
SELECT c.id, 'free'::subscription_plan
FROM public.clans c
WHERE NOT EXISTS (
  SELECT 1 FROM public.club_subscriptions cs WHERE cs.clan_id = c.id
)
ON CONFLICT (clan_id) DO NOTHING;

-- Добавляем донов как owner в club_staff
INSERT INTO public.club_staff (clan_id, player_id, role, permissions)
SELECT 
  c.id,
  c.don_player_id,
  'owner'::club_role,
  '{"manage_tournaments": true, "manage_players": true, "manage_staff": true, "view_analytics": true}'::jsonb
FROM public.clans c
WHERE NOT EXISTS (
  SELECT 1 FROM public.club_staff cs WHERE cs.clan_id = c.id AND cs.player_id = c.don_player_id
)
ON CONFLICT (clan_id, player_id) DO NOTHING;

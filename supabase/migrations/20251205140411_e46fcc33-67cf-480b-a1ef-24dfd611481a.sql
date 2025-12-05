-- Включаем Realtime для таблицы clan_invitations
ALTER TABLE public.clan_invitations REPLICA IDENTITY FULL;

-- Добавляем таблицу в публикацию realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.clan_invitations;
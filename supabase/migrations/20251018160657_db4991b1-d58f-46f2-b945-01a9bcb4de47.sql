-- Удаляем уникальные ограничения на поля name и email в таблице players
-- Имена игроков могут повторяться, уникальность обеспечивается через id и telegram
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_name_key;
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_email_key;
-- Включение реального времени для всех таблиц
ALTER TABLE public.players REPLICA IDENTITY FULL;
ALTER TABLE public.tournaments REPLICA IDENTITY FULL;
ALTER TABLE public.game_results REPLICA IDENTITY FULL;
ALTER TABLE public.tournament_registrations REPLICA IDENTITY FULL;
ALTER TABLE public.blind_levels REPLICA IDENTITY FULL;

-- Добавление таблиц в публикацию реального времени
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blind_levels;
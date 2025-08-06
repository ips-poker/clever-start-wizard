-- Обновление рейтинговой системы на RPS (Rating Points System)
-- Изменяем дефолтный рейтинг новых игроков с 1200 на 100
ALTER TABLE public.players ALTER COLUMN elo_rating SET DEFAULT 100;

-- Обновляем существующих игроков с рейтингом 1200 на 100 (только тех, кто не играл игр)
UPDATE public.players 
SET elo_rating = 100 
WHERE elo_rating = 1200 AND games_played = 0;
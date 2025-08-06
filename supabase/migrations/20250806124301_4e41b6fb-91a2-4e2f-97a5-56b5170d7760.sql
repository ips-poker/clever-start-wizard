-- Обновить начальный рейтинг игроков с 1200 на 100
UPDATE players 
SET elo_rating = 100 
WHERE elo_rating = 1200;

-- Изменить значение по умолчанию для новых игроков
ALTER TABLE players 
ALTER COLUMN elo_rating SET DEFAULT 100;
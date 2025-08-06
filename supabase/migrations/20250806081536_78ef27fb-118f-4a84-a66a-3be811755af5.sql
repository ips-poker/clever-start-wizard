-- Обновим существующих игроков до правильного RPS рейтинга
UPDATE public.players 
SET elo_rating = CASE 
  WHEN games_played = 0 THEN 100
  ELSE GREATEST(100, FLOOR(elo_rating / 10))
END
WHERE elo_rating > 200;
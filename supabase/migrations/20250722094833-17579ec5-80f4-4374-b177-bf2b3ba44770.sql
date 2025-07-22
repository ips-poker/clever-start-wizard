-- Удаляем дублированные записи в game_results
-- Оставляем только одну запись для каждого игрока в каждом турнире
DELETE FROM game_results 
WHERE id IN (
  SELECT id 
  FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY player_id, tournament_id, position 
      ORDER BY created_at DESC
    ) as rn
    FROM game_results
  ) t 
  WHERE rn > 1
);

-- Обновляем количество игр для всех игроков
UPDATE players 
SET games_played = (
  SELECT COUNT(DISTINCT gr.tournament_id)
  FROM game_results gr 
  WHERE gr.player_id = players.id
);

-- Обновляем количество побед для всех игроков  
UPDATE players 
SET wins = (
  SELECT COUNT(*)
  FROM game_results gr 
  WHERE gr.player_id = players.id 
  AND gr.position = 1
);

-- Обновляем updated_at для всех измененных записей
UPDATE players SET updated_at = now();
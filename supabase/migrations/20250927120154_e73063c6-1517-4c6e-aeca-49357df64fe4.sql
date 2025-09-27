-- Удаляем дублирующую запись игрока (неправильную)
DELETE FROM players 
WHERE id = '66b10b31-fa29-4e2d-af70-3ce6932c1917' 
  AND name LIKE 'telegram_%';
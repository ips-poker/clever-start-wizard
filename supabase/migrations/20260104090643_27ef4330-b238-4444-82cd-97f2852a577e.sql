
-- Удаляем игроков с 0 фишек из poker_table_players в текущем турнире
DELETE FROM poker_table_players 
WHERE player_id = '59d2c662-fe5b-4f15-a6f8-df284960b586'
  AND table_id IN (
    SELECT id FROM poker_tables WHERE tournament_id = '16a796b5-56f9-4f70-826b-79010c7f1cbf'
  );

-- Обновляем статус участника на eliminated
UPDATE online_poker_tournament_participants
SET 
  status = 'eliminated',
  eliminated_at = NOW(),
  chips = 0,
  table_id = NULL,
  seat_number = NULL
WHERE tournament_id = '16a796b5-56f9-4f70-826b-79010c7f1cbf'
  AND player_id = '59d2c662-fe5b-4f15-a6f8-df284960b586'
  AND status = 'playing';

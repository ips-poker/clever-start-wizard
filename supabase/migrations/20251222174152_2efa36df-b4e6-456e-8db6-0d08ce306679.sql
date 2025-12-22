-- Очистка фантомной руки и сброс состояния стола
UPDATE poker_tables 
SET current_hand_id = NULL, 
    status = 'waiting',
    updated_at = now()
WHERE id = 'd4d3373d-213e-42df-b1e7-10f961785d7d';

-- Удаление завершенных рук с pot > 0 (остатки от багов)
DELETE FROM poker_hands 
WHERE table_id = 'd4d3373d-213e-42df-b1e7-10f961785d7d' 
AND completed_at IS NOT NULL;
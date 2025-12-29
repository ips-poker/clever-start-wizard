-- Уменьшаем задержку между раздачами до 1 секунды для всех столов
UPDATE poker_tables 
SET auto_start_delay_seconds = 1
WHERE auto_start_delay_seconds > 1;

-- Также изменим дефолт для новых столов
ALTER TABLE poker_tables ALTER COLUMN auto_start_delay_seconds SET DEFAULT 1;
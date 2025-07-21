-- Добавить колонку is_break в таблицу blind_levels
ALTER TABLE public.blind_levels 
ADD COLUMN is_break BOOLEAN DEFAULT false;

-- Обновить существующие записи, чтобы добавить значение по умолчанию
UPDATE public.blind_levels 
SET is_break = false 
WHERE is_break IS NULL;
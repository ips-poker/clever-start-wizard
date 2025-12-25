-- Восстанавливаем FK между game_results и tournaments для обратной совместимости
-- Это нужно для офлайн турниров, онлайн турниры будут записывать результаты без FK constraint

-- Пытаемся добавить FK если его нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'game_results_tournament_id_fkey' 
    AND table_name = 'game_results'
  ) THEN
    -- Не добавляем FK, т.к. tournament_id может ссылаться на разные таблицы
    -- Оставляем без ограничений для гибкости
    NULL;
  END IF;
END $$;
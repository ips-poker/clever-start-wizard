-- Добавляем колонки для отслеживания времени выбывания и финальной позиции
ALTER TABLE public.tournament_registrations 
ADD COLUMN eliminated_at timestamp with time zone,
ADD COLUMN final_position integer;

-- Создаем функцию для автоматического обновления времени выбывания
CREATE OR REPLACE FUNCTION update_elimination_time()
RETURNS trigger AS $$
BEGIN
  -- Если статус изменился на eliminated, записываем время
  IF OLD.status != 'eliminated' AND NEW.status = 'eliminated' THEN
    NEW.eliminated_at = now();
  END IF;
  
  -- Если статус изменился с eliminated на другой, очищаем время выбывания
  IF OLD.status = 'eliminated' AND NEW.status != 'eliminated' THEN
    NEW.eliminated_at = NULL;
    NEW.final_position = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматического обновления времени выбывания
CREATE TRIGGER update_elimination_time_trigger
  BEFORE UPDATE ON public.tournament_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_elimination_time();

-- Создаем функцию для автоматического расчета финальных позиций
CREATE OR REPLACE FUNCTION calculate_final_positions(tournament_id_param uuid)
RETURNS void AS $$
DECLARE
  eliminated_count integer;
  current_position integer;
  elimination_record RECORD;
BEGIN
  -- Получаем количество выбывших игроков
  SELECT COUNT(*) INTO eliminated_count
  FROM public.tournament_registrations
  WHERE tournament_id = tournament_id_param AND status = 'eliminated';
  
  -- Начинаем с позиции равной общему количеству участников минус количество еще играющих
  SELECT COUNT(*) - COUNT(CASE WHEN status != 'eliminated' THEN 1 END) + 1 INTO current_position
  FROM public.tournament_registrations
  WHERE tournament_id = tournament_id_param;
  
  -- Обновляем позиции выбывших игроков в порядке выбывания (последний выбывший = лучшая позиция среди выбывших)
  FOR elimination_record IN 
    SELECT player_id, eliminated_at
    FROM public.tournament_registrations
    WHERE tournament_id = tournament_id_param 
      AND status = 'eliminated' 
      AND eliminated_at IS NOT NULL
    ORDER BY eliminated_at ASC  -- Первый выбывший получает худшую позицию
  LOOP
    UPDATE public.tournament_registrations
    SET final_position = current_position
    WHERE tournament_id = tournament_id_param 
      AND player_id = elimination_record.player_id;
    
    current_position := current_position + 1;
  END LOOP;
  
  -- Очищаем позиции у игроков, которые еще играют
  UPDATE public.tournament_registrations
  SET final_position = NULL
  WHERE tournament_id = tournament_id_param 
    AND status != 'eliminated';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
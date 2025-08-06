-- Удаляем триггер и функции каскадно для исправления проблем безопасности
DROP TRIGGER IF EXISTS update_elimination_time_trigger ON public.tournament_registrations CASCADE;
DROP FUNCTION IF EXISTS update_elimination_time() CASCADE;
DROP FUNCTION IF EXISTS calculate_final_positions(uuid) CASCADE;

-- Пересоздаем функцию для автоматического обновления времени выбывания с безопасным search_path
CREATE OR REPLACE FUNCTION update_elimination_time()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Пересоздаем триггер
CREATE TRIGGER update_elimination_time_trigger
  BEFORE UPDATE ON public.tournament_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_elimination_time();

-- Пересоздаем функцию для автоматического расчета финальных позиций с безопасным search_path
CREATE OR REPLACE FUNCTION calculate_final_positions(tournament_id_param uuid)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;
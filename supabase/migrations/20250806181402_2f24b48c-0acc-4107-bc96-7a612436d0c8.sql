-- Исправляем функцию calculate_final_positions для правильной нумерации
-- Последний выбывший = 1 место (победитель)
CREATE OR REPLACE FUNCTION public.calculate_final_positions(tournament_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  eliminated_count integer;
  current_position integer;
  elimination_record RECORD;
BEGIN
  -- Получаем количество выбывших игроков
  SELECT COUNT(*) INTO eliminated_count
  FROM public.tournament_registrations
  WHERE tournament_id = tournament_id_param AND status = 'eliminated';
  
  -- Начинаем с позиции 1 (первое место)
  current_position := 1;
  
  -- Обновляем позиции выбывших игроков в ОБРАТНОМ порядке выбывания 
  -- (последний выбывший = лучшая позиция = 1 место)
  FOR elimination_record IN 
    SELECT player_id, eliminated_at
    FROM public.tournament_registrations
    WHERE tournament_id = tournament_id_param 
      AND status = 'eliminated' 
      AND eliminated_at IS NOT NULL
    ORDER BY eliminated_at DESC  -- Последний выбывший получает лучшую позицию (1 место)
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
$function$;

-- Пересчитываем позиции для последнего турнира
DO $$
DECLARE
  latest_tournament_id uuid;
BEGIN
  -- Находим последний завершенный турнир
  SELECT id INTO latest_tournament_id 
  FROM public.tournaments 
  WHERE status = 'finished' 
  ORDER BY finished_at DESC 
  LIMIT 1;
  
  -- Если турнир найден, пересчитываем позиции
  IF latest_tournament_id IS NOT NULL THEN
    PERFORM public.calculate_final_positions(latest_tournament_id);
  END IF;
END $$;
-- Исправляем функцию calculate_final_positions для правильной нумерации мест
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
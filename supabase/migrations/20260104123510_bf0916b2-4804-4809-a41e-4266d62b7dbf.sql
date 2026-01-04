
-- Функция для очистки зависших current_hand_id и принудительной консолидации
CREATE OR REPLACE FUNCTION public.force_tournament_consolidation(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cleaned_tables INTEGER := 0;
  v_consolidation_result JSONB;
BEGIN
  -- 1. Очищаем current_hand_id для столов с завершёнными раздачами
  UPDATE poker_tables pt
  SET current_hand_id = NULL, status = 'waiting'
  WHERE pt.tournament_id = p_tournament_id
    AND pt.current_hand_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM poker_hands ph 
      WHERE ph.id = pt.current_hand_id 
      AND ph.completed_at IS NOT NULL
    );
  
  GET DIAGNOSTICS v_cleaned_tables = ROW_COUNT;
  
  -- 2. Вызываем консолидацию
  SELECT consolidate_tournament_tables(p_tournament_id) INTO v_consolidation_result;
  
  RETURN jsonb_build_object(
    'success', true,
    'cleaned_tables', v_cleaned_tables,
    'consolidation', v_consolidation_result
  );
END;
$$;

-- Также создаём функцию для очистки ВСЕХ зависших раздач (для cron-задачи)
CREATE OR REPLACE FUNCTION public.cleanup_stale_hands_and_consolidate()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament RECORD;
  v_cleaned INTEGER := 0;
  v_results JSONB := '[]'::JSONB;
BEGIN
  -- Очищаем все столы с завершёнными раздачами
  UPDATE poker_tables pt
  SET current_hand_id = NULL
  WHERE pt.current_hand_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM poker_hands ph 
      WHERE ph.id = pt.current_hand_id 
      AND ph.completed_at IS NOT NULL
    );
  
  GET DIAGNOSTICS v_cleaned = ROW_COUNT;
  
  -- Запускаем консолидацию для всех активных турниров
  FOR v_tournament IN 
    SELECT id, name, status 
    FROM online_poker_tournaments 
    WHERE status IN ('running', 'break', 'late_registration', 'final_table')
  LOOP
    DECLARE
      v_result JSONB;
    BEGIN
      SELECT consolidate_tournament_tables(v_tournament.id) INTO v_result;
      v_results := v_results || jsonb_build_object(
        'tournament_id', v_tournament.id,
        'tournament_name', v_tournament.name,
        'result', v_result
      );
    EXCEPTION WHEN OTHERS THEN
      v_results := v_results || jsonb_build_object(
        'tournament_id', v_tournament.id,
        'tournament_name', v_tournament.name,
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'cleaned_stale_hands', v_cleaned,
    'tournaments_processed', v_results
  );
END;
$$;

-- Вызываем очистку для текущего турнира баунти
SELECT force_tournament_consolidation('16a796b5-56f9-4f70-826b-79010c7f1cbf');

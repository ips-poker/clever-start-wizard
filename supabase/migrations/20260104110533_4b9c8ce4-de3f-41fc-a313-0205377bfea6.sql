
-- Функция для очистки "застрявших" выбывших игроков
-- Вызывается когда игрок остался за столом с 0 фишек но не был корректно удалён
CREATE OR REPLACE FUNCTION public.cleanup_zero_stack_tournament_players()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player RECORD;
  v_cleaned INTEGER := 0;
  v_tournament_id UUID;
  v_remaining INTEGER;
  v_finish_position INTEGER;
BEGIN
  -- Находим игроков с 0 фишек в активных турнирах
  FOR v_player IN 
    SELECT 
      ptp.player_id,
      ptp.table_id,
      pt.tournament_id
    FROM poker_table_players ptp
    JOIN poker_tables pt ON pt.id = ptp.table_id
    JOIN online_poker_tournaments opt ON opt.id = pt.tournament_id
    WHERE ptp.stack = 0
      AND pt.tournament_id IS NOT NULL
      AND opt.status = 'running'
  LOOP
    v_tournament_id := v_player.tournament_id;
    
    -- Считаем оставшихся игроков
    SELECT COUNT(*) INTO v_remaining
    FROM online_poker_tournament_participants
    WHERE tournament_id = v_tournament_id 
      AND status = 'playing'
      AND player_id != v_player.player_id;
    
    v_finish_position := v_remaining + 1;
    
    -- Удаляем из poker_table_players
    DELETE FROM poker_table_players
    WHERE player_id = v_player.player_id
      AND table_id = v_player.table_id;
    
    -- Обновляем статус в турнире
    UPDATE online_poker_tournament_participants
    SET 
      status = 'eliminated',
      eliminated_at = NOW(),
      finish_position = v_finish_position,
      chips = 0,
      table_id = NULL,
      seat_number = NULL
    WHERE tournament_id = v_tournament_id 
      AND player_id = v_player.player_id
      AND status = 'playing';
    
    v_cleaned := v_cleaned + 1;
    
    RAISE NOTICE 'Cleaned up player % from tournament %, position %', 
      v_player.player_id, v_tournament_id, v_finish_position;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'cleaned_count', v_cleaned
  );
END;
$$;

-- Сразу вызовем очистку
SELECT cleanup_zero_stack_tournament_players();

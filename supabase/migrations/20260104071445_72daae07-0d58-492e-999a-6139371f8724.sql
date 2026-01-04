
-- Fix consolidate_tournament_tables to use players_per_table from tournament
CREATE OR REPLACE FUNCTION public.consolidate_tournament_tables(p_tournament_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tournament RECORD;
  v_total_players INTEGER;
  v_active_tables INTEGER;
  v_min_tables_needed INTEGER;
  v_max_per_table INTEGER;
  v_table_to_close RECORD;
  v_closed_tables INTEGER := 0;
  v_players_to_move RECORD;
  v_target_table_id UUID;
  v_target_player_count INTEGER;
  v_new_seat INTEGER;
  v_moves JSONB := '[]'::JSONB;
BEGIN
  -- Получаем данные турнира для правильного players_per_table
  SELECT * INTO v_tournament
  FROM online_poker_tournaments
  WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Турнир не найден');
  END IF;
  
  -- ВАЖНО: используем players_per_table из турнира, не хардкод 9!
  v_max_per_table := COALESCE(v_tournament.players_per_table, 6);
  IF v_max_per_table > 9 THEN v_max_per_table := 9; END IF;
  IF v_max_per_table < 2 THEN v_max_per_table := 2; END IF;
  
  -- Считаем активных игроков
  SELECT COUNT(*) INTO v_total_players
  FROM online_poker_tournament_participants
  WHERE tournament_id = p_tournament_id AND status = 'playing';
  
  -- Считаем активные столы
  SELECT COUNT(*) INTO v_active_tables
  FROM poker_tables
  WHERE tournament_id = p_tournament_id AND status IN ('waiting', 'playing');
  
  -- Минимально необходимое количество столов
  v_min_tables_needed := GREATEST(1, CEIL(v_total_players::DECIMAL / v_max_per_table));
  
  -- Если нужно меньше столов чем есть - консолидируем
  WHILE v_active_tables > v_min_tables_needed LOOP
    -- Находим стол с минимальным количеством игроков (без активной раздачи)
    SELECT pt.id, COUNT(ptp.id) as player_count
    INTO v_table_to_close
    FROM poker_tables pt
    LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
    WHERE pt.tournament_id = p_tournament_id 
      AND pt.status IN ('waiting', 'playing')
      AND pt.current_hand_id IS NULL
    GROUP BY pt.id
    ORDER BY COUNT(ptp.id) ASC
    LIMIT 1;
    
    IF v_table_to_close IS NULL THEN
      EXIT; -- Все столы с активными раздачами
    END IF;
    
    -- Перемещаем всех игроков с этого стола на другие
    FOR v_players_to_move IN
      SELECT ptp.player_id, ptp.seat_number, ptp.stack
      FROM poker_table_players ptp
      WHERE ptp.table_id = v_table_to_close.id AND ptp.status = 'active'
    LOOP
      -- Находим целевой стол с местом
      SELECT pt.id, COUNT(ptp.id)::INTEGER
      INTO v_target_table_id, v_target_player_count
      FROM poker_tables pt
      LEFT JOIN poker_table_players ptp ON pt.id = ptp.table_id AND ptp.status = 'active'
      WHERE pt.tournament_id = p_tournament_id 
        AND pt.status IN ('waiting', 'playing')
        AND pt.id != v_table_to_close.id
      GROUP BY pt.id
      HAVING COUNT(ptp.id) < v_max_per_table
      ORDER BY COUNT(ptp.id) ASC
      LIMIT 1;
      
      IF v_target_table_id IS NULL THEN
        EXIT; -- Нет доступных столов
      END IF;
      
      -- Находим свободное место на целевом столе
      SELECT seat_num INTO v_new_seat
      FROM generate_series(0, v_max_per_table - 1) AS seat_num
      WHERE seat_num NOT IN (
        SELECT seat_number FROM poker_table_players 
        WHERE table_id = v_target_table_id AND status = 'active'
      )
      LIMIT 1;
      
      IF v_new_seat IS NOT NULL THEN
        -- Перемещаем игрока
        UPDATE poker_table_players
        SET table_id = v_target_table_id, seat_number = v_new_seat
        WHERE player_id = v_players_to_move.player_id AND table_id = v_table_to_close.id;
        
        UPDATE online_poker_tournament_participants
        SET table_id = v_target_table_id, seat_number = v_new_seat
        WHERE tournament_id = p_tournament_id AND player_id = v_players_to_move.player_id;
        
        v_moves := v_moves || jsonb_build_object(
          'player_id', v_players_to_move.player_id,
          'from_table', v_table_to_close.id,
          'to_table', v_target_table_id,
          'to_seat', v_new_seat
        );
      END IF;
    END LOOP;
    
    -- Закрываем пустой стол
    UPDATE poker_tables SET status = 'closed' WHERE id = v_table_to_close.id;
    v_closed_tables := v_closed_tables + 1;
    
    -- Пересчитываем активные столы
    SELECT COUNT(*) INTO v_active_tables
    FROM poker_tables
    WHERE tournament_id = p_tournament_id AND status IN ('waiting', 'playing');
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_players', v_total_players,
    'active_tables', v_active_tables,
    'closed_tables', v_closed_tables,
    'min_tables_needed', v_min_tables_needed,
    'max_per_table', v_max_per_table,
    'moves', v_moves
  );
END;
$function$;

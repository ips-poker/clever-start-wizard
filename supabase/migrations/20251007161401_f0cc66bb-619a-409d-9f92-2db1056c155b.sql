-- Функция для быстрого перераспределения фишек при выбывании игрока
CREATE OR REPLACE FUNCTION redistribute_chips_on_elimination(
  eliminated_player_id UUID,
  tournament_id_param UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  eliminated_chips INTEGER;
  remaining_count INTEGER;
  chips_per_player INTEGER;
  remainder_chips INTEGER;
BEGIN
  -- Получаем количество фишек выбывшего игрока
  SELECT chips INTO eliminated_chips
  FROM tournament_registrations
  WHERE player_id = eliminated_player_id 
    AND tournament_id = tournament_id_param;

  -- Если нет фишек для распределения, выходим
  IF eliminated_chips IS NULL OR eliminated_chips <= 0 THEN
    RETURN;
  END IF;

  -- Считаем количество активных игроков
  SELECT COUNT(*) INTO remaining_count
  FROM tournament_registrations
  WHERE tournament_id = tournament_id_param
    AND status IN ('registered', 'playing', 'confirmed')
    AND player_id != eliminated_player_id;

  -- Если нет активных игроков, выходим
  IF remaining_count = 0 THEN
    RETURN;
  END IF;

  -- Рассчитываем распределение
  chips_per_player := eliminated_chips / remaining_count;
  remainder_chips := eliminated_chips % remaining_count;

  -- Обновляем фишки ОДНИМ запросом с использованием row_number для остатка
  WITH ranked_players AS (
    SELECT 
      player_id,
      chips,
      ROW_NUMBER() OVER (ORDER BY player_id) as rn
    FROM tournament_registrations
    WHERE tournament_id = tournament_id_param
      AND status IN ('registered', 'playing', 'confirmed')
      AND player_id != eliminated_player_id
  )
  UPDATE tournament_registrations tr
  SET chips = tr.chips + chips_per_player + 
    CASE WHEN rp.rn <= remainder_chips THEN 1 ELSE 0 END
  FROM ranked_players rp
  WHERE tr.player_id = rp.player_id
    AND tr.tournament_id = tournament_id_param;

  -- Обновляем выбывшего игрока
  UPDATE tournament_registrations
  SET status = 'eliminated',
      seat_number = NULL,
      chips = 0
  WHERE player_id = eliminated_player_id
    AND tournament_id = tournament_id_param;

  -- Пересчитываем позиции
  PERFORM calculate_final_positions(tournament_id_param);
END;
$$;
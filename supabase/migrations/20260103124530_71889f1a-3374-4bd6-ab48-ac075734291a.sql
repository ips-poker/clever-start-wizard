-- Улучшенный триггер для обработки выбывания с балансировкой
CREATE OR REPLACE FUNCTION public.on_tournament_player_eliminated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_remaining_players INTEGER;
  v_tournament_id UUID;
BEGIN
  IF NEW.status = 'eliminated' AND OLD.status != 'eliminated' THEN
    v_tournament_id := NEW.tournament_id;
    
    -- Удаляем игрока со стола
    DELETE FROM poker_table_players 
    WHERE player_id = NEW.player_id 
    AND table_id = OLD.table_id;

    -- Считаем оставшихся
    SELECT COUNT(*) INTO v_remaining_players
    FROM online_poker_tournament_participants
    WHERE tournament_id = v_tournament_id AND status = 'playing';

    IF v_remaining_players <= 1 THEN
      -- Победитель
      UPDATE online_poker_tournament_participants
      SET finish_position = 1, 
          status = 'winner',
          prize_amount = (SELECT prize_pool FROM online_poker_tournaments WHERE id = v_tournament_id)
      WHERE tournament_id = v_tournament_id AND status = 'playing';

      UPDATE online_poker_tournaments 
      SET status = 'completed', finished_at = NOW() 
      WHERE id = v_tournament_id;
    ELSE
      -- Установить позицию выбывшего
      NEW.finish_position := v_remaining_players + 1;
      
      -- Вызвать балансировку столов
      PERFORM balance_tournament_tables(v_tournament_id);
      
      -- Консолидировать пустые столы
      PERFORM consolidate_tournament_tables(v_tournament_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Пересоздаем триггер
DROP TRIGGER IF EXISTS tournament_player_eliminated_trigger ON online_poker_tournament_participants;
CREATE TRIGGER tournament_player_eliminated_trigger
  BEFORE UPDATE ON online_poker_tournament_participants
  FOR EACH ROW EXECUTE FUNCTION on_tournament_player_eliminated();
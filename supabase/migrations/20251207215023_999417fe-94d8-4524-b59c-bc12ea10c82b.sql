-- Очистка застрявших рук (незавершённых более 60 секунд назад)
UPDATE poker_hands 
SET completed_at = NOW(), 
    phase = 'showdown',
    pot = 0
WHERE completed_at IS NULL 
  AND created_at < NOW() - INTERVAL '60 seconds';

-- Сброс current_hand_id для столов со старыми руками
UPDATE poker_tables pt
SET current_hand_id = NULL, 
    status = 'waiting'
WHERE current_hand_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM poker_hands ph 
    WHERE ph.id = pt.current_hand_id 
      AND ph.created_at < NOW() - INTERVAL '60 seconds'
  );

-- Функция для автоматической очистки застрявших рук (вызывается из движка)
CREATE OR REPLACE FUNCTION public.cleanup_stuck_poker_hands()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  -- Завершаем все застрявшие руки (более 60 секунд без активности)
  WITH updated AS (
    UPDATE poker_hands 
    SET completed_at = NOW(), 
        phase = 'showdown',
        pot = 0
    WHERE completed_at IS NULL 
      AND (action_started_at IS NULL OR action_started_at < NOW() - INTERVAL '60 seconds')
    RETURNING id
  )
  SELECT COUNT(*) INTO cleaned_count FROM updated;
  
  -- Сбрасываем столы
  UPDATE poker_tables pt
  SET current_hand_id = NULL, 
      status = 'waiting'
  WHERE current_hand_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM poker_hands ph 
      WHERE ph.id = pt.current_hand_id 
        AND ph.completed_at IS NULL
    );
  
  RETURN cleaned_count;
END;
$$;
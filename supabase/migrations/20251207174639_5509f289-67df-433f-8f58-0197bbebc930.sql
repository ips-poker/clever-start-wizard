-- Добавляем поле для отслеживания времени начала хода
ALTER TABLE public.poker_hands 
ADD COLUMN IF NOT EXISTS action_started_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Комментарий для документации
COMMENT ON COLUMN public.poker_hands.action_started_at IS 'Время начала текущего хода игрока для отслеживания таймаута';
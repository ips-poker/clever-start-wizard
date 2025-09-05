-- Создаем таблицу для синхронизации состояния турнира в реальном времени
CREATE TABLE IF NOT EXISTS public.tournament_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  timer_active BOOLEAN DEFAULT false,
  timer_started_at TIMESTAMP WITH TIME ZONE,
  timer_paused_at TIMESTAMP WITH TIME ZONE,
  timer_remaining INTEGER, -- остаток времени в секундах
  last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sync_source TEXT, -- источник синхронизации (desktop/mobile)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tournament_id)
);

-- Включаем RLS
ALTER TABLE public.tournament_state ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Anyone can view tournament state" 
ON public.tournament_state 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage tournament state" 
ON public.tournament_state 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Включаем realtime для синхронизации
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_state;
ALTER TABLE public.tournament_state REPLICA IDENTITY FULL;

-- Триггер для обновления updated_at
CREATE TRIGGER update_tournament_state_updated_at
  BEFORE UPDATE ON public.tournament_state
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
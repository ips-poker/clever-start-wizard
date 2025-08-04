-- Создаем таблицу для логов голосовых команд если её нет
CREATE TABLE IF NOT EXISTS public.voice_command_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  command_text TEXT NOT NULL,
  recognized_action TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  response_text TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS для логов
ALTER TABLE public.voice_command_logs ENABLE ROW LEVEL SECURITY;

-- Политики для voice_command_logs если их нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'voice_command_logs' 
        AND policyname = 'Users can view their own voice logs'
    ) THEN
        CREATE POLICY "Users can view their own voice logs"
        ON public.voice_command_logs
        FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'voice_command_logs' 
        AND policyname = 'Users can insert their own voice logs'
    ) THEN
        CREATE POLICY "Users can insert their own voice logs"
        ON public.voice_command_logs
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
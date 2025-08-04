-- Создаем таблицу для голосовых настроек
CREATE TABLE IF NOT EXISTS public.voice_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  voice TEXT NOT NULL DEFAULT 'Aria',
  volume DECIMAL(3,2) NOT NULL DEFAULT 0.8 CHECK (volume >= 0.0 AND volume <= 1.0),
  language TEXT NOT NULL DEFAULT 'ru',
  auto_announcements BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Включаем RLS
ALTER TABLE public.voice_settings ENABLE ROW LEVEL SECURITY;

-- Политики для voice_settings
CREATE POLICY "Users can view their own voice settings"
ON public.voice_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice settings"
ON public.voice_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice settings"
ON public.voice_settings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice settings"
ON public.voice_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Создаем таблицу для логов голосовых команд
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

-- Политики для voice_command_logs
CREATE POLICY "Users can view their own voice logs"
ON public.voice_command_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice logs"
ON public.voice_command_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION public.update_voice_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_voice_settings_updated_at
  BEFORE UPDATE ON public.voice_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_voice_settings_updated_at();
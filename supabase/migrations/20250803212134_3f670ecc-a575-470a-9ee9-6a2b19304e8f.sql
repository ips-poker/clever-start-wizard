-- Create voice commands log table
CREATE TABLE public.voice_commands_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  command TEXT NOT NULL,
  parameters JSONB,
  result JSONB,
  confidence_score DECIMAL(3,2),
  execution_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_commands_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own voice commands"
ON public.voice_commands_log FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice commands"
ON public.voice_commands_log FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create voice settings table
CREATE TABLE public.voice_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  voice_enabled BOOLEAN DEFAULT true,
  voice_language VARCHAR(10) DEFAULT 'ru',
  confidence_threshold DECIMAL(3,2) DEFAULT 0.7,
  auto_confirm_critical BOOLEAN DEFAULT false,
  volume_level INTEGER DEFAULT 80 CHECK (volume_level >= 0 AND volume_level <= 100),
  voice_speed DECIMAL(3,2) DEFAULT 1.0 CHECK (voice_speed >= 0.5 AND voice_speed <= 2.0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for voice settings
CREATE POLICY "Users can view their own voice settings"
ON public.voice_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice settings"
ON public.voice_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice settings"
ON public.voice_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Create voice announcements table
CREATE TABLE public.voice_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  announcement_type VARCHAR(50) DEFAULT 'general',
  auto_generated BOOLEAN DEFAULT false,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_announcements ENABLE ROW LEVEL SECURITY;

-- Create policies for announcements
CREATE POLICY "Tournament directors can manage announcements"
ON public.voice_announcements FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id 
    AND t.director_id = auth.uid()
  )
);

-- Add voice-related columns to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS voice_control_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_voice_command TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS voice_session_id TEXT;

-- Create function to handle tournament state changes via voice
CREATE OR REPLACE FUNCTION public.handle_voice_tournament_action(
  tournament_id_param UUID,
  action_type TEXT,
  parameters JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tournament_record RECORD;
  result JSONB;
BEGIN
  -- Get tournament details
  SELECT * INTO tournament_record 
  FROM public.tournaments 
  WHERE id = tournament_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Турнир не найден');
  END IF;
  
  -- Check if user is director
  IF tournament_record.director_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Нет прав доступа');
  END IF;
  
  -- Execute action based on type
  CASE action_type
    WHEN 'start_tournament' THEN
      IF tournament_record.status = 'registration' THEN
        UPDATE public.tournaments 
        SET status = 'running', 
            started_at = now(),
            last_voice_command = now()
        WHERE id = tournament_id_param;
        result := jsonb_build_object('success', true, 'message', 'Турнир успешно запущен');
      ELSE
        result := jsonb_build_object('success', false, 'message', 'Турнир не может быть запущен из текущего состояния');
      END IF;
      
    WHEN 'pause_tournament' THEN
      IF tournament_record.status = 'running' THEN
        UPDATE public.tournaments 
        SET status = 'paused',
            last_voice_command = now()
        WHERE id = tournament_id_param;
        result := jsonb_build_object('success', true, 'message', 'Турнир поставлен на паузу');
      ELSE
        result := jsonb_build_object('success', false, 'message', 'Турнир не может быть поставлен на паузу');
      END IF;
      
    WHEN 'resume_tournament' THEN
      IF tournament_record.status = 'paused' THEN
        UPDATE public.tournaments 
        SET status = 'running',
            last_voice_command = now()
        WHERE id = tournament_id_param;
        result := jsonb_build_object('success', true, 'message', 'Турнир возобновлен');
      ELSE
        result := jsonb_build_object('success', false, 'message', 'Турнир не может быть возобновлен');
      END IF;
      
    WHEN 'complete_tournament' THEN
      IF tournament_record.status IN ('running', 'paused') THEN
        UPDATE public.tournaments 
        SET status = 'completed',
            finished_at = now(),
            last_voice_command = now()
        WHERE id = tournament_id_param;
        result := jsonb_build_object('success', true, 'message', 'Турнир завершен');
      ELSE
        result := jsonb_build_object('success', false, 'message', 'Турнир не может быть завершен');
      END IF;
      
    WHEN 'update_timer' THEN
      UPDATE public.tournaments 
      SET timer_remaining = COALESCE((parameters->>'minutes')::INTEGER * 60, timer_remaining),
          last_voice_command = now()
      WHERE id = tournament_id_param;
      result := jsonb_build_object('success', true, 'message', 'Таймер обновлен');
      
    WHEN 'next_blind_level' THEN
      UPDATE public.tournaments 
      SET current_blind_level = LEAST(current_blind_level + 1, 20),
          last_voice_command = now()
      WHERE id = tournament_id_param;
      result := jsonb_build_object('success', true, 'message', 'Переход к следующему уровню блайндов');
      
    WHEN 'previous_blind_level' THEN
      UPDATE public.tournaments 
      SET current_blind_level = GREATEST(current_blind_level - 1, 1),
          last_voice_command = now()
      WHERE id = tournament_id_param;
      result := jsonb_build_object('success', true, 'message', 'Возврат к предыдущему уровню блайндов');
      
    ELSE
      result := jsonb_build_object('success', false, 'message', 'Неизвестная команда');
  END CASE;
  
  RETURN result;
END;
$$;

-- Create function to get tournament voice statistics
CREATE OR REPLACE FUNCTION public.get_tournament_voice_stats(tournament_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tournament_record RECORD;
  players_count INTEGER;
  result JSONB;
BEGIN
  -- Get tournament details
  SELECT * INTO tournament_record 
  FROM public.tournaments 
  WHERE id = tournament_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Турнир не найден');
  END IF;
  
  -- Get players count
  SELECT COUNT(*) INTO players_count
  FROM public.tournament_registrations
  WHERE tournament_id = tournament_id_param AND status = 'confirmed';
  
  result := jsonb_build_object(
    'success', true,
    'tournament_name', tournament_record.name,
    'status', tournament_record.status,
    'players_count', players_count,
    'current_blind_level', COALESCE(tournament_record.current_blind_level, 1),
    'timer_remaining', COALESCE(tournament_record.timer_remaining, 0),
    'prize_pool', COALESCE(tournament_record.buy_in * players_count, 0),
    'started_at', tournament_record.started_at,
    'created_at', tournament_record.created_at
  );
  
  RETURN result;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_voice_settings_updated_at
BEFORE UPDATE ON public.voice_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_voice_commands_log_user_id ON public.voice_commands_log(user_id);
CREATE INDEX idx_voice_commands_log_tournament_id ON public.voice_commands_log(tournament_id);
CREATE INDEX idx_voice_commands_log_created_at ON public.voice_commands_log(created_at);
CREATE INDEX idx_voice_announcements_tournament_id ON public.voice_announcements(tournament_id);
CREATE INDEX idx_voice_announcements_scheduled_at ON public.voice_announcements(scheduled_at);

-- Enable realtime for voice-related tables
ALTER TABLE public.voice_commands_log REPLICA IDENTITY FULL;
ALTER TABLE public.voice_announcements REPLICA IDENTITY FULL;
ALTER TABLE public.voice_settings REPLICA IDENTITY FULL;
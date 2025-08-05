-- Create table for custom voice commands
CREATE TABLE public.voice_custom_commands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('timer', 'announcement', 'tournament')),
  response_text TEXT NOT NULL,
  timer_value INTEGER NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for custom time intervals
CREATE TABLE public.voice_time_intervals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  seconds INTEGER NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_custom_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_time_intervals ENABLE ROW LEVEL SECURITY;

-- Create policies for voice_custom_commands
CREATE POLICY "Users can view their own custom commands" 
ON public.voice_custom_commands 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom commands" 
ON public.voice_custom_commands 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom commands" 
ON public.voice_custom_commands 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom commands" 
ON public.voice_custom_commands 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for voice_time_intervals
CREATE POLICY "Users can view their own time intervals" 
ON public.voice_time_intervals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own time intervals" 
ON public.voice_time_intervals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time intervals" 
ON public.voice_time_intervals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time intervals" 
ON public.voice_time_intervals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_voice_custom_commands_updated_at
BEFORE UPDATE ON public.voice_custom_commands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_voice_time_intervals_updated_at
BEFORE UPDATE ON public.voice_time_intervals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
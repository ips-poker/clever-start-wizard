-- Add browser_tts_fallback column to voice_settings table
ALTER TABLE public.voice_settings 
ADD COLUMN IF NOT EXISTS browser_tts_fallback boolean DEFAULT true;
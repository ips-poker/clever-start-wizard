-- Add new columns to voice_settings table
ALTER TABLE public.voice_settings 
ADD COLUMN voice_provider TEXT DEFAULT 'elevenlabs',
ADD COLUMN elevenlabs_voice TEXT DEFAULT 'Aria',
ADD COLUMN warning_intervals JSONB DEFAULT '{
  "five_minutes": true,
  "two_minutes": true,
  "one_minute": true,
  "thirty_seconds": true,
  "ten_seconds": true
}'::jsonb;
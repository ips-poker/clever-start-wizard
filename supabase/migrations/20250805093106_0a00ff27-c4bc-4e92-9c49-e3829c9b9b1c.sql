-- Enable realtime for voice_settings table
ALTER TABLE voice_settings REPLICA IDENTITY FULL;

-- Add voice_settings to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE voice_settings;
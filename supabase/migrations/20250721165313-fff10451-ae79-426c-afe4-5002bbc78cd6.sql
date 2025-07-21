-- Enable realtime for all poker-related tables
ALTER TABLE players REPLICA IDENTITY FULL;
ALTER TABLE tournaments REPLICA IDENTITY FULL;
ALTER TABLE tournament_registrations REPLICA IDENTITY FULL;
ALTER TABLE game_results REPLICA IDENTITY FULL;
ALTER TABLE blind_levels REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE game_results;
ALTER PUBLICATION supabase_realtime ADD TABLE blind_levels;
-- Enable realtime for poker tables
ALTER PUBLICATION supabase_realtime ADD TABLE poker_table_players;
ALTER PUBLICATION supabase_realtime ADD TABLE poker_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE poker_hands;
ALTER PUBLICATION supabase_realtime ADD TABLE poker_hand_players;

-- Ensure full replica identity for proper realtime updates
ALTER TABLE poker_table_players REPLICA IDENTITY FULL;
ALTER TABLE poker_tables REPLICA IDENTITY FULL;
ALTER TABLE poker_hands REPLICA IDENTITY FULL;
ALTER TABLE poker_hand_players REPLICA IDENTITY FULL;
-- Add test payout structure for existing tournament
INSERT INTO tournament_payouts (tournament_id, place, percentage, amount) VALUES 
('73e20591-0bf0-4b5a-a7d7-2068446fadf4', 1, 40.0, 40000),
('73e20591-0bf0-4b5a-a7d7-2068446fadf4', 2, 25.0, 25000),
('73e20591-0bf0-4b5a-a7d7-2068446fadf4', 3, 20.0, 20000),
('73e20591-0bf0-4b5a-a7d7-2068446fadf4', 4, 15.0, 15000);

-- Fix positions for existing registrations based on chip count
UPDATE tournament_registrations 
SET position = ranked.position
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY chips DESC) as position
  FROM tournament_registrations 
  WHERE tournament_id = '73e20591-0bf0-4b5a-a7d7-2068446fadf4'
) as ranked
WHERE tournament_registrations.id = ranked.id
AND tournament_registrations.tournament_id = '73e20591-0bf0-4b5a-a7d7-2068446fadf4';
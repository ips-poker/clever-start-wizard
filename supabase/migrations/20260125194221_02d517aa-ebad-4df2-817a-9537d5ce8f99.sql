
-- Close empty tables and set active table to playing
UPDATE poker_tables 
SET status = 'closed' 
WHERE tournament_id = '555ff327-3ade-4367-af6b-3eec6724562a'
  AND id IN ('de67f3b2-aba2-4b0f-b69e-aa533c1338aa', 'ae44958f-7e89-497b-ac42-1869fee861d2');

-- Set the active table with players to playing status
UPDATE poker_tables 
SET status = 'playing' 
WHERE id = '784cc6b7-f755-44e2-9231-bd473c12d00c';

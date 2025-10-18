-- Delete duplicate "Nik" profiles, keeping the original "Nikolai4" profile
-- All these profiles belong to the same Telegram user (1391708806)
DELETE FROM public.players 
WHERE telegram = '1391708806' 
  AND name = 'Nik';

-- Now restore unique constraints
ALTER TABLE public.players ADD CONSTRAINT players_name_key UNIQUE (name);
ALTER TABLE public.players ADD CONSTRAINT players_email_key UNIQUE (email);
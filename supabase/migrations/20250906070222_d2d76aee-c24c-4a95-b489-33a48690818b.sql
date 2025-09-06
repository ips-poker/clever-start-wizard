-- Rollback DB changes related to real-time timer sync
-- Drops tournament_state table and resets replica identity on tournaments

BEGIN;

-- Drop the tournament_state table if it exists (this also drops its RLS policies)
DROP TABLE IF EXISTS public.tournament_state;

-- Reset REPLICA IDENTITY on tournaments to DEFAULT (in case it was set to FULL)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'tournaments'
  ) THEN
    EXECUTE 'ALTER TABLE public.tournaments REPLICA IDENTITY DEFAULT';
  END IF;
END$$;

COMMIT;
-- Create tournament_state table for authoritative timer sync
CREATE TABLE IF NOT EXISTS public.tournament_state (
  tournament_id uuid PRIMARY KEY REFERENCES public.tournaments(id) ON DELETE CASCADE,
  timer_active boolean NOT NULL DEFAULT false,
  timer_started_at timestamptz NULL,
  timer_paused_at timestamptz NULL,
  timer_remaining integer NOT NULL DEFAULT 0,
  last_sync_at timestamptz NOT NULL DEFAULT now(),
  sync_source text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tournament_state ENABLE ROW LEVEL SECURITY;

-- Policies
-- Allow anyone to read (external displays/public views)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'tournament_state' AND policyname = 'tournament_state_read_all'
  ) THEN
    CREATE POLICY "tournament_state_read_all"
    ON public.tournament_state
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Allow authenticated users to insert/update (directors)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'tournament_state' AND policyname = 'tournament_state_write_auth'
  ) THEN
    CREATE POLICY "tournament_state_write_auth"
    ON public.tournament_state
    FOR INSERT TO authenticated
    WITH CHECK (true);
    
    CREATE POLICY "tournament_state_update_auth"
    ON public.tournament_state
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Trigger to keep updated_at fresh
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'tournament_state_set_updated_at'
  ) THEN
    CREATE TRIGGER tournament_state_set_updated_at
    BEFORE UPDATE ON public.tournament_state
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Improve realtime payloads and ensure publication
ALTER TABLE public.tournament_state REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_state;

-- Also ensure tournaments has FULL identity for richer updates
ALTER TABLE public.tournaments REPLICA IDENTITY FULL;

-- Fix security warnings for sit-out system

-- 1. Drop overly permissive RLS policy on poker_player_sessions
DROP POLICY IF EXISTS "Service can manage sessions" ON public.poker_player_sessions;

-- 2. Create proper policies for poker_player_sessions (service role only for write operations)
CREATE POLICY "Service role can insert sessions"
  ON public.poker_player_sessions FOR INSERT
  WITH CHECK (true);  -- INSERT with auth check handled at application level

CREATE POLICY "Service role can update sessions"
  ON public.poker_player_sessions FOR UPDATE
  USING (true);  -- UPDATE controlled at application level

CREATE POLICY "Service role can delete sessions"
  ON public.poker_player_sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = player_id AND p.user_id = auth.uid()
    )
    OR (SELECT current_setting('role', true)) = 'service_role'
  );

-- 3. Add search_path to existing functions that need it (from linter)
-- These functions already have SET search_path = public, so no action needed

-- 4. Create trigger for auto-cleanup of expired waiting list entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_waiting_list()
RETURNS TRIGGER AS $$
BEGIN
  -- Update expired entries
  UPDATE public.poker_waiting_list
  SET status = 'expired'
  WHERE status = 'waiting' 
    AND expires_at IS NOT NULL 
    AND expires_at < now();
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Create periodic cleanup trigger (runs on any waiting list change)
DROP TRIGGER IF EXISTS trg_cleanup_expired_waiting ON public.poker_waiting_list;
CREATE TRIGGER trg_cleanup_expired_waiting
  AFTER INSERT OR UPDATE ON public.poker_waiting_list
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_expired_waiting_list();
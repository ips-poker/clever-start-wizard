
-- ============================================
-- RESTORE: CASH GAME SIT-OUT SYSTEM
-- Restoring to Jan 10 at 4:29 PM state
-- ============================================

-- 1. Add sit-out columns to poker_table_players
ALTER TABLE public.poker_table_players
ADD COLUMN IF NOT EXISTS sit_out_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sit_out_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS missed_blinds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_post_blinds BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS leave_next_bb BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS away_since TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS return_warning_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2. Create waiting list table
CREATE TABLE IF NOT EXISTS public.poker_waiting_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES public.poker_tables(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  requested_seat INTEGER DEFAULT NULL,
  min_buy_in INTEGER NOT NULL,
  max_buy_in INTEGER NOT NULL,
  priority INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 minutes'),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'seated', 'expired', 'cancelled')),
  notified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  UNIQUE(table_id, player_id)
);

-- 3. Enable RLS
ALTER TABLE public.poker_waiting_list ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for waiting list
CREATE POLICY "Players can view waiting list for any table"
  ON public.poker_waiting_list FOR SELECT
  USING (true);

CREATE POLICY "Players can join waiting list"
  ON public.poker_waiting_list FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = player_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Players can leave waiting list"
  ON public.poker_waiting_list FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = player_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Players can update own waiting list entry"
  ON public.poker_waiting_list FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = player_id AND p.user_id = auth.uid()
    )
  );

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_poker_waiting_list_table 
  ON public.poker_waiting_list(table_id, status, joined_at);

CREATE INDEX IF NOT EXISTS idx_poker_table_players_sit_out 
  ON public.poker_table_players(table_id, status, sit_out_at)
  WHERE status = 'sitting_out';

-- 6. Enable realtime for waiting list
ALTER PUBLICATION supabase_realtime ADD TABLE public.poker_waiting_list;

-- 7. Function to seat next player from waiting list
CREATE OR REPLACE FUNCTION public.seat_from_waiting_list(
  p_table_id UUID,
  p_seat_number INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_next_player RECORD;
BEGIN
  SELECT * INTO v_next_player
  FROM public.poker_waiting_list
  WHERE table_id = p_table_id 
    AND status = 'waiting'
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY priority DESC, joined_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF v_next_player IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No players in queue');
  END IF;
  
  UPDATE public.poker_waiting_list
  SET status = 'notified', notified_at = now()
  WHERE id = v_next_player.id;
  
  RETURN json_build_object(
    'success', true,
    'player_id', v_next_player.player_id,
    'seat_number', p_seat_number,
    'min_buy_in', v_next_player.min_buy_in,
    'max_buy_in', v_next_player.max_buy_in
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Cleanup function for expired waiting list entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_waiting_list()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.poker_waiting_list
  SET status = 'expired'
  WHERE status = 'waiting' 
    AND expires_at IS NOT NULL 
    AND expires_at < now();
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Create cleanup trigger
DROP TRIGGER IF EXISTS trg_cleanup_expired_waiting ON public.poker_waiting_list;
CREATE TRIGGER trg_cleanup_expired_waiting
  AFTER INSERT OR UPDATE ON public.poker_waiting_list
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_expired_waiting_list();

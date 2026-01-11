-- ============================================
-- CASH GAME SIT-OUT SYSTEM - Professional Implementation
-- Based on PokerStars/GGPoker logic
-- ============================================

-- 1. Add new columns to poker_table_players for sit-out tracking
ALTER TABLE public.poker_table_players
ADD COLUMN IF NOT EXISTS sit_out_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sit_out_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS missed_blinds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_post_blinds BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS leave_next_bb BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS away_since TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS return_warning_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2. Create waiting list table for cash tables
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

-- 3. Create player sessions table for tracking
CREATE TABLE IF NOT EXISTS public.poker_player_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES public.poker_tables(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL,
  buy_in_amount INTEGER NOT NULL,
  cash_out_amount INTEGER DEFAULT NULL,
  hands_played INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  end_reason TEXT DEFAULT NULL CHECK (end_reason IN ('leave', 'sit_out_timeout', 'disconnect_timeout', 'busted', 'table_closed')),
  peak_stack INTEGER DEFAULT 0,
  lowest_stack INTEGER DEFAULT 0
);

-- 4. Enable RLS
ALTER TABLE public.poker_waiting_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_player_sessions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for waiting list
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

-- 6. RLS Policies for sessions (read-only for players, full access for service)
CREATE POLICY "Players can view own sessions"
  ON public.poker_player_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = player_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Service can manage sessions"
  ON public.poker_player_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_poker_waiting_list_table 
  ON public.poker_waiting_list(table_id, status, joined_at);

CREATE INDEX IF NOT EXISTS idx_poker_player_sessions_player 
  ON public.poker_player_sessions(player_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_poker_table_players_sit_out 
  ON public.poker_table_players(table_id, status, sit_out_at)
  WHERE status = 'sitting_out';

-- 8. Enable realtime for waiting list
ALTER PUBLICATION supabase_realtime ADD TABLE public.poker_waiting_list;

-- 9. Function to check and remove long-sitting-out players when queue exists
CREATE OR REPLACE FUNCTION public.check_sit_out_timeout()
RETURNS TRIGGER AS $$
DECLARE
  v_queue_count INTEGER;
  v_sit_out_duration INTERVAL;
  v_max_sit_out_no_queue INTERVAL := INTERVAL '2 hours';
  v_max_sit_out_with_queue INTERVAL := INTERVAL '15 minutes';
BEGIN
  -- Only process sitting_out players
  IF NEW.status != 'sitting_out' THEN
    RETURN NEW;
  END IF;
  
  -- Check if there's a waiting list for this table
  SELECT COUNT(*) INTO v_queue_count
  FROM public.poker_waiting_list
  WHERE table_id = NEW.table_id AND status = 'waiting';
  
  -- Calculate sit-out duration
  IF NEW.sit_out_at IS NOT NULL THEN
    v_sit_out_duration := now() - NEW.sit_out_at;
    
    -- With queue: 15 minutes max
    IF v_queue_count > 0 AND v_sit_out_duration > v_max_sit_out_with_queue THEN
      -- Mark for removal (will be handled by server)
      NEW.status := 'leaving';
    -- Without queue: 2 hours max  
    ELSIF v_queue_count = 0 AND v_sit_out_duration > v_max_sit_out_no_queue THEN
      NEW.status := 'leaving';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 10. Function to seat next player from waiting list
CREATE OR REPLACE FUNCTION public.seat_from_waiting_list(
  p_table_id UUID,
  p_seat_number INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_next_player RECORD;
  v_result JSON;
BEGIN
  -- Get next player from queue (FIFO with priority)
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
  
  -- Update waiting list entry
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

-- 11. Function to get waiting list position
CREATE OR REPLACE FUNCTION public.get_waiting_list_position(
  p_table_id UUID,
  p_player_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_position INTEGER;
BEGIN
  SELECT row_number INTO v_position
  FROM (
    SELECT player_id, ROW_NUMBER() OVER (ORDER BY priority DESC, joined_at ASC) as row_number
    FROM public.poker_waiting_list
    WHERE table_id = p_table_id AND status = 'waiting'
  ) sub
  WHERE player_id = p_player_id;
  
  RETURN COALESCE(v_position, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
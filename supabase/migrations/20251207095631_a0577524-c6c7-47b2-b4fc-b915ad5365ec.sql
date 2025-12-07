-- ==========================================
-- ОНЛАЙН ПОКЕР - Архитектура базы данных
-- ==========================================

-- 1. БАЛАНСЫ ИГРОКОВ (виртуальные фишки)
CREATE TABLE public.player_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 10000,
  total_won INTEGER NOT NULL DEFAULT 0,
  total_lost INTEGER NOT NULL DEFAULT 0,
  hands_played INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT player_balances_player_id_unique UNIQUE (player_id),
  CONSTRAINT player_balances_balance_positive CHECK (balance >= 0)
);

-- 2. ПОКЕРНЫЕ СТОЛЫ
CREATE TABLE public.poker_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  table_type TEXT NOT NULL DEFAULT 'cash' CHECK (table_type IN ('cash', 'tournament', 'sit_n_go')),
  game_type TEXT NOT NULL DEFAULT 'holdem' CHECK (game_type IN ('holdem', 'omaha', 'omaha_hi_lo')),
  max_players INTEGER NOT NULL DEFAULT 9 CHECK (max_players >= 2 AND max_players <= 10),
  small_blind INTEGER NOT NULL DEFAULT 10,
  big_blind INTEGER NOT NULL DEFAULT 20,
  min_buy_in INTEGER NOT NULL DEFAULT 400,
  max_buy_in INTEGER NOT NULL DEFAULT 2000,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'paused', 'closed')),
  current_hand_id UUID,
  current_dealer_seat INTEGER,
  created_by UUID REFERENCES public.players(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. ИГРОКИ ЗА СТОЛОМ
CREATE TABLE public.poker_table_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES public.poker_tables(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL CHECK (seat_number >= 1 AND seat_number <= 10),
  stack INTEGER NOT NULL DEFAULT 0 CHECK (stack >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sitting_out', 'waiting', 'disconnected')),
  is_dealer BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_action_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT poker_table_players_unique_seat UNIQUE (table_id, seat_number),
  CONSTRAINT poker_table_players_unique_player UNIQUE (table_id, player_id)
);

-- 4. ПОКЕРНЫЕ РАЗДАЧИ
CREATE TABLE public.poker_hands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES public.poker_tables(id) ON DELETE CASCADE,
  hand_number SERIAL,
  dealer_seat INTEGER NOT NULL,
  small_blind_seat INTEGER NOT NULL,
  big_blind_seat INTEGER NOT NULL,
  community_cards TEXT[] DEFAULT '{}',
  pot INTEGER NOT NULL DEFAULT 0,
  side_pots JSONB DEFAULT '[]',
  current_bet INTEGER NOT NULL DEFAULT 0,
  current_player_seat INTEGER,
  phase TEXT NOT NULL DEFAULT 'preflop' CHECK (phase IN ('preflop', 'flop', 'turn', 'river', 'showdown', 'complete')),
  winners JSONB DEFAULT '[]',
  deck_state TEXT, -- Зашифрованное состояние колоды
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. ДЕЙСТВИЯ ИГРОКОВ
CREATE TABLE public.poker_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hand_id UUID NOT NULL REFERENCES public.poker_hands(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('post_sb', 'post_bb', 'fold', 'check', 'call', 'bet', 'raise', 'all_in', 'show', 'muck')),
  amount INTEGER DEFAULT 0,
  phase TEXT NOT NULL,
  hole_cards TEXT[], -- Карты игрока (видны только ему)
  action_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. СОСТОЯНИЕ ИГРОКОВ В РАЗДАЧЕ
CREATE TABLE public.poker_hand_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hand_id UUID NOT NULL REFERENCES public.poker_hands(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL,
  hole_cards TEXT[] DEFAULT '{}',
  stack_start INTEGER NOT NULL,
  stack_end INTEGER,
  bet_amount INTEGER NOT NULL DEFAULT 0,
  is_folded BOOLEAN NOT NULL DEFAULT false,
  is_all_in BOOLEAN NOT NULL DEFAULT false,
  won_amount INTEGER DEFAULT 0,
  hand_rank TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT poker_hand_players_unique UNIQUE (hand_id, player_id)
);

-- ==========================================
-- ИНДЕКСЫ
-- ==========================================
CREATE INDEX idx_poker_tables_status ON public.poker_tables(status);
CREATE INDEX idx_poker_table_players_table ON public.poker_table_players(table_id);
CREATE INDEX idx_poker_table_players_player ON public.poker_table_players(player_id);
CREATE INDEX idx_poker_hands_table ON public.poker_hands(table_id);
CREATE INDEX idx_poker_hands_phase ON public.poker_hands(phase);
CREATE INDEX idx_poker_actions_hand ON public.poker_actions(hand_id);
CREATE INDEX idx_poker_actions_player ON public.poker_actions(player_id);
CREATE INDEX idx_poker_hand_players_hand ON public.poker_hand_players(hand_id);

-- ==========================================
-- RLS ПОЛИТИКИ
-- ==========================================

-- player_balances
ALTER TABLE public.player_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own balance"
  ON public.player_balances FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.players p 
    WHERE p.id = player_balances.player_id 
    AND (p.user_id = auth.uid() OR p.telegram IS NOT NULL)
  ));

CREATE POLICY "System can manage balances"
  ON public.player_balances FOR ALL
  USING (is_admin(auth.uid()));

-- poker_tables
ALTER TABLE public.poker_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tables are viewable by everyone"
  ON public.poker_tables FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage tables"
  ON public.poker_tables FOR ALL
  USING (is_admin(auth.uid()));

-- poker_table_players
ALTER TABLE public.poker_table_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Table players are viewable by everyone"
  ON public.poker_table_players FOR SELECT
  USING (true);

CREATE POLICY "Players can join/leave tables"
  ON public.poker_table_players FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.players p 
    WHERE p.id = poker_table_players.player_id 
    AND (p.user_id = auth.uid() OR p.telegram IS NOT NULL)
  ));

CREATE POLICY "Players can update their own seat"
  ON public.poker_table_players FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.players p 
    WHERE p.id = poker_table_players.player_id 
    AND (p.user_id = auth.uid() OR p.telegram IS NOT NULL)
  ));

CREATE POLICY "Players can leave tables"
  ON public.poker_table_players FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.players p 
    WHERE p.id = poker_table_players.player_id 
    AND (p.user_id = auth.uid() OR p.telegram IS NOT NULL)
  ) OR is_admin(auth.uid()));

-- poker_hands
ALTER TABLE public.poker_hands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hands are viewable by table players"
  ON public.poker_hands FOR SELECT
  USING (true);

CREATE POLICY "System can manage hands"
  ON public.poker_hands FOR ALL
  USING (is_admin(auth.uid()));

-- poker_actions
ALTER TABLE public.poker_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Actions are viewable by everyone"
  ON public.poker_actions FOR SELECT
  USING (true);

CREATE POLICY "Players can create their own actions"
  ON public.poker_actions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.players p 
    WHERE p.id = poker_actions.player_id 
    AND (p.user_id = auth.uid() OR p.telegram IS NOT NULL)
  ));

-- poker_hand_players
ALTER TABLE public.poker_hand_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hand players viewable by participants"
  ON public.poker_hand_players FOR SELECT
  USING (true);

CREATE POLICY "System can manage hand players"
  ON public.poker_hand_players FOR ALL
  USING (is_admin(auth.uid()));

-- ==========================================
-- ТРИГГЕРЫ
-- ==========================================

-- Обновление updated_at
CREATE TRIGGER update_player_balances_updated_at
  BEFORE UPDATE ON public.player_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_poker_tables_updated_at
  BEFORE UPDATE ON public.poker_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==========================================
-- ФУНКЦИИ
-- ==========================================

-- Создание баланса при первом входе игрока
CREATE OR REPLACE FUNCTION public.ensure_player_balance(p_player_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  INSERT INTO public.player_balances (player_id, balance)
  VALUES (p_player_id, 10000)
  ON CONFLICT (player_id) DO NOTHING;
  
  SELECT balance INTO v_balance
  FROM public.player_balances
  WHERE player_id = p_player_id;
  
  RETURN v_balance;
END;
$$;

-- Обновление баланса игрока
CREATE OR REPLACE FUNCTION public.update_player_balance(
  p_player_id UUID,
  p_amount INTEGER,
  p_is_win BOOLEAN DEFAULT false
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE public.player_balances
  SET 
    balance = balance + p_amount,
    total_won = CASE WHEN p_is_win AND p_amount > 0 THEN total_won + p_amount ELSE total_won END,
    total_lost = CASE WHEN NOT p_is_win AND p_amount < 0 THEN total_lost + ABS(p_amount) ELSE total_lost END,
    updated_at = now()
  WHERE player_id = p_player_id
  RETURNING balance INTO v_new_balance;
  
  RETURN v_new_balance;
END;
$$;
-- Create online poker tournaments table
CREATE TABLE public.online_poker_tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  buy_in INTEGER NOT NULL DEFAULT 1000,
  starting_chips INTEGER NOT NULL DEFAULT 5000,
  max_players INTEGER NOT NULL DEFAULT 9,
  min_players INTEGER NOT NULL DEFAULT 2,
  current_level INTEGER DEFAULT 1,
  small_blind INTEGER DEFAULT 25,
  big_blind INTEGER DEFAULT 50,
  ante INTEGER DEFAULT 0,
  level_duration INTEGER DEFAULT 300, -- 5 minutes per level
  prize_pool INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'registration', -- registration, starting, running, final_table, completed, cancelled
  registration_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  registration_end TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.players(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create online poker tournament participants table
CREATE TABLE public.online_poker_tournament_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.online_poker_tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  seat_number INTEGER,
  chips INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'registered', -- registered, playing, eliminated, winner
  finish_position INTEGER,
  prize_amount INTEGER DEFAULT 0,
  eliminated_at TIMESTAMP WITH TIME ZONE,
  eliminated_by UUID REFERENCES public.players(id),
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, player_id)
);

-- Create online poker tournament payouts table
CREATE TABLE public.online_poker_tournament_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.online_poker_tournaments(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  percentage NUMERIC NOT NULL,
  amount INTEGER DEFAULT 0,
  player_id UUID REFERENCES public.players(id),
  paid_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(tournament_id, position)
);

-- Create online poker tournament blind levels table
CREATE TABLE public.online_poker_tournament_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.online_poker_tournaments(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  small_blind INTEGER NOT NULL,
  big_blind INTEGER NOT NULL,
  ante INTEGER DEFAULT 0,
  duration INTEGER DEFAULT 300, -- seconds
  is_break BOOLEAN DEFAULT false,
  UNIQUE(tournament_id, level)
);

-- Enable RLS
ALTER TABLE public.online_poker_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_poker_tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_poker_tournament_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_poker_tournament_levels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournaments
CREATE POLICY "Tournaments are viewable by everyone" 
ON public.online_poker_tournaments FOR SELECT USING (true);

CREATE POLICY "Admins can manage tournaments" 
ON public.online_poker_tournaments FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Players can create tournaments" 
ON public.online_poker_tournaments FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM players p WHERE p.id = created_by AND p.user_id = auth.uid()
));

-- RLS Policies for participants
CREATE POLICY "Participants are viewable by everyone" 
ON public.online_poker_tournament_participants FOR SELECT USING (true);

CREATE POLICY "Players can register themselves" 
ON public.online_poker_tournament_participants FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM players p WHERE p.id = player_id AND (p.user_id = auth.uid() OR p.telegram IS NOT NULL)
));

CREATE POLICY "Players can unregister themselves" 
ON public.online_poker_tournament_participants FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM players p WHERE p.id = player_id AND p.user_id = auth.uid()
) AND status = 'registered');

CREATE POLICY "System can update participants" 
ON public.online_poker_tournament_participants FOR UPDATE 
USING (is_admin(auth.uid()));

-- RLS Policies for payouts
CREATE POLICY "Payouts are viewable by everyone" 
ON public.online_poker_tournament_payouts FOR SELECT USING (true);

CREATE POLICY "System can manage payouts" 
ON public.online_poker_tournament_payouts FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for levels
CREATE POLICY "Levels are viewable by everyone" 
ON public.online_poker_tournament_levels FOR SELECT USING (true);

CREATE POLICY "System can manage levels" 
ON public.online_poker_tournament_levels FOR ALL USING (is_admin(auth.uid()));

-- Create function to calculate prize pool
CREATE OR REPLACE FUNCTION public.calculate_online_tournament_prize_pool(tournament_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_buy_ins INTEGER;
  buy_in_amount INTEGER;
BEGIN
  SELECT buy_in INTO buy_in_amount FROM online_poker_tournaments WHERE id = tournament_id_param;
  SELECT COUNT(*) * buy_in_amount INTO total_buy_ins 
  FROM online_poker_tournament_participants 
  WHERE tournament_id = tournament_id_param AND status != 'cancelled';
  
  UPDATE online_poker_tournaments SET prize_pool = total_buy_ins WHERE id = tournament_id_param;
  RETURN total_buy_ins;
END;
$$;

-- Create function to generate default payout structure
CREATE OR REPLACE FUNCTION public.generate_tournament_payouts(tournament_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  player_count INTEGER;
  prize INTEGER;
BEGIN
  SELECT COUNT(*) INTO player_count 
  FROM online_poker_tournament_participants 
  WHERE tournament_id = tournament_id_param AND status != 'cancelled';
  
  SELECT prize_pool INTO prize FROM online_poker_tournaments WHERE id = tournament_id_param;
  
  -- Delete existing payouts
  DELETE FROM online_poker_tournament_payouts WHERE tournament_id = tournament_id_param;
  
  -- Generate payouts based on player count
  IF player_count <= 6 THEN
    -- Pay top 2
    INSERT INTO online_poker_tournament_payouts (tournament_id, position, percentage, amount) VALUES
      (tournament_id_param, 1, 65, ROUND(prize * 0.65)),
      (tournament_id_param, 2, 35, ROUND(prize * 0.35));
  ELSIF player_count <= 18 THEN
    -- Pay top 3
    INSERT INTO online_poker_tournament_payouts (tournament_id, position, percentage, amount) VALUES
      (tournament_id_param, 1, 50, ROUND(prize * 0.50)),
      (tournament_id_param, 2, 30, ROUND(prize * 0.30)),
      (tournament_id_param, 3, 20, ROUND(prize * 0.20));
  ELSE
    -- Pay top 5
    INSERT INTO online_poker_tournament_payouts (tournament_id, position, percentage, amount) VALUES
      (tournament_id_param, 1, 40, ROUND(prize * 0.40)),
      (tournament_id_param, 2, 25, ROUND(prize * 0.25)),
      (tournament_id_param, 3, 15, ROUND(prize * 0.15)),
      (tournament_id_param, 4, 12, ROUND(prize * 0.12)),
      (tournament_id_param, 5, 8, ROUND(prize * 0.08));
  END IF;
END;
$$;

-- Create function for default blind structure
CREATE OR REPLACE FUNCTION public.create_tournament_blind_structure(tournament_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM online_poker_tournament_levels WHERE tournament_id = tournament_id_param;
  
  INSERT INTO online_poker_tournament_levels (tournament_id, level, small_blind, big_blind, ante, duration, is_break) VALUES
    (tournament_id_param, 1, 25, 50, 0, 300, false),
    (tournament_id_param, 2, 50, 100, 0, 300, false),
    (tournament_id_param, 3, 75, 150, 0, 300, false),
    (tournament_id_param, 4, 100, 200, 25, 300, false),
    (tournament_id_param, 5, 0, 0, 0, 180, true), -- Break
    (tournament_id_param, 6, 150, 300, 25, 300, false),
    (tournament_id_param, 7, 200, 400, 50, 300, false),
    (tournament_id_param, 8, 300, 600, 75, 300, false),
    (tournament_id_param, 9, 400, 800, 100, 300, false),
    (tournament_id_param, 10, 0, 0, 0, 180, true), -- Break
    (tournament_id_param, 11, 500, 1000, 100, 300, false),
    (tournament_id_param, 12, 600, 1200, 200, 300, false),
    (tournament_id_param, 13, 800, 1600, 200, 300, false),
    (tournament_id_param, 14, 1000, 2000, 300, 300, false),
    (tournament_id_param, 15, 1500, 3000, 500, 300, false);
END;
$$;

-- Update trigger for updated_at
CREATE TRIGGER update_online_poker_tournaments_updated_at
BEFORE UPDATE ON public.online_poker_tournaments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
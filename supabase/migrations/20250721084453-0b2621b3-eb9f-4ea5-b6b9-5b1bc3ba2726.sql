-- Create tournaments table
CREATE TABLE public.tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  buy_in INTEGER NOT NULL DEFAULT 0,
  max_players INTEGER NOT NULL DEFAULT 9,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'registration', 'running', 'finished', 'cancelled')),
  current_level INTEGER DEFAULT 1,
  current_small_blind INTEGER DEFAULT 10,
  current_big_blind INTEGER DEFAULT 20,
  timer_duration INTEGER DEFAULT 1200, -- 20 minutes in seconds
  timer_remaining INTEGER DEFAULT 1200,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  elo_rating INTEGER NOT NULL DEFAULT 1200,
  games_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tournament registrations table
CREATE TABLE public.tournament_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  seat_number INTEGER,
  chips INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'playing', 'eliminated', 'winner')),
  position INTEGER,
  rebuys INTEGER DEFAULT 0,
  addons INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, player_id),
  UNIQUE(tournament_id, seat_number)
);

-- Create blind levels table
CREATE TABLE public.blind_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  small_blind INTEGER NOT NULL,
  big_blind INTEGER NOT NULL,
  ante INTEGER DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 1200, -- 20 minutes
  UNIQUE(tournament_id, level)
);

-- Create game results table for ELO calculation
CREATE TABLE public.game_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  elo_before INTEGER NOT NULL,
  elo_after INTEGER NOT NULL,
  elo_change INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blind_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (tournaments are viewable by everyone)
CREATE POLICY "Tournaments are viewable by everyone" 
ON public.tournaments 
FOR SELECT 
USING (true);

CREATE POLICY "Players are viewable by everyone" 
ON public.players 
FOR SELECT 
USING (true);

CREATE POLICY "Tournament registrations are viewable by everyone" 
ON public.tournament_registrations 
FOR SELECT 
USING (true);

CREATE POLICY "Blind levels are viewable by everyone" 
ON public.blind_levels 
FOR SELECT 
USING (true);

CREATE POLICY "Game results are viewable by everyone" 
ON public.game_results 
FOR SELECT 
USING (true);

-- For now, allow all operations (will restrict to admin users later)
CREATE POLICY "Allow all operations on tournaments" 
ON public.tournaments 
FOR ALL 
USING (true);

CREATE POLICY "Allow all operations on players" 
ON public.players 
FOR ALL 
USING (true);

CREATE POLICY "Allow all operations on registrations" 
ON public.tournament_registrations 
FOR ALL 
USING (true);

CREATE POLICY "Allow all operations on blind levels" 
ON public.blind_levels 
FOR ALL 
USING (true);

CREATE POLICY "Allow all operations on game results" 
ON public.game_results 
FOR ALL 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_tournaments_updated_at
BEFORE UPDATE ON public.tournaments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_players_updated_at
BEFORE UPDATE ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default blind levels for testing
INSERT INTO public.players (name, email, elo_rating) VALUES 
('Тестовый игрок 1', 'player1@test.com', 1200),
('Тестовый игрок 2', 'player2@test.com', 1250),
('Тестовый игрок 3', 'player3@test.com', 1180);
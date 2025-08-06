-- Создаем таблицу для хранения структуры выплат турниров
CREATE TABLE IF NOT EXISTS public.tournament_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id),
  place INTEGER NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, place)
);

-- Включаем RLS
ALTER TABLE public.tournament_payouts ENABLE ROW LEVEL SECURITY;

-- Создаем политики
CREATE POLICY "Tournament payouts are viewable by everyone" 
ON public.tournament_payouts 
FOR SELECT 
USING (true);

CREATE POLICY "Allow all operations on tournament payouts" 
ON public.tournament_payouts 
FOR ALL 
USING (true);

-- Добавляем триггер для обновления updated_at
CREATE TRIGGER update_tournament_payouts_updated_at
BEFORE UPDATE ON public.tournament_payouts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
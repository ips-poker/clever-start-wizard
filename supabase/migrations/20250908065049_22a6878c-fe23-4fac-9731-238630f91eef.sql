-- Добавляем поля для контактных данных игроков
ALTER TABLE public.players 
ADD COLUMN phone text,
ADD COLUMN telegram text;

-- Добавляем индексы для поиска по контактным данным
CREATE INDEX idx_players_phone ON public.players(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_players_telegram ON public.players(telegram) WHERE telegram IS NOT NULL;
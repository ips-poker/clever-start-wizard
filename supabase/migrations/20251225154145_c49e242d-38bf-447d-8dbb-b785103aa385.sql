-- Добавляем расширенные настройки для онлайн турниров
ALTER TABLE public.online_poker_tournaments 
ADD COLUMN IF NOT EXISTS tournament_format text DEFAULT 'freezeout',
ADD COLUMN IF NOT EXISTS rebuy_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rebuy_cost integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS rebuy_chips integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS rebuy_end_level integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS addon_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS addon_cost integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS addon_chips integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS addon_level integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_registration_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS late_registration_level integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS tickets_for_top integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS ticket_value integer DEFAULT 1000,
ADD COLUMN IF NOT EXISTS break_interval integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS break_duration integer DEFAULT 300,
ADD COLUMN IF NOT EXISTS guaranteed_prize_pool integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_bank_initial integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS time_bank_per_level integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS action_time_seconds integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS scheduled_start_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS auto_start boolean DEFAULT false;

COMMENT ON COLUMN online_poker_tournaments.tournament_format IS 'freezeout, rebuy, knockout, bounty';
COMMENT ON COLUMN online_poker_tournaments.rebuy_cost IS 'Стоимость ребая в алмазах';
COMMENT ON COLUMN online_poker_tournaments.tickets_for_top IS 'Количество призовых мест для билетов на офлайн';
COMMENT ON COLUMN online_poker_tournaments.ticket_value IS 'Номинал билета на офлайн турнир (в рублях)';
COMMENT ON COLUMN online_poker_tournaments.guaranteed_prize_pool IS 'Гарантированный призовой фонд в алмазах';
-- Таблица билетов на офлайн турниры для победителей онлайн турниров
CREATE TABLE public.tournament_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  offline_tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  won_from_tournament_id UUID REFERENCES public.online_poker_tournaments(id) ON DELETE SET NULL,
  finish_position INTEGER NOT NULL,
  ticket_value INTEGER NOT NULL DEFAULT 1000, -- Стоимость входа в рублях
  status TEXT NOT NULL DEFAULT 'active', -- active, used, expired
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Индексы
CREATE INDEX idx_tournament_tickets_player ON public.tournament_tickets(player_id);
CREATE INDEX idx_tournament_tickets_status ON public.tournament_tickets(status);

-- RLS
ALTER TABLE public.tournament_tickets ENABLE ROW LEVEL SECURITY;

-- Игроки видят свои билеты
CREATE POLICY "Players can view their own tickets"
ON public.tournament_tickets FOR SELECT
USING (
  player_id IN (
    SELECT id FROM public.players WHERE user_id = auth.uid()
  )
);

-- Админы видят все
CREATE POLICY "Admins can manage all tickets"
ON public.tournament_tickets FOR ALL
USING (public.is_admin(auth.uid()));

-- Функция для выдачи билетов победителям онлайн турнира
CREATE OR REPLACE FUNCTION public.issue_offline_tickets_for_winners(
  p_tournament_id UUID,
  p_ticket_value INTEGER DEFAULT 1000,
  p_top_positions INTEGER DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_winner RECORD;
  v_tickets_issued INTEGER := 0;
BEGIN
  -- Выдаем билеты топ N игрокам
  FOR v_winner IN 
    SELECT player_id, finish_position 
    FROM online_poker_tournament_participants
    WHERE tournament_id = p_tournament_id
      AND finish_position IS NOT NULL
      AND finish_position <= p_top_positions
    ORDER BY finish_position
  LOOP
    INSERT INTO tournament_tickets (
      player_id,
      won_from_tournament_id,
      finish_position,
      ticket_value,
      expires_at
    ) VALUES (
      v_winner.player_id,
      p_tournament_id,
      v_winner.finish_position,
      p_ticket_value,
      now() + interval '30 days'
    );
    v_tickets_issued := v_tickets_issued + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'tickets_issued', v_tickets_issued,
    'ticket_value', p_ticket_value
  );
END;
$$;

-- Функция регистрации на онлайн турнир с оплатой алмазами
CREATE OR REPLACE FUNCTION public.register_online_tournament_with_diamonds(
  p_tournament_id UUID,
  p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_buy_in INTEGER;
  v_balance INTEGER;
  v_wallet_id UUID;
  v_participant_exists BOOLEAN;
BEGIN
  -- Проверяем buy-in турнира
  SELECT buy_in INTO v_buy_in
  FROM online_poker_tournaments
  WHERE id = p_tournament_id AND status = 'registration';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Турнир не найден или регистрация закрыта');
  END IF;

  -- Проверяем, не зарегистрирован ли уже
  SELECT EXISTS(
    SELECT 1 FROM online_poker_tournament_participants
    WHERE tournament_id = p_tournament_id AND player_id = p_player_id
  ) INTO v_participant_exists;

  IF v_participant_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Уже зарегистрирован');
  END IF;

  -- Проверяем баланс алмазов
  SELECT id, balance INTO v_wallet_id, v_balance
  FROM diamond_wallets
  WHERE player_id = p_player_id;

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Кошелек не найден');
  END IF;

  IF v_balance < v_buy_in THEN
    RETURN jsonb_build_object('success', false, 'error', 'Недостаточно алмазов', 'required', v_buy_in, 'balance', v_balance);
  END IF;

  -- Списываем алмазы
  UPDATE diamond_wallets
  SET balance = balance - v_buy_in,
      total_spent = total_spent + v_buy_in,
      updated_at = now()
  WHERE id = v_wallet_id;

  -- Записываем транзакцию
  INSERT INTO diamond_transactions (
    wallet_id, player_id, amount, balance_before, balance_after,
    transaction_type, description, reference_id
  ) VALUES (
    v_wallet_id, p_player_id, -v_buy_in, v_balance, v_balance - v_buy_in,
    'tournament_buyin', 'Вступительный взнос на турнир', p_tournament_id::text
  );

  -- Регистрируем участника
  INSERT INTO online_poker_tournament_participants (
    tournament_id, player_id, status
  ) VALUES (
    p_tournament_id, p_player_id, 'registered'
  );

  -- Обновляем призовой фонд
  UPDATE online_poker_tournaments
  SET prize_pool = COALESCE(prize_pool, 0) + v_buy_in
  WHERE id = p_tournament_id;

  RETURN jsonb_build_object(
    'success', true,
    'buy_in', v_buy_in,
    'new_balance', v_balance - v_buy_in
  );
END;
$$;
-- Таблица кошельков алмазов
CREATE TABLE public.diamond_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL UNIQUE REFERENCES public.players(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  total_won INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица транзакций алмазов
CREATE TABLE public.diamond_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.diamond_wallets(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'admin_add', 'admin_remove', 'tournament_entry', 'tournament_prize', 'refund', 'bonus')),
  description TEXT,
  reference_id TEXT,
  payment_amount INTEGER,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Индексы
CREATE INDEX idx_diamond_wallets_player ON public.diamond_wallets(player_id);
CREATE INDEX idx_diamond_transactions_wallet ON public.diamond_transactions(wallet_id);
CREATE INDEX idx_diamond_transactions_player ON public.diamond_transactions(player_id);
CREATE INDEX idx_diamond_transactions_type ON public.diamond_transactions(transaction_type);
CREATE INDEX idx_diamond_transactions_created ON public.diamond_transactions(created_at DESC);

-- RLS для кошельков
ALTER TABLE public.diamond_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own wallet"
ON public.diamond_wallets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM players p
    WHERE p.id = diamond_wallets.player_id
    AND (p.user_id = auth.uid() OR (p.telegram IS NOT NULL AND EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'telegram_id' = p.telegram
    )))
  )
);

CREATE POLICY "Admins can manage all wallets"
ON public.diamond_wallets FOR ALL
USING (is_admin(auth.uid()));

-- RLS для транзакций
ALTER TABLE public.diamond_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own transactions"
ON public.diamond_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM players p
    WHERE p.id = diamond_transactions.player_id
    AND (p.user_id = auth.uid() OR (p.telegram IS NOT NULL AND EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'telegram_id' = p.telegram
    )))
  )
);

CREATE POLICY "Admins can manage all transactions"
ON public.diamond_transactions FOR ALL
USING (is_admin(auth.uid()));

-- Триггер обновления updated_at
CREATE TRIGGER update_diamond_wallets_updated_at
BEFORE UPDATE ON public.diamond_wallets
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Функция для создания кошелька при первом обращении
CREATE OR REPLACE FUNCTION public.ensure_diamond_wallet(p_player_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  INSERT INTO public.diamond_wallets (player_id, balance)
  VALUES (p_player_id, 0)
  ON CONFLICT (player_id) DO NOTHING;
  
  SELECT balance INTO v_balance
  FROM public.diamond_wallets
  WHERE player_id = p_player_id;
  
  RETURN v_balance;
END;
$$;

-- Функция для начисления/списания алмазов (для админов)
CREATE OR REPLACE FUNCTION public.admin_diamond_transaction(
  p_player_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_payment_amount INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  -- Проверка прав (кроме покупки, которая доступна всем)
  IF p_type != 'purchase' THEN
    SELECT is_admin(auth.uid()) INTO v_is_admin;
    IF NOT v_is_admin THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only admins can perform this operation');
    END IF;
  END IF;

  -- Создаем кошелек если нет
  PERFORM ensure_diamond_wallet(p_player_id);
  
  -- Получаем текущий баланс
  SELECT id, balance INTO v_wallet_id, v_balance_before
  FROM public.diamond_wallets
  WHERE player_id = p_player_id
  FOR UPDATE;
  
  -- Проверяем достаточно ли средств для списания
  IF p_amount < 0 AND v_balance_before + p_amount < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient diamonds', 'balance', v_balance_before);
  END IF;
  
  v_balance_after := v_balance_before + p_amount;
  
  -- Обновляем баланс
  UPDATE public.diamond_wallets
  SET 
    balance = v_balance_after,
    total_purchased = CASE WHEN p_type = 'purchase' THEN total_purchased + p_amount ELSE total_purchased END,
    total_spent = CASE WHEN p_amount < 0 THEN total_spent + ABS(p_amount) ELSE total_spent END,
    total_won = CASE WHEN p_type = 'tournament_prize' THEN total_won + p_amount ELSE total_won END,
    updated_at = now()
  WHERE id = v_wallet_id;
  
  -- Записываем транзакцию
  INSERT INTO public.diamond_transactions (
    wallet_id, player_id, amount, balance_before, balance_after,
    transaction_type, description, reference_id, payment_amount, created_by
  ) VALUES (
    v_wallet_id, p_player_id, p_amount, v_balance_before, v_balance_after,
    p_type, p_description, p_reference_id, p_payment_amount, auth.uid()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'amount', p_amount
  );
END;
$$;

-- Функция для покупки алмазов (100 руб = 500 алмазов)
CREATE OR REPLACE FUNCTION public.purchase_diamonds(
  p_player_id UUID,
  p_rubles INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_diamonds INTEGER;
BEGIN
  -- Проверка минимальной суммы
  IF p_rubles < 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum purchase is 100 rubles');
  END IF;
  
  -- Расчет алмазов (100 руб = 500 алмазов)
  v_diamonds := (p_rubles / 100) * 500;
  
  RETURN admin_diamond_transaction(
    p_player_id,
    v_diamonds,
    'purchase',
    'Покупка ' || v_diamonds || ' алмазов за ' || p_rubles || ' руб.',
    NULL,
    p_rubles
  );
END;
$$;
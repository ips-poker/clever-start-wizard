-- Удаляем старые политики для diamond_wallets
DROP POLICY IF EXISTS "Players can view their own wallet" ON public.diamond_wallets;
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.diamond_wallets;
DROP POLICY IF EXISTS "Admins can manage all wallets" ON public.diamond_wallets;

-- Создаем новые упрощенные политики для diamond_wallets
CREATE POLICY "Anyone can view wallets"
ON public.diamond_wallets FOR SELECT
USING (true);

CREATE POLICY "Admins can manage wallets"
ON public.diamond_wallets FOR ALL
USING (is_admin(auth.uid()));

-- Удаляем старые политики для diamond_transactions
DROP POLICY IF EXISTS "Players can view their own transactions" ON public.diamond_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.diamond_transactions;
DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.diamond_transactions;

-- Создаем новые упрощенные политики для diamond_transactions
CREATE POLICY "Anyone can view transactions"
ON public.diamond_transactions FOR SELECT
USING (true);

CREATE POLICY "Admins can manage transactions"
ON public.diamond_transactions FOR ALL
USING (is_admin(auth.uid()));
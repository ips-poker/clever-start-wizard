-- Добавляем SELECT политику для админов на diamond_wallets
CREATE POLICY "Admins can view all wallets"
ON public.diamond_wallets FOR SELECT
USING (is_admin(auth.uid()));

-- Добавляем SELECT политику для админов на diamond_transactions
CREATE POLICY "Admins can view all transactions"
ON public.diamond_transactions FOR SELECT
USING (is_admin(auth.uid()));
DROP POLICY IF EXISTS "System can create transactions" ON public.payment_transactions;
REVOKE INSERT ON public.payment_transactions FROM anon, authenticated;

-- Fix 1: cadastral_contributor_codes - restrict INSERT to own records
DROP POLICY IF EXISTS "System can create codes" ON public.cadastral_contributor_codes;
CREATE POLICY "Authenticated users can create own codes"
  ON public.cadastral_contributor_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Fix 2: fraud_attempts - restrict INSERT to admins only
DROP POLICY IF EXISTS "System can create fraud attempts" ON public.fraud_attempts;
CREATE POLICY "Admins can create fraud attempts"
  ON public.fraud_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

-- Fix 3: notifications - restrict INSERT to admins or self-notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Admins or self can create notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role])
  );

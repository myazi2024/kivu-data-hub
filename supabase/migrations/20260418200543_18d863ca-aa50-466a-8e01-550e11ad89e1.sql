
-- Fix ERROR 1: vue avec security_invoker
ALTER VIEW public.requests_health_overview SET (security_invoker = on);

-- Fix WARN 2-3: tighten audit insert policy
DROP POLICY IF EXISTS "System can insert request audit" ON public.request_admin_audit;
CREATE POLICY "Admins can insert request audit" ON public.request_admin_audit
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

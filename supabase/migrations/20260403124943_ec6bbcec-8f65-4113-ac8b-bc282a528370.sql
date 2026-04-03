
-- Fix the view to use SECURITY INVOKER (respects caller's permissions)
DROP VIEW IF EXISTS public.payment_methods_public;

CREATE VIEW public.payment_methods_public
WITH (security_invoker = true)
AS
SELECT id, config_type, provider_id, provider_name, is_enabled, display_order
FROM public.payment_methods_config
WHERE is_enabled = true;

GRANT SELECT ON public.payment_methods_public TO authenticated;
GRANT SELECT ON public.payment_methods_public TO anon;


-- Fix 5 SQL functions missing search_path

-- 1. create_parcel_from_approved_contribution
DO $$ 
DECLARE func_body text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO func_body
  FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'create_parcel_from_approved_contribution';
END $$;

ALTER FUNCTION public.create_parcel_from_approved_contribution SET search_path = public;
ALTER FUNCTION public.format_parcel_number_with_prefix SET search_path = public;
ALTER FUNCTION public.migrate_approved_contribution SET search_path = public;
ALTER FUNCTION public.sync_approved_contribution_to_parcel SET search_path = public;
ALTER FUNCTION public.update_admin_user_notes_updated_at SET search_path = public;

-- Fix permissive RLS: orders table - restrict INSERT to authenticated users
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Authenticated users can create orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

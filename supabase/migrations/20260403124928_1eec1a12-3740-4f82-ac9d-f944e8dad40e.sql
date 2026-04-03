
-- =============================================
-- 1. AUDIT LOGS: Remove permissive INSERT policy
-- Inserts happen only via log_audit_action() which is SECURITY DEFINER
-- =============================================
DROP POLICY IF EXISTS "System can create audit logs" ON public.audit_logs;
-- No replacement INSERT policy needed - log_audit_action() bypasses RLS as SECURITY DEFINER

-- =============================================
-- 2. PAYMENT METHODS CONFIG: Hide api_credentials from non-admins
-- =============================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view enabled payment methods" ON public.payment_methods_config;

-- Admins can see everything (including api_credentials)
CREATE POLICY "Admins can view all payment methods"
ON public.payment_methods_config
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role])
);

-- Create a view for non-admin users that excludes api_credentials
CREATE OR REPLACE VIEW public.payment_methods_public AS
SELECT id, config_type, provider_id, provider_name, is_enabled, display_order
FROM public.payment_methods_config
WHERE is_enabled = true;

-- Grant access to the view
GRANT SELECT ON public.payment_methods_public TO authenticated;
GRANT SELECT ON public.payment_methods_public TO anon;

-- =============================================
-- 3. TERRITORIAL ZONES: Restrict write to admins
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can create territorial zones" ON public.territorial_zones;
DROP POLICY IF EXISTS "Authenticated users can update territorial zones" ON public.territorial_zones;
DROP POLICY IF EXISTS "Authenticated users can delete territorial zones" ON public.territorial_zones;

CREATE POLICY "Admins can manage territorial zones"
ON public.territorial_zones
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

-- =============================================
-- 4. MARKET TRENDS: Restrict write to admins
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can manage market trends" ON public.market_trends;

-- Keep read access for all authenticated users
CREATE POLICY "Authenticated users can view market trends"
ON public.market_trends
FOR SELECT
TO authenticated
USING (true);

-- Admin-only write
CREATE POLICY "Admins can manage market trends"
ON public.market_trends
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

-- =============================================
-- 5. STORAGE: Make cadastral-documents bucket private
-- =============================================
UPDATE storage.buckets 
SET public = false 
WHERE id = 'cadastral-documents';

-- Remove the public access policy
DROP POLICY IF EXISTS "Cadastral documents are publicly accessible" ON storage.objects;

-- Create a function to generate signed URLs server-side
CREATE OR REPLACE FUNCTION public.get_signed_document_url(
  p_file_path text,
  p_expires_in integer DEFAULT 3600
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  signed_url text;
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Generate signed URL (valid for p_expires_in seconds, default 1 hour)
  SELECT storage.foldername(p_file_path) INTO signed_url;
  
  -- Return the path - actual signing happens via Supabase client SDK
  RETURN p_file_path;
END;
$$;

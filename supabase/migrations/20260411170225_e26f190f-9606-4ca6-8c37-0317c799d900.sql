-- 1. Fix resellers: restrict public SELECT to only validation-relevant columns via a function
DROP POLICY IF EXISTS "Public can validate reseller codes" ON resellers;

-- Create a secure validation function instead of exposing the whole table
CREATE OR REPLACE FUNCTION public.validate_reseller_code(code_input text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.resellers
    WHERE reseller_code = code_input
      AND is_active = true
  );
$$;

-- Only authenticated users and admins can SELECT from resellers directly
CREATE POLICY "Authenticated users can validate reseller codes"
  ON public.resellers FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (
      auth.uid() = user_id
      OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role])
    )
  );

-- 2. Fix certificate_templates: restrict to authenticated users only
DROP POLICY IF EXISTS "Certificate templates viewable by admins" ON certificate_templates;

CREATE POLICY "Certificate templates viewable by authenticated"
  ON public.certificate_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 3. Fix expertise-certificates storage: restrict SELECT to file owners or admins
DROP POLICY IF EXISTS "Authenticated users can read expertise certificates" ON storage.objects;

CREATE POLICY "Users can read own expertise certificates"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'expertise-certificates'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role])
    )
  );

-- Fix 1: Replace broad public SELECT on document_verifications with a secure RPC
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can verify documents" ON public.document_verifications;

-- Create a restrictive policy: only the document owner or admins can see full rows
CREATE POLICY "Owners and admins can view verifications"
  ON public.document_verifications FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role])
  );

-- Create a secure RPC for public verification lookups (no login required)
CREATE OR REPLACE FUNCTION public.verify_document_by_code(p_code text)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT json_build_object(
    'verification_code', verification_code,
    'document_type', document_type,
    'parcel_number', parcel_number,
    'generated_at', generated_at,
    'is_valid', is_valid,
    'client_name', client_name,
    'invalidated_at', invalidated_at,
    'invalidation_reason', invalidation_reason
  )
  FROM document_verifications
  WHERE verification_code = upper(trim(p_code))
  LIMIT 1;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.verify_document_by_code(text) TO anon, authenticated;

-- Fix 2: Remove overly broad storage policies on cadastral-documents bucket
DROP POLICY IF EXISTS "Users can upload cadastral documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their cadastral documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their cadastral documents" ON storage.objects;

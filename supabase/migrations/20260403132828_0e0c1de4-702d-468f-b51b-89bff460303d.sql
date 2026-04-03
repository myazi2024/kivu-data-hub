
-- Fix 1: Remove permissive SELECT policy on cadastral_parcels base table
-- Users must use cadastral_parcels_public view or get_parcel_with_pii() RPC
DROP POLICY IF EXISTS "Users can view parcels for search" ON public.cadastral_parcels;

-- Only admins can SELECT directly from the base table
CREATE POLICY "Only admins can select parcels directly"
  ON public.cadastral_parcels
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

-- Fix 2: Make expertise-certificates bucket private
UPDATE storage.buckets
SET public = false
WHERE id = 'expertise-certificates';

-- Remove public read policy
DROP POLICY IF EXISTS "Public can read expertise certificates" ON storage.objects;

-- Add authenticated-only read policy
CREATE POLICY "Authenticated users can read expertise certificates"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'expertise-certificates');

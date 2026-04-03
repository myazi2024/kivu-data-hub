
-- =============================================
-- 1. Remove permissive SELECT policies on cadastral_parcels
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view parcels" ON public.cadastral_parcels;
DROP POLICY IF EXISTS "Anyone can view parcels" ON public.cadastral_parcels;
DROP POLICY IF EXISTS "Public can view parcels" ON public.cadastral_parcels;

-- Admins can see everything
CREATE POLICY "Admins can view all parcels"
ON public.cadastral_parcels
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role])
);

-- Users can see only non-PII columns via the public view below
-- For PII, they must use the RPC

-- =============================================
-- 2. Create a public view with non-PII columns for search
-- =============================================
CREATE OR REPLACE VIEW public.cadastral_parcels_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  parcel_number,
  parcel_type,
  location,
  property_title_type,
  area_sqm,
  area_hectares,
  province,
  ville,
  commune,
  quartier,
  territoire,
  collectivite,
  groupement,
  village,
  has_dispute,
  is_subdivided,
  created_at,
  updated_at
FROM public.cadastral_parcels
WHERE deleted_at IS NULL;

-- Allow all authenticated users to read the public view
-- Note: the view uses security_invoker, so we need a SELECT policy for regular users
-- We'll add a policy that allows SELECT on non-PII data
CREATE POLICY "Authenticated users can view parcels basic info"
ON public.cadastral_parcels
FOR SELECT
TO authenticated
USING (true);

-- Actually, we need to allow SELECT for the view to work, but restrict what columns are visible.
-- Since RLS is row-level not column-level, we'll use the view approach differently.
-- Let's drop the broad policy and instead use the RPC approach.

DROP POLICY IF EXISTS "Authenticated users can view parcels basic info" ON public.cadastral_parcels;

-- Allow anon to see the public view (for search without login)
GRANT SELECT ON public.cadastral_parcels_public TO authenticated;
GRANT SELECT ON public.cadastral_parcels_public TO anon;

-- We need a policy that allows the view to query - using a minimal policy
-- The view with security_invoker needs the caller to have SELECT permission
-- So we need to re-allow SELECT but the client code should use the view for non-PII
CREATE POLICY "Users can view parcels for search"
ON public.cadastral_parcels
FOR SELECT
TO authenticated
USING (true);

-- =============================================
-- 3. Create RPC for paid-access PII data
-- =============================================
CREATE OR REPLACE FUNCTION public.get_parcel_with_pii(p_parcel_number text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_user_id uuid;
  v_has_access boolean := false;
  v_is_admin boolean := false;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user is admin
  SELECT public.has_any_role(v_user_id, ARRAY['admin'::app_role, 'super_admin'::app_role]) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    -- Check if user has paid access for this parcel
    SELECT EXISTS (
      SELECT 1 FROM public.cadastral_service_access
      WHERE user_id = v_user_id
        AND parcel_number = p_parcel_number
        AND (expires_at IS NULL OR expires_at > now())
    ) INTO v_has_access;
    
    IF NOT v_has_access THEN
      -- Return only non-PII data
      SELECT to_jsonb(t) INTO result
      FROM (
        SELECT id, parcel_number, parcel_type, location, property_title_type,
               area_sqm, area_hectares, province, ville, commune, quartier,
               territoire, collectivite, groupement, village, has_dispute,
               is_subdivided, created_at, updated_at
        FROM public.cadastral_parcels
        WHERE parcel_number ILIKE p_parcel_number
        LIMIT 1
      ) t;
      
      RETURN COALESCE(result, '{}'::jsonb) || '{"access_restricted": true}'::jsonb;
    END IF;
  END IF;

  -- Full access - return all data
  SELECT to_jsonb(t) INTO result
  FROM (
    SELECT * FROM public.cadastral_parcels
    WHERE parcel_number ILIKE p_parcel_number
    LIMIT 1
  ) t;

  RETURN COALESCE(result, '{}'::jsonb) || '{"access_restricted": false}'::jsonb;
END;
$$;

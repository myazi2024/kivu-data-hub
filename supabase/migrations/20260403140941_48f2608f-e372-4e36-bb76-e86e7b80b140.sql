
-- =============================================
-- 1. Fix PII exposure on expertise requests
-- =============================================

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view completed expertise certificates" ON public.real_estate_expertise_requests;

-- Ensure owner can see their own requests
DROP POLICY IF EXISTS "Users can view own expertise requests" ON public.real_estate_expertise_requests;
CREATE POLICY "Users can view own expertise requests"
  ON public.real_estate_expertise_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins and experts can see all
DROP POLICY IF EXISTS "Admins and experts can view all expertise requests" ON public.real_estate_expertise_requests;
CREATE POLICY "Admins and experts can view all expertise requests"
  ON public.real_estate_expertise_requests FOR SELECT
  TO authenticated
  USING (public.is_expert_or_admin(auth.uid()));

-- Create a secure RPC for public certificate verification (no PII)
CREATE OR REPLACE FUNCTION public.verify_expertise_certificate(p_reference text)
RETURNS TABLE(
  reference_number text,
  parcel_number text,
  status text,
  certificate_url text,
  certificate_issue_date date,
  certificate_expiry_date date,
  market_value_usd numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.reference_number,
    r.parcel_number,
    r.status,
    r.certificate_url,
    r.certificate_issue_date,
    r.certificate_expiry_date,
    r.market_value_usd
  FROM public.real_estate_expertise_requests r
  WHERE r.reference_number = p_reference
    AND r.status = 'completed'
    AND r.certificate_issue_date IS NOT NULL
  LIMIT 1;
END;
$$;

-- =============================================
-- 2. Lock down picklist values to admins only
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can update picklist values" ON public.suggestive_picklist_values;
DROP POLICY IF EXISTS "Authenticated users can insert picklist values" ON public.suggestive_picklist_values;

CREATE POLICY "Admins can update picklist values"
  ON public.suggestive_picklist_values FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

CREATE POLICY "Admins can insert picklist values"
  ON public.suggestive_picklist_values FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

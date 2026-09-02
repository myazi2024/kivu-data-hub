-- 1. New columns carrying CCC indicators into expertise requests
ALTER TABLE public.real_estate_expertise_requests
  ADD COLUMN IF NOT EXISTS property_category text,
  ADD COLUMN IF NOT EXISTS construction_type text,
  ADD COLUMN IF NOT EXISTS construction_nature text,
  ADD COLUMN IF NOT EXISTS construction_materials_declared text,
  ADD COLUMN IF NOT EXISTS declared_usage text,
  ADD COLUMN IF NOT EXISTS building_height_m numeric,
  ADD COLUMN IF NOT EXISTS has_direct_street_access boolean,
  ADD COLUMN IF NOT EXISTS distance_from_road_m numeric,
  ADD COLUMN IF NOT EXISTS is_rented boolean,
  ADD COLUMN IF NOT EXISTS monthly_rent_usd numeric,
  ADD COLUMN IF NOT EXISTS hosting_capacity integer,
  ADD COLUMN IF NOT EXISTS occupant_count integer,
  ADD COLUMN IF NOT EXISTS parcel_sound_environment text;

-- 2. Payment status can no longer be set by the requester
DROP POLICY IF EXISTS "Users can update payment_status on own requests" ON public.real_estate_expertise_requests;

CREATE OR REPLACE FUNCTION public.prevent_client_expertise_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'payment_status can only be changed by the payment backend';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_client_expertise_payment_status ON public.real_estate_expertise_requests;
CREATE TRIGGER trg_prevent_client_expertise_payment_status
BEFORE UPDATE ON public.real_estate_expertise_requests
FOR EACH ROW EXECUTE FUNCTION public.prevent_client_expertise_payment_status();

-- 3. Deduplicate SELECT policies
DROP POLICY IF EXISTS "Users can view their own expertise requests" ON public.real_estate_expertise_requests;
DROP POLICY IF EXISTS "Experts and admins can view all expertise requests" ON public.real_estate_expertise_requests;

-- 4. expertise_payments policy hygiene
DROP POLICY IF EXISTS "Admins can view all expertise payments" ON public.expertise_payments;
CREATE POLICY "Admins can view all expertise payments"
ON public.expertise_payments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users can update their own expertise payments" ON public.expertise_payments;
CREATE POLICY "Users can update their own expertise payments"
ON public.expertise_payments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
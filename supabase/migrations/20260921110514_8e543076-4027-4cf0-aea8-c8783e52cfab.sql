ALTER TABLE public.cadastral_contributions ADD COLUMN IF NOT EXISTS construction_status text DEFAULT 'completed';
ALTER TABLE public.cadastral_parcels ADD COLUMN IF NOT EXISTS construction_status text DEFAULT 'completed';

CREATE OR REPLACE FUNCTION public.zz_sync_contribution_extra_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved'
     AND OLD.status IS DISTINCT FROM 'approved'
     AND NEW.original_parcel_id IS NOT NULL THEN
    UPDATE public.cadastral_parcels
    SET
      actual_usage = COALESCE(NEW.actual_usage, actual_usage),
      actual_usage_other = COALESCE(NEW.actual_usage_other, actual_usage_other),
      operational_capacity = COALESCE(NEW.operational_capacity, operational_capacity),
      operational_capacity_unit = COALESCE(NEW.operational_capacity_unit, operational_capacity_unit),
      lease_contract_url = COALESCE(NEW.lease_contract_url, lease_contract_url),
      previous_permit_number = COALESCE(NEW.previous_permit_number, previous_permit_number),
      construction_status = COALESCE(NEW.construction_status, construction_status),
      updated_at = NOW()
    WHERE id = NEW.original_parcel_id;
  END IF;
  RETURN NEW;
END;
$$;
ALTER TABLE public.cadastral_contributions ADD COLUMN IF NOT EXISTS land_district text;
ALTER TABLE public.cadastral_parcels ADD COLUMN IF NOT EXISTS land_district text;

CREATE OR REPLACE FUNCTION public.sync_contribution_extra_fields_to_parcel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parcel_id uuid;
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    v_parcel_id := NEW.original_parcel_id;

    IF v_parcel_id IS NULL THEN
      SELECT id INTO v_parcel_id
      FROM public.cadastral_parcels
      WHERE parcel_number = NEW.parcel_number
        AND deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 1;
    END IF;

    IF v_parcel_id IS NOT NULL THEN
      UPDATE public.cadastral_parcels
      SET
        actual_usage = COALESCE(NEW.actual_usage, actual_usage),
        actual_usage_other = COALESCE(NEW.actual_usage_other, actual_usage_other),
        operational_capacity = COALESCE(NEW.operational_capacity, operational_capacity),
        operational_capacity_unit = COALESCE(NEW.operational_capacity_unit, operational_capacity_unit),
        lease_contract_url = COALESCE(NEW.lease_contract_url, lease_contract_url),
        previous_permit_number = COALESCE(NEW.previous_permit_number, previous_permit_number),
        construction_status = COALESCE(NEW.construction_status, construction_status),
        land_district = COALESCE(NEW.land_district, land_district),
        updated_at = NOW()
      WHERE id = v_parcel_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
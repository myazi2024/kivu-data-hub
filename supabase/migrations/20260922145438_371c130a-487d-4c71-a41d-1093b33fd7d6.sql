-- 1. Colonne manquante sur cadastral_parcels
ALTER TABLE public.cadastral_parcels
  ADD COLUMN IF NOT EXISTS previous_permit_number text;

-- 2. Fonction de synchronisation des champs additionnels (création ET mise à jour)
CREATE OR REPLACE FUNCTION public.sync_contribution_extra_fields_to_parcel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_parcel_id uuid;
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    v_parcel_id := NEW.original_parcel_id;

    IF v_parcel_id IS NULL THEN
      -- La parcelle vient peut-être d'être créée par sync_approved_contribution_to_parcel
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
        updated_at = NOW()
      WHERE id = v_parcel_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Suppression de la fonction jumelle morte (aucun trigger attaché)
DROP FUNCTION IF EXISTS public.zz_sync_contribution_extra_fields();

-- 4. Rattrapage des contributions déjà approuvées
UPDATE public.cadastral_parcels p
SET
  actual_usage = COALESCE(p.actual_usage, c.actual_usage),
  actual_usage_other = COALESCE(p.actual_usage_other, c.actual_usage_other),
  operational_capacity = COALESCE(p.operational_capacity, c.operational_capacity),
  operational_capacity_unit = COALESCE(p.operational_capacity_unit, c.operational_capacity_unit),
  lease_contract_url = COALESCE(p.lease_contract_url, c.lease_contract_url),
  previous_permit_number = COALESCE(p.previous_permit_number, c.previous_permit_number),
  construction_status = COALESCE(p.construction_status, c.construction_status),
  updated_at = NOW()
FROM public.cadastral_contributions c
WHERE c.status = 'approved'
  AND c.original_parcel_id = p.id
  AND (
    c.actual_usage IS NOT NULL OR
    c.actual_usage_other IS NOT NULL OR
    c.operational_capacity IS NOT NULL OR
    c.operational_capacity_unit IS NOT NULL OR
    c.lease_contract_url IS NOT NULL OR
    c.previous_permit_number IS NOT NULL OR
    c.construction_status IS NOT NULL
  );
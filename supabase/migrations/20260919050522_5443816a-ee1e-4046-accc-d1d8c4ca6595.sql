-- 1. Colonnes manquantes sur les parcelles
ALTER TABLE public.cadastral_parcels
  ADD COLUMN IF NOT EXISTS actual_usage TEXT,
  ADD COLUMN IF NOT EXISTS actual_usage_other TEXT,
  ADD COLUMN IF NOT EXISTS operational_capacity NUMERIC,
  ADD COLUMN IF NOT EXISTS operational_capacity_unit TEXT,
  ADD COLUMN IF NOT EXISTS lease_contract_url TEXT;

-- 2. Recopie des champs oubliés à l'approbation (complément du trigger principal)
CREATE OR REPLACE FUNCTION public.sync_contribution_extra_fields_to_parcel()
RETURNS TRIGGER
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
      updated_at = NOW()
    WHERE id = NEW.original_parcel_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zz_sync_contribution_extra_fields ON public.cadastral_contributions;
CREATE TRIGGER zz_sync_contribution_extra_fields
AFTER UPDATE ON public.cadastral_contributions
FOR EACH ROW EXECUTE FUNCTION public.sync_contribution_extra_fields_to_parcel();

-- 3. Normalisation forcée à l'insertion (anti-forgery)
CREATE OR REPLACE FUNCTION public.normalize_contribution_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'super_admin'::app_role)) THEN
    NEW.status := 'pending';
    NEW.fraud_score := NULL;
    NEW.is_suspicious := NULL;
    NEW.reviewed_by := NULL;
    NEW.verified_by := NULL;
    NEW.original_parcel_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aaa_normalize_contribution_insert ON public.cadastral_contributions;
CREATE TRIGGER aaa_normalize_contribution_insert
BEFORE INSERT ON public.cadastral_contributions
FOR EACH ROW EXECUTE FUNCTION public.normalize_contribution_insert();

-- 4. Règle d'insertion renforcée
DROP POLICY IF EXISTS "Users can create their own contributions" ON public.cadastral_contributions;
CREATE POLICY "Users can create their own contributions"
ON public.cadastral_contributions
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND original_parcel_id IS NULL
  AND reviewed_by IS NULL
  AND verified_by IS NULL
);

-- 5. Mise à jour par l'auteur (brouillons en attente ou retournés)
DROP POLICY IF EXISTS "Users can update their own pending contributions" ON public.cadastral_contributions;
CREATE POLICY "Users can update their own pending contributions"
ON public.cadastral_contributions
FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  AND status = ANY (ARRAY['pending'::text, 'returned'::text])
)
WITH CHECK (
  auth.uid() = user_id
  AND status = ANY (ARRAY['pending'::text, 'returned'::text])
);

-- 6. Champs de contrôle non modifiables par l'auteur
CREATE OR REPLACE FUNCTION public.protect_contribution_review_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'super_admin'::app_role)) THEN
    NEW.status := OLD.status;
    NEW.fraud_score := OLD.fraud_score;
    NEW.is_suspicious := OLD.is_suspicious;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.verified_by := OLD.verified_by;
    NEW.original_parcel_id := OLD.original_parcel_id;
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aaa_protect_contribution_review_fields ON public.cadastral_contributions;
CREATE TRIGGER aaa_protect_contribution_review_fields
BEFORE UPDATE ON public.cadastral_contributions
FOR EACH ROW EXECUTE FUNCTION public.protect_contribution_review_fields();

-- 7. Nettoyage du code mort
DROP FUNCTION IF EXISTS public.create_parcel_from_approved_contribution();
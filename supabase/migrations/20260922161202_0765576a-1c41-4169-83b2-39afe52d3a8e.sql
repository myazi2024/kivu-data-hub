CREATE OR REPLACE FUNCTION public.normalize_contribution_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'super_admin'::app_role)) THEN
    NEW.status := 'pending';
    NEW.reviewed_by := NULL;
    NEW.verified_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.verified_at := NULL;
    -- Le lien vers la parcelle est légitime (déclarations fiscales, hypothèques,
    -- autorisations de bâtir, demandes de correction) : on le conserve s'il
    -- désigne une parcelle réellement existante, sinon on le vide.
    IF NEW.original_parcel_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.cadastral_parcels p
         WHERE p.id = NEW.original_parcel_id AND p.deleted_at IS NULL
       ) THEN
      NEW.original_parcel_id := NULL;
    END IF;
    -- fraud_score / is_suspicious sont produits par la détection à l'envoi et
    -- recoupés par le déclencheur de détection : on ne les efface plus.
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Users can create their own contributions" ON public.cadastral_contributions;
CREATE POLICY "Users can create their own contributions"
ON public.cadastral_contributions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND reviewed_by IS NULL
  AND verified_by IS NULL
);

DROP INDEX IF EXISTS public.idx_cadastral_contributions_status;
DROP INDEX IF EXISTS public.cadastral_contributions_status_created_idx;
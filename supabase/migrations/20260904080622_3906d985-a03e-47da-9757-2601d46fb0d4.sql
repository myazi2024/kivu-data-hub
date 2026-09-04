
-- 1) Mapping des libellés de titre vers les clés du barème
CREATE OR REPLACE FUNCTION public.map_land_title_type_key(p_label text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_label IS NULL THEN 'concession_ordinaire'
    WHEN p_label ILIKE '%certificat%enregistrement%' THEN 'certificat_enregistrement'
    WHEN p_label ILIKE '%concession perp%' THEN 'concession_perpetuelle'
    WHEN p_label ILIKE '%emphyt%' THEN 'bail_emphyteotique'
    WHEN p_label ILIKE '%permis%occupation%' THEN 'permis_occupation'
    WHEN p_label ILIKE '%autorisation%occupation%' THEN 'autorisation_occupation'
    WHEN p_label ILIKE '%location%' THEN 'location'
    ELSE 'concession_ordinaire'
  END;
$$;

-- 2) Calcul serveur des frais de titre foncier
CREATE OR REPLACE FUNCTION public.calculate_land_title_fees(
  p_title_label text,
  p_section_type text,
  p_area_sqm numeric
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_key text := public.map_land_title_type_key(p_title_label);
  v_urban boolean := COALESCE(p_section_type, '') ILIKE 'urb%';
  v_rural boolean := COALESCE(p_section_type, '') ILIKE 'rur%';
  v_items jsonb := '[]'::jsonb;
  v_total numeric := 0;
  r record;
  v_zone numeric;
  v_final numeric;
BEGIN
  FOR r IN
    SELECT *
    FROM land_title_fees_by_type f
    WHERE f.is_active = true
      AND f.title_type = v_key
      AND (NOT v_urban OR f.applies_to_urban)
      AND (NOT v_rural OR f.applies_to_rural)
      AND (
        f.fee_category <> 'superficie'
        OR (
          p_area_sqm IS NOT NULL
          AND (f.min_area_sqm IS NULL OR p_area_sqm >= f.min_area_sqm)
          AND (f.max_area_sqm IS NULL OR p_area_sqm < f.max_area_sqm)
        )
      )
    ORDER BY f.display_order ASC
  LOOP
    v_zone := CASE WHEN v_urban THEN COALESCE(r.urban_surcharge_usd, 0)
                   WHEN v_rural THEN -COALESCE(r.rural_discount_usd, 0)
                   ELSE 0 END;
    v_final := GREATEST(0, COALESCE(r.base_amount_usd, 0) + v_zone);
    v_total := v_total + v_final;
    v_items := v_items || jsonb_build_object(
      'id', r.id,
      'name', r.fee_name,
      'fee_name', r.fee_name,
      'category', r.fee_category,
      'base_amount', r.base_amount_usd,
      'zone_adjustment', v_zone,
      'amount', v_final,
      'final_amount', v_final,
      'is_mandatory', r.is_mandatory
    );
  END LOOP;

  RETURN jsonb_build_object('fee_items', v_items, 'total_amount_usd', v_total);
END;
$$;

-- 3) Normalisation serveur à l'insertion
CREATE OR REPLACE FUNCTION public.enforce_land_title_request_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_calc jsonb;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    v_calc := public.calculate_land_title_fees(NEW.deduced_title_type, NEW.section_type, NEW.area_sqm);
    NEW.fee_items := v_calc->'fee_items';
    NEW.total_amount_usd := COALESCE((v_calc->>'total_amount_usd')::numeric, 0);
    NEW.payment_status := 'pending';
    NEW.status := 'pending';
    NEW.paid_at := NULL;
    NEW.payment_id := NULL;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_land_title_request_insert ON public.land_title_requests;
CREATE TRIGGER trg_land_title_request_insert
BEFORE INSERT ON public.land_title_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_land_title_request_insert();

-- 4) Verrouillage des champs sensibles en mise à jour
CREATE OR REPLACE FUNCTION public.enforce_land_title_request_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  );
BEGIN
  -- Garde-fou métier universel : pas d'approbation sans paiement
  IF NEW.status = 'approved' AND COALESCE(NEW.payment_status, '') <> 'paid' THEN
    RAISE EXCEPTION 'Approbation impossible : la demande n''est pas payée';
  END IF;

  IF auth.uid() IS NULL OR v_is_admin THEN
    RETURN NEW;
  END IF;

  -- Utilisateur standard : champs financiers et de décision figés
  NEW.payment_status := OLD.payment_status;
  NEW.total_amount_usd := OLD.total_amount_usd;
  NEW.fee_items := OLD.fee_items;
  NEW.paid_at := OLD.paid_at;
  NEW.payment_id := OLD.payment_id;
  NEW.reviewed_by := OLD.reviewed_by;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.processing_notes := OLD.processing_notes;
  NEW.rejection_reason := OLD.rejection_reason;
  NEW.status := OLD.status;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_land_title_request_update ON public.land_title_requests;
CREATE TRIGGER trg_land_title_request_update
BEFORE UPDATE ON public.land_title_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_land_title_request_update();

-- 5) Politique utilisateur avec WITH CHECK
DROP POLICY IF EXISTS "Users can update their own pending requests" ON public.land_title_requests;
CREATE POLICY "Users can update their own pending requests"
ON public.land_title_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending' AND payment_status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'pending' AND payment_status = 'pending');

-- 6) Annulation sécurisée d'une demande non payée
CREATE OR REPLACE FUNCTION public.cancel_land_title_request(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  UPDATE land_title_requests
  SET status = 'cancelled',
      payment_status = 'cancelled',
      updated_at = now()
  WHERE id = p_request_id
    AND user_id = auth.uid()
    AND payment_status = 'pending'
    AND status = 'pending';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_land_title_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_land_title_fees(text, text, numeric) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.map_land_title_type_key(text) TO authenticated, anon, service_role;

-- 7) Accès aux documents du bucket privé land-title-documents
DROP POLICY IF EXISTS "Land title docs owner read" ON storage.objects;
CREATE POLICY "Land title docs owner read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'land-title-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

DROP POLICY IF EXISTS "Land title docs owner insert" ON storage.objects;
CREATE POLICY "Land title docs owner insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'land-title-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Land title docs owner delete" ON storage.objects;
CREATE POLICY "Land title docs owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'land-title-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

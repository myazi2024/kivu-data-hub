CREATE OR REPLACE FUNCTION public.get_land_title_parcel_prefill(p_parcel_number text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; c record; v_permits jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  SELECT id, parcel_number, province, parcel_type, ville, commune, quartier, avenue, territoire, collectivite,
         groupement, village, parcel_sides, gps_coordinates, construction_type, construction_nature,
         construction_materials, declared_usage, area_sqm, standing, construction_year
    INTO p FROM cadastral_parcels WHERE parcel_number = p_parcel_number AND deleted_at IS NULL LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT property_category, floor_number INTO c FROM cadastral_contributions
   WHERE parcel_number = p_parcel_number AND status = 'approved' ORDER BY created_at DESC LIMIT 1;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('permit_number', permit_number, 'administrative_status', administrative_status,
     'issue_date', issue_date, 'issuing_service', issuing_service, 'validity_period_months', validity_period_months,
     'is_current', is_current) ORDER BY issue_date DESC), '[]'::jsonb)
    INTO v_permits FROM cadastral_building_permits WHERE parcel_id = p.id;
  RETURN jsonb_build_object(
    'province', p.province, 'parcel_type', p.parcel_type, 'ville', p.ville, 'commune', p.commune,
    'quartier', p.quartier, 'avenue', p.avenue, 'territoire', p.territoire, 'collectivite', p.collectivite,
    'groupement', p.groupement, 'village', p.village, 'parcel_sides', p.parcel_sides, 'gps_coordinates', p.gps_coordinates,
    'construction_type', p.construction_type, 'construction_nature', p.construction_nature,
    'construction_materials', p.construction_materials, 'declared_usage', p.declared_usage, 'area_sqm', p.area_sqm,
    'standing', p.standing, 'construction_year', p.construction_year,
    'property_category', c.property_category, 'floor_number', c.floor_number, 'permits', v_permits);
END; $$;
REVOKE ALL ON FUNCTION public.get_land_title_parcel_prefill(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_land_title_parcel_prefill(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_land_title_request_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_calc jsonb;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Demande non autorisée'; END IF;
    IF COALESCE(btrim(NEW.requester_last_name),'') = '' OR COALESCE(btrim(NEW.requester_first_name),'') = '' THEN
      RAISE EXCEPTION 'Nom et prénom du demandeur obligatoires'; END IF;
    IF regexp_replace(COALESCE(NEW.requester_phone,''), '[\s\-()]', '', 'g') !~ '^\+?243\d{9}$' THEN
      RAISE EXCEPTION 'Numéro de téléphone RDC invalide'; END IF;
    IF COALESCE(btrim(NEW.province),'') = '' THEN RAISE EXCEPTION 'Province obligatoire'; END IF;
    IF NEW.section_type NOT IN ('urbaine','rurale') THEN RAISE EXCEPTION 'Zone urbaine ou rurale obligatoire'; END IF;
    IF COALESCE(btrim(NEW.deduced_title_type),'') = '' THEN RAISE EXCEPTION 'Type de titre obligatoire'; END IF;
    v_calc := public.calculate_land_title_fees(NEW.deduced_title_type, NEW.section_type, NEW.area_sqm);
    NEW.fee_items := v_calc->'fee_items';
    NEW.total_amount_usd := COALESCE((v_calc->>'total_amount_usd')::numeric, 0);
    IF NEW.total_amount_usd <= 0 THEN RAISE EXCEPTION 'Aucun frais applicable à ce type de titre'; END IF;
    NEW.payment_status := 'pending'; NEW.status := 'pending';
    NEW.paid_at := NULL; NEW.payment_id := NULL; NEW.reviewed_by := NULL; NEW.reviewed_at := NULL;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_land_title_request_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_is_admin boolean := auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
BEGIN
  IF NEW.status = 'approved' AND COALESCE(NEW.payment_status, '') <> 'paid' THEN
    RAISE EXCEPTION 'Approbation impossible : la demande n''est pas payée';
  END IF;
  IF auth.uid() IS NULL OR v_is_admin THEN RETURN NEW; END IF;
  NEW.payment_status := OLD.payment_status; NEW.total_amount_usd := OLD.total_amount_usd;
  NEW.fee_items := OLD.fee_items; NEW.paid_at := OLD.paid_at; NEW.payment_id := OLD.payment_id;
  NEW.reviewed_by := OLD.reviewed_by; NEW.reviewed_at := OLD.reviewed_at;
  NEW.processing_notes := OLD.processing_notes; NEW.rejection_reason := OLD.rejection_reason;
  NEW.status := OLD.status;
  -- Données facturées figées après création
  NEW.deduced_title_type := OLD.deduced_title_type; NEW.area_sqm := OLD.area_sqm;
  NEW.section_type := OLD.section_type; NEW.province := OLD.province;
  NEW.ville := OLD.ville; NEW.commune := OLD.commune; NEW.quartier := OLD.quartier; NEW.avenue := OLD.avenue;
  NEW.territoire := OLD.territoire; NEW.collectivite := OLD.collectivite; NEW.groupement := OLD.groupement;
  NEW.village := OLD.village; NEW.user_id := OLD.user_id;
  RETURN NEW;
END; $$;
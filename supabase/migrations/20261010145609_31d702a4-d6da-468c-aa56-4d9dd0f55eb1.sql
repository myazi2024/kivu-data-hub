CREATE OR REPLACE FUNCTION public.submit_building_permit_contribution(
  p_parcel_number text, p_permit_type text, p_permit_number text, p_issue_date date,
  p_validity_months int, p_issuing_service text, p_document_path text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_parcel_id uuid;
  v_number text := upper(btrim(coalesce(p_permit_number,'')));
  v_type text := CASE WHEN p_permit_type IN ('regularization','regularisation') THEN 'regularization'
                      WHEN p_permit_type = 'construction' THEN 'construction' END;
  v_status text;
  v_id uuid;
  v_label text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  SELECT id INTO v_parcel_id FROM cadastral_parcels WHERE parcel_number = p_parcel_number AND deleted_at IS NULL LIMIT 1;
  IF v_parcel_id IS NULL THEN RAISE EXCEPTION 'Parcelle introuvable'; END IF;
  IF v_type IS NULL THEN RAISE EXCEPTION 'Type d''autorisation invalide'; END IF;
  IF v_number !~ '^[A-Z]{2,6}[-/.][0-9]{4}[-/.][0-9]{2,6}$' THEN
    RAISE EXCEPTION 'Format du N° autorisation invalide (ex : PC-2024-001)'; END IF;
  IF p_issue_date IS NULL OR p_issue_date > current_date THEN
    RAISE EXCEPTION 'La date de délivrance ne peut pas être dans le futur'; END IF;
  IF p_validity_months NOT IN (6,12,24,36) THEN RAISE EXCEPTION 'Durée de validité invalide'; END IF;
  IF coalesce(btrim(p_issuing_service),'') = '' THEN RAISE EXCEPTION 'Service émetteur obligatoire'; END IF;
  IF p_document_path IS NOT NULL AND split_part(p_document_path,'/',1) <> v_uid::text THEN
    RAISE EXCEPTION 'Document non autorisé'; END IF;

  IF EXISTS (SELECT 1 FROM cadastral_building_permits WHERE parcel_id = v_parcel_id AND upper(permit_number) = v_number)
     OR EXISTS (SELECT 1 FROM cadastral_contributions c, jsonb_array_elements(
                  CASE WHEN jsonb_typeof(c.building_permits)='array' THEN c.building_permits ELSE '[]'::jsonb END) e
                WHERE c.parcel_number = p_parcel_number AND c.status IN ('pending','approved','verified')
                  AND upper(coalesce(e->>'permit_number', e->>'permitNumber','')) = v_number) THEN
    RAISE EXCEPTION 'Le numéro d''autorisation % existe déjà pour cette parcelle', v_number;
  END IF;

  v_status := CASE WHEN (p_issue_date + make_interval(months => p_validity_months)) > current_date THEN 'valide' ELSE 'expiré' END;

  INSERT INTO cadastral_contributions (parcel_number, original_parcel_id, user_id, contribution_type, status, building_permits)
  VALUES (p_parcel_number, v_parcel_id, v_uid, 'update', 'pending', jsonb_build_array(jsonb_build_object(
    'permit_type', v_type, 'permit_number', v_number, 'issue_date', p_issue_date,
    'validity_period_months', p_validity_months, 'issuing_service', btrim(p_issuing_service),
    'administrative_status', v_status, 'permit_document_url', p_document_path, 'is_current', true)))
  RETURNING id INTO v_id;

  v_label := CASE WHEN v_type = 'construction' THEN 'Autorisation de bâtir' ELSE 'Autorisation de régularisation' END;
  INSERT INTO notifications (user_id, title, message)
  VALUES (v_uid, v_label || ' soumise',
          'Votre ' || lower(v_label) || ' pour la parcelle ' || p_parcel_number || ' a été soumise pour validation.');
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.submit_building_permit_contribution(text,text,text,date,int,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_building_permit_contribution(text,text,text,date,int,text,text) TO authenticated, service_role;
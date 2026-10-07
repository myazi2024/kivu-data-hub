CREATE OR REPLACE FUNCTION public.get_cadastral_parcel_data(p_parcel_number text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_parcel_id uuid; v_parcel jsonb; v_user_id uuid; v_free_access boolean := false;
  v_paid_services text[]; v_result jsonb; v_test_mode boolean := false;
  v_payment_enabled boolean := true; v_number text; v_gps jsonb; v_access jsonb; v_full jsonb;
BEGIN
  v_user_id := auth.uid();
  v_number := upper(btrim(coalesce(p_parcel_number, '')));
  IF v_number = '' THEN RETURN jsonb_build_object('error', 'not_found'); END IF;

  SELECT id, to_jsonb(gps_coordinates) INTO v_parcel_id, v_gps FROM cadastral_parcels
  WHERE upper(parcel_number) = v_number AND deleted_at IS NULL LIMIT 1;
  IF v_parcel_id IS NULL THEN RETURN jsonb_build_object('error', 'not_found'); END IF;

  SELECT COALESCE((config_value->>'enabled')::boolean, false) INTO v_test_mode
  FROM cadastral_search_config WHERE config_key = 'test_mode' AND is_active = true LIMIT 1;
  SELECT COALESCE((config_value->>'enabled')::boolean, true) INTO v_payment_enabled
  FROM cadastral_search_config WHERE config_key = 'payment_mode' AND is_active = true LIMIT 1;
  v_free_access := (NOT v_payment_enabled) OR v_test_mode;

  -- Accès actifs : { service_id: date de fin | null (sans limite) }. Seule source de la fiche et du PDF.
  IF v_user_id IS NOT NULL THEN
    SELECT jsonb_object_agg(service_type, CASE WHEN unlimited THEN NULL ELSE last_expiry END),
           array_agg(service_type)
      INTO v_access, v_paid_services
    FROM (SELECT service_type, bool_or(expires_at IS NULL) AS unlimited, max(expires_at) AS last_expiry
          FROM cadastral_service_access
          WHERE user_id = v_user_id AND upper(parcel_number) = v_number
            AND (expires_at IS NULL OR expires_at > now())
          GROUP BY service_type) s;
  END IF;
  v_access := COALESCE(v_access, '{}'::jsonb);
  v_paid_services := COALESCE(v_paid_services, ARRAY[]::text[]);

  SELECT to_jsonb(p.*) INTO v_full FROM cadastral_parcels p WHERE p.id = v_parcel_id;

  IF v_free_access OR 'information' = ANY(v_paid_services) THEN
    v_parcel := v_full;
  ELSE
    v_parcel := jsonb_build_object('id', v_full->'id', 'parcel_number', v_full->'parcel_number',
      'parcel_type', v_full->'parcel_type', 'commune', v_full->'commune', 'quartier', v_full->'quartier',
      'province', v_full->'province', 'ville', v_full->'ville');
    -- « Localisation et historique de bornage » acheté seul : champs de localisation uniquement.
    IF 'location_history' = ANY(v_paid_services) THEN
      v_parcel := v_parcel || jsonb_build_object('location', v_full->'location', 'avenue', v_full->'avenue',
        'house_number', v_full->'house_number', 'territoire', v_full->'territoire',
        'collectivite', v_full->'collectivite', 'groupement', v_full->'groupement', 'village', v_full->'village',
        'latitude', v_full->'latitude', 'longitude', v_full->'longitude', 'gps_coordinates', v_full->'gps_coordinates',
        'nombre_bornes', v_full->'nombre_bornes', 'parcel_sides', v_full->'parcel_sides',
        'surface_calculee_bornes', v_full->'surface_calculee_bornes', 'area_sqm', v_full->'area_sqm');
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'parcel', v_parcel,
    'access', jsonb_build_object('free_access', v_free_access, 'services', v_access),
    'data_availability', jsonb_build_object(
      'ownership_history', EXISTS (SELECT 1 FROM cadastral_ownership_history WHERE parcel_id = v_parcel_id),
      'tax_history', EXISTS (SELECT 1 FROM cadastral_tax_history WHERE parcel_id = v_parcel_id),
      'mortgage_history', EXISTS (SELECT 1 FROM cadastral_mortgages WHERE parcel_id = v_parcel_id),
      'boundary_history', EXISTS (SELECT 1 FROM cadastral_boundary_history WHERE parcel_id = v_parcel_id),
      'gps_coordinates', (v_gps IS NOT NULL AND jsonb_typeof(v_gps) = 'array' AND jsonb_array_length(v_gps) > 0),
      'building_permits', EXISTS (SELECT 1 FROM cadastral_building_permits WHERE parcel_id = v_parcel_id)
    ),
    'ownership_history', CASE WHEN v_free_access OR 'history' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(to_jsonb(oh.*) ORDER BY oh.ownership_start_date DESC), '[]'::jsonb)
        FROM cadastral_ownership_history oh WHERE oh.parcel_id = v_parcel_id) ELSE '[]'::jsonb END,
    'tax_history', CASE WHEN v_free_access OR 'obligations' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(to_jsonb(th.*) ORDER BY th.tax_year DESC), '[]'::jsonb)
        FROM cadastral_tax_history th WHERE th.parcel_id = v_parcel_id) ELSE '[]'::jsonb END,
    'mortgage_history', CASE WHEN v_free_access OR 'obligations' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(to_jsonb(m.*) || jsonb_build_object('cadastral_mortgage_payments',
            COALESCE((SELECT jsonb_agg(to_jsonb(mp.*) ORDER BY mp.payment_date DESC)
              FROM cadastral_mortgage_payments mp WHERE mp.mortgage_id = m.id), '[]'::jsonb))
          ORDER BY m.contract_date DESC), '[]'::jsonb)
        FROM cadastral_mortgages m WHERE m.parcel_id = v_parcel_id) ELSE '[]'::jsonb END,
    'boundary_history', CASE WHEN v_free_access OR 'location_history' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(to_jsonb(bh.*) ORDER BY bh.survey_date DESC), '[]'::jsonb)
        FROM cadastral_boundary_history bh WHERE bh.parcel_id = v_parcel_id) ELSE '[]'::jsonb END,
    'building_permits', CASE WHEN v_free_access OR 'information' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(to_jsonb(bp.*) ORDER BY bp.issue_date DESC), '[]'::jsonb)
        FROM cadastral_building_permits bp WHERE bp.parcel_id = v_parcel_id) ELSE '[]'::jsonb END,
    'land_disputes', CASE WHEN v_free_access OR 'land_disputes' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(to_jsonb(ld.*) ORDER BY ld.created_at DESC), '[]'::jsonb)
        FROM cadastral_land_disputes ld WHERE upper(ld.parcel_number) = v_number AND ld.dispute_type = 'report')
      ELSE '[]'::jsonb END,
    -- Lit la parcelle complète côté serveur : fonctionne même si « information » n'est pas acheté.
    'legal_verification', CASE WHEN v_free_access OR 'legal_verification' = ANY(v_paid_services) THEN
        jsonb_build_object('title_type', v_full->>'property_title_type',
          'title_reference', v_full->>'title_reference_number',
          'title_issue_date', v_full->>'title_issue_date',
          'title_document_url', v_full->>'property_title_document_url',
          'owner_document_url', v_full->>'owner_document_url',
          'has_dispute', COALESCE((v_full->>'has_dispute')::boolean, false),
          'is_subdivided', COALESCE((v_full->>'is_subdivided')::boolean, false),
          'parcel_verified', true)
      ELSE NULL END
  );
  RETURN v_result;
END;
$function$;
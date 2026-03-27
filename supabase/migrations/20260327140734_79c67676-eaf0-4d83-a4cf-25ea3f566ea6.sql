CREATE OR REPLACE FUNCTION public.get_cadastral_parcel_data(p_parcel_number text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_parcel_id uuid;
  v_parcel jsonb;
  v_user_id uuid;
  v_free_access boolean := false;
  v_paid_services text[];
  v_result jsonb;
  v_test_mode boolean := false;
  v_payment_enabled boolean := true;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  -- Find parcel
  SELECT id INTO v_parcel_id
  FROM cadastral_parcels
  WHERE parcel_number ILIKE p_parcel_number
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_parcel_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  -- Check test mode global
  SELECT COALESCE((config_value->>'enabled')::boolean, false) INTO v_test_mode
  FROM cadastral_search_config
  WHERE config_key = 'test_mode' AND is_active = true
  LIMIT 1;

  -- Check payment mode (enabled = true means payment required)
  SELECT COALESCE((config_value->>'enabled')::boolean, true) INTO v_payment_enabled
  FROM cadastral_search_config
  WHERE config_key = 'payment_mode' AND is_active = true
  LIMIT 1;

  -- Free access if payment disabled OR test mode active
  v_free_access := (NOT v_payment_enabled) OR v_test_mode;

  -- Get paid services for this user + parcel
  IF v_user_id IS NOT NULL THEN
    SELECT array_agg(service_type) INTO v_paid_services
    FROM cadastral_service_access
    WHERE user_id = v_user_id
      AND parcel_number ILIKE p_parcel_number
      AND (expires_at IS NULL OR expires_at > now());
  END IF;

  v_paid_services := COALESCE(v_paid_services, ARRAY[]::text[]);

  -- Get parcel base data (gated behind 'information' service)
  IF v_free_access OR 'information' = ANY(v_paid_services) THEN
    SELECT to_jsonb(p.*) INTO v_parcel
    FROM cadastral_parcels p
    WHERE p.id = v_parcel_id;
  ELSE
    -- Return minimal parcel info (just number and type for UI header)
    SELECT jsonb_build_object(
      'id', p.id,
      'parcel_number', p.parcel_number,
      'parcel_type', p.parcel_type,
      'commune', p.commune,
      'quartier', p.quartier,
      'province', p.province,
      'ville', p.ville
    ) INTO v_parcel
    FROM cadastral_parcels p
    WHERE p.id = v_parcel_id;
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'parcel', v_parcel,
    'ownership_history', CASE
      WHEN v_free_access OR 'history' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(to_jsonb(oh.*) ORDER BY oh.ownership_start_date DESC), '[]'::jsonb)
        FROM cadastral_ownership_history oh WHERE oh.parcel_id = v_parcel_id
      )
      ELSE '[]'::jsonb
    END,
    'tax_history', CASE
      WHEN v_free_access OR 'obligations' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(to_jsonb(th.*) ORDER BY th.tax_year DESC), '[]'::jsonb)
        FROM cadastral_tax_history th WHERE th.parcel_id = v_parcel_id
      )
      ELSE '[]'::jsonb
    END,
    'mortgage_history', CASE
      WHEN v_free_access OR 'obligations' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(
          to_jsonb(m.*) || jsonb_build_object('cadastral_mortgage_payments',
            COALESCE((
              SELECT jsonb_agg(to_jsonb(mp.*) ORDER BY mp.payment_date DESC)
              FROM cadastral_mortgage_payments mp WHERE mp.mortgage_id = m.id
            ), '[]'::jsonb)
          )
        ORDER BY m.contract_date DESC), '[]'::jsonb)
        FROM cadastral_mortgages m WHERE m.parcel_id = v_parcel_id
      )
      ELSE '[]'::jsonb
    END,
    'boundary_history', CASE
      WHEN v_free_access OR 'location_history' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(to_jsonb(bh.*) ORDER BY bh.survey_date DESC), '[]'::jsonb)
        FROM cadastral_boundary_history bh WHERE bh.parcel_id = v_parcel_id
      )
      ELSE '[]'::jsonb
    END,
    'building_permits', CASE
      WHEN v_free_access OR 'information' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(to_jsonb(bp.*) ORDER BY bp.issue_date DESC), '[]'::jsonb)
        FROM cadastral_building_permits bp WHERE bp.parcel_id = v_parcel_id
      )
      ELSE '[]'::jsonb
    END,
    'land_disputes', CASE
      WHEN v_free_access OR 'land_disputes' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(to_jsonb(ld.*) ORDER BY ld.created_at DESC), '[]'::jsonb)
        FROM cadastral_land_disputes ld 
        WHERE ld.parcel_number ILIKE p_parcel_number
          AND ld.dispute_type = 'report'
      )
      ELSE '[]'::jsonb
    END,
    'legal_verification', CASE
      WHEN v_free_access OR 'legal_verification' = ANY(v_paid_services) THEN
        jsonb_build_object(
          'title_type', v_parcel->>'property_title_type',
          'title_reference', v_parcel->>'title_reference_number',
          'title_issue_date', v_parcel->>'title_issue_date',
          'title_document_url', v_parcel->>'property_title_document_url',
          'owner_document_url', v_parcel->>'owner_document_url',
          'has_dispute', COALESCE((v_parcel->>'has_dispute')::boolean, false),
          'is_subdivided', COALESCE((v_parcel->>'is_subdivided')::boolean, false),
          'parcel_verified', true
        )
      ELSE NULL
    END
  );

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_cadastral_parcel_data(p_parcel_number text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parcel_id uuid;
  v_parcel jsonb;
  v_user_id uuid;
  v_bypass boolean := false;
  v_paid_services text[];
  v_result jsonb;
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

  -- Get parcel base data (always returned)
  SELECT to_jsonb(p.*) INTO v_parcel
  FROM cadastral_parcels p
  WHERE p.id = v_parcel_id;

  -- Check bypass mode
  SELECT (config_value->>'bypass_payment')::boolean INTO v_bypass
  FROM cadastral_search_config
  WHERE config_key = 'payment_mode' AND is_active = true
  LIMIT 1;

  v_bypass := COALESCE(v_bypass, false);

  -- Get paid services for this user + parcel
  IF v_user_id IS NOT NULL THEN
    SELECT array_agg(service_type) INTO v_paid_services
    FROM cadastral_service_access
    WHERE user_id = v_user_id
      AND parcel_number ILIKE p_parcel_number
      AND (expires_at IS NULL OR expires_at > now());
  END IF;

  v_paid_services := COALESCE(v_paid_services, ARRAY[]::text[]);

  -- Build result
  v_result := jsonb_build_object(
    'parcel', v_parcel,
    'ownership_history', CASE
      WHEN v_bypass OR 'history' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(to_jsonb(oh.*) ORDER BY oh.ownership_start_date DESC), '[]'::jsonb)
        FROM cadastral_ownership_history oh WHERE oh.parcel_id = v_parcel_id
      )
      ELSE '[]'::jsonb
    END,
    'tax_history', CASE
      WHEN v_bypass OR 'obligations' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(to_jsonb(th.*) ORDER BY th.tax_year DESC), '[]'::jsonb)
        FROM cadastral_tax_history th WHERE th.parcel_id = v_parcel_id
      )
      ELSE '[]'::jsonb
    END,
    'mortgage_history', CASE
      WHEN v_bypass OR 'obligations' = ANY(v_paid_services) THEN (
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
      WHEN v_bypass OR 'location_history' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(to_jsonb(bh.*) ORDER BY bh.survey_date DESC), '[]'::jsonb)
        FROM cadastral_boundary_history bh WHERE bh.parcel_id = v_parcel_id
      )
      ELSE '[]'::jsonb
    END,
    'building_permits', CASE
      WHEN v_bypass OR 'permits' = ANY(v_paid_services) THEN (
        SELECT COALESCE(jsonb_agg(to_jsonb(bp.*) ORDER BY bp.issue_date DESC), '[]'::jsonb)
        FROM cadastral_building_permits bp WHERE bp.parcel_id = v_parcel_id
      )
      ELSE '[]'::jsonb
    END
  );

  RETURN v_result;
END;
$$;

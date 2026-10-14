CREATE OR REPLACE FUNCTION public.get_analytics_tab_dataset(p_tab_key text, p_test boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_admin boolean;
  v_srcs text[];
  v_res jsonb := '{}'::jsonb;
  v_src text;
  v_sql text;
  v_part jsonb;
  v_geo text := 'id, parcel_number, parcel_type, land_district, province, ville, commune, quartier, avenue, territoire, collectivite, groupement, village';
  v_parcel_full text := 'id, parcel_number, parcel_type, land_district, province, ville, commune, quartier, avenue, territoire, collectivite, groupement, village, property_title_type, current_owner_legal_status, current_owner_since, declared_usage, construction_type, construction_nature, construction_year, area_sqm, gps_coordinates, lease_type, property_category, construction_materials, standing, lease_years, is_subdivided, has_dispute, is_title_in_current_owner_name, is_occupied, occupant_count, hosting_capacity, floor_number, additional_constructions, title_issue_date, created_at, building_shapes, building_height, apartment_number, apartment_length, apartment_width, apartment_height, apartment_orientation, sound_environment, nearby_noise_sources, parcel_sides, road_sides, servitude_data, construction_status, is_rented, rental_configuration, rental_units, rental_units_count, monthly_rent_usd, rental_start_date, would_sell_if_offered, resale_price_amount, resale_price_currency, resale_price_usd, has_recent_appraisal, appraisal_date, appraised_value_usd, market_listings, sale_listing';
  v_contrib text := 'id, parcel_number, parcel_type, land_district, province, ville, commune, quartier, avenue, territoire, collectivite, groupement, village, property_title_type, current_owner_legal_status, current_owner_since, declared_usage, construction_type, construction_nature, construction_year, contribution_type, area_sqm, appeal_submitted, appeal_status, lease_type, property_category, construction_materials, standing, status, reviewed_at, created_at, building_permits, building_shapes, building_height, sound_environment, nearby_noise_sources, is_occupied, occupant_count, hosting_capacity, lease_years, floor_number, apartment_number, apartment_length, apartment_width, apartment_height, apartment_orientation, additional_constructions, has_dispute, is_title_in_current_owner_name, title_issue_date, gps_coordinates, parcel_sides, road_sides, servitude_data, dispute_data, ownership_history, boundary_history, tax_history, mortgage_history, construction_status, actual_usage, actual_usage_other, operational_capacity, operational_capacity_unit, is_rented, rental_configuration, rental_units, rental_units_count, monthly_rent_usd, rental_start_date, would_sell_if_offered, resale_price_amount, resale_price_currency, resale_price_usd, has_recent_appraisal, appraisal_date, appraised_value_usd, market_listings, sale_listing';
  v_test_num text := '(coalesce(%s, '''') ILIKE ''TEST-%%'') = $1';
  v_test_fk text := '(EXISTS (SELECT 1 FROM cadastral_parcels p WHERE p.id = t.parcel_id AND p.parcel_number ILIKE ''TEST-%%'')) = $1';
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_admin := public.has_any_role(v_uid, ARRAY['admin','super_admin']::app_role[]);

  IF NOT (
    v_admin
    OR public.has_any_role(v_uid, ARRAY['expert_immobilier','mortgage_officer','notaire','geometre','urbaniste','partner']::app_role[])
    OR EXISTS (SELECT 1 FROM analytics_visual_access a
               WHERE a.user_id = v_uid AND a.tab_key = p_tab_key AND a.expires_at > now())
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_srcs := CASE p_tab_key
    WHEN 'title-requests' THEN ARRAY['parcels_full','contributions','ownershipHistory','titleRequests']
    WHEN 'parcels-titled' THEN ARRAY['parcels_full','contributions']
    WHEN 'ownership'      THEN ARRAY['parcels_full','ownershipHistory']
    WHEN 'contributions'  THEN ARRAY['parcels_geo','contributions']
    WHEN 'boundary'       THEN ARRAY['parcels_geo','contributions']
    WHEN 'rental-market'  THEN ARRAY['parcels_geo','contributions']
    WHEN 'expertise'      THEN ARRAY['parcels_geo','expertiseRequests']
    WHEN 'subdivision'    THEN ARRAY['parcels_geo','subdivisionRequests']
    WHEN 'disputes'       THEN ARRAY['parcels_geo','disputes']
    WHEN 'mortgages'      THEN ARRAY['parcels_geo','mortgages']
    WHEN 'taxes'          THEN ARRAY['parcels_geo','taxHistory']
    WHEN 'certificates'   THEN ARRAY['parcels_geo','certificates']
    WHEN 'invoices'       THEN ARRAY['parcels_geo','invoices']
    ELSE ARRAY[]::text[]
  END;

  FOREACH v_src IN ARRAY v_srcs LOOP
    v_sql := CASE v_src
      WHEN 'parcels_full' THEN format('SELECT %s FROM cadastral_parcels WHERE deleted_at IS NULL AND ' || format(v_test_num, 'parcel_number'), v_parcel_full)
      WHEN 'parcels_geo' THEN format('SELECT %s FROM cadastral_parcels WHERE deleted_at IS NULL AND ' || format(v_test_num, 'parcel_number'), v_geo)
      WHEN 'contributions' THEN format('SELECT %s FROM cadastral_contributions WHERE ' || format(v_test_num, 'parcel_number'),
        v_contrib || CASE WHEN v_admin THEN ', current_owners_details, is_suspicious, fraud_score, fraud_reason' ELSE '' END)
      WHEN 'titleRequests' THEN 'SELECT id, request_type, requester_type, requester_gender, owner_gender, nationality, section_type, province, ville, commune, quartier, avenue, territoire, collectivite, groupement, village, declared_usage, construction_type, construction_nature, construction_materials, standing, construction_year, floor_number, owner_legal_status, status, payment_status, total_amount_usd, area_sqm, deduced_title_type, estimated_processing_days, is_owner_same_as_requester, created_at, reviewed_at FROM land_title_requests WHERE ' || format(v_test_num, 'reference_number')
      WHEN 'ownershipHistory' THEN 'SELECT t.id, t.parcel_id, t.legal_status, t.mutation_type, t.ownership_start_date, t.ownership_end_date, t.created_at FROM cadastral_ownership_history t WHERE ' || v_test_fk
      WHEN 'taxHistory' THEN 'SELECT t.id, t.parcel_id, t.tax_year, t.payment_status, t.amount_usd, t.payment_date, t.created_at FROM cadastral_tax_history t WHERE ' || v_test_fk
      WHEN 'mortgages' THEN 'SELECT t.id, t.parcel_id, t.creditor_type, t.duration_months, t.mortgage_status, t.mortgage_amount_usd, t.contract_date, t.created_at FROM cadastral_mortgages t WHERE ' || v_test_fk
      WHEN 'expertiseRequests' THEN 'SELECT id, parcel_number, parcel_id, status, payment_status, market_value_usd, property_condition, construction_quality, construction_year, number_of_floors, total_built_area_sqm, road_access_type, has_electricity, has_water_supply, has_internet, has_sewage_system, has_parking, has_security_system, has_garden, garden_area_sqm, flood_risk_zone, erosion_risk_zone, distance_to_main_road_m, distance_to_market_km, distance_to_school_km, distance_to_hospital_km, expertise_date, assigned_at, created_at FROM real_estate_expertise_requests WHERE ' || format(v_test_num, 'parcel_number')
      WHEN 'subdivisionRequests' THEN 'SELECT id, parcel_number, parcel_id, status, number_of_lots, purpose_of_subdivision, requester_type, submission_payment_status, total_amount_usd, parent_parcel_area_sqm, reviewed_at, created_at FROM subdivision_requests WHERE ' || format(v_test_num, 'reference_number')
      WHEN 'disputes' THEN 'SELECT id, parcel_number, parcel_id, dispute_nature, dispute_type, current_status, resolution_level, lifting_status, lifting_request_reference, lifting_reason, declarant_quality, dispute_start_date, created_at FROM cadastral_land_disputes WHERE ' || format(v_test_num, 'parcel_number')
      WHEN 'certificates' THEN 'SELECT id, certificate_type, parcel_number, reference_number, status, generated_at FROM generated_certificates WHERE ' || format(v_test_num, 'reference_number')
      WHEN 'invoices' THEN 'SELECT id, invoice_number, parcel_number, total_amount_usd, status, payment_method, geographical_zone, discount_amount_usd, created_at FROM cadastral_invoices WHERE ' || format(v_test_num, 'parcel_number')
    END;

    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) FROM (%s) x', v_sql) INTO v_part USING p_test;
    v_res := v_res || jsonb_build_object(CASE WHEN v_src LIKE 'parcels_%' THEN 'parcels' ELSE v_src END, v_part);
  END LOOP;

  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.get_analytics_tab_dataset(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_analytics_tab_dataset(text, boolean) TO authenticated, service_role;
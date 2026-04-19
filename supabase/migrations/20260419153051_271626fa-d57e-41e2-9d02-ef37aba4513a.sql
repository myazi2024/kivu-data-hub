-- Fix: land_title_requests has no parcel_id column — only purge by reference_number
-- Patch both cleanup functions by removing the faulty DELETE ... WHERE parcel_id = ANY(...) lines.

CREATE OR REPLACE FUNCTION public.cleanup_all_test_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_parcel_ids uuid[];
  v_contrib_ids uuid[];
  v_exp_ids uuid[];
  v_mortgage_ids uuid[];
  v_deleted jsonb := '{}'::jsonb;
  v_count int;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  SELECT array_agg(id) INTO v_parcel_ids FROM cadastral_parcels WHERE parcel_number LIKE 'TEST-%';
  SELECT array_agg(id) INTO v_contrib_ids FROM cadastral_contributions WHERE parcel_number LIKE 'TEST-%';

  IF v_contrib_ids IS NOT NULL THEN
    DELETE FROM fraud_attempts WHERE contribution_id = ANY(v_contrib_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('fraud_attempts', v_count);
    DELETE FROM permit_payments WHERE contribution_id = ANY(v_contrib_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('permit_payments', v_count);
    DELETE FROM permit_admin_actions WHERE contribution_id = ANY(v_contrib_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('permit_admin_actions', v_count);
  END IF;

  DELETE FROM cadastral_contributor_codes WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_contributor_codes', v_count);

  DELETE FROM cadastral_service_access WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_service_access', v_count);

  DELETE FROM payment_transactions WHERE metadata->>'test_mode' = 'true' OR transaction_reference LIKE 'TEST-TXN-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('payment_transactions', v_count);

  DELETE FROM cadastral_invoices WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_invoices', v_count);

  DELETE FROM cadastral_contributions WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_contributions', v_count);

  -- Tables with parcel_id (land_title_requests EXCLUDED — no parcel_id column)
  IF v_parcel_ids IS NOT NULL THEN
    DELETE FROM mutation_requests WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('mutation_requests_by_parcel', v_count);

    DELETE FROM subdivision_requests WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('subdivision_requests_by_parcel', v_count);

    DELETE FROM cadastral_land_disputes WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_land_disputes_by_parcel', v_count);

    SELECT array_agg(id) INTO v_exp_ids FROM real_estate_expertise_requests WHERE parcel_id = ANY(v_parcel_ids);
    IF v_exp_ids IS NOT NULL THEN
      DELETE FROM expertise_payments WHERE expertise_request_id = ANY(v_exp_ids);
      GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('expertise_payments_by_parcel', v_count);
      DELETE FROM real_estate_expertise_requests WHERE id = ANY(v_exp_ids);
      GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('real_estate_expertise_requests_by_parcel', v_count);
    END IF;
  END IF;

  -- Reference-based pass (orphans + land_title_requests)
  DELETE FROM mutation_requests WHERE reference_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('mutation_requests', v_count);

  DELETE FROM subdivision_requests WHERE reference_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('subdivision_requests', v_count);

  DELETE FROM land_title_requests WHERE reference_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('land_title_requests', v_count);

  DELETE FROM cadastral_land_disputes WHERE reference_number LIKE 'TEST-%' OR parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_land_disputes', v_count);

  SELECT array_agg(id) INTO v_exp_ids FROM real_estate_expertise_requests WHERE reference_number LIKE 'TEST-%';
  IF v_exp_ids IS NOT NULL THEN
    DELETE FROM expertise_payments WHERE expertise_request_id = ANY(v_exp_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('expertise_payments', v_count);
  END IF;
  DELETE FROM real_estate_expertise_requests WHERE reference_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('real_estate_expertise_requests', v_count);

  -- Parcel children
  IF v_parcel_ids IS NOT NULL THEN
    SELECT array_agg(id) INTO v_mortgage_ids FROM cadastral_mortgages WHERE parcel_id = ANY(v_parcel_ids);
    IF v_mortgage_ids IS NOT NULL THEN
      DELETE FROM cadastral_mortgage_payments WHERE mortgage_id = ANY(v_mortgage_ids);
      GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_mortgage_payments', v_count);
    END IF;
    DELETE FROM cadastral_ownership_history WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_ownership_history', v_count);
    DELETE FROM cadastral_tax_history WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_tax_history', v_count);
    DELETE FROM cadastral_boundary_history WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_boundary_history', v_count);
    DELETE FROM cadastral_mortgages WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_mortgages', v_count);
    DELETE FROM cadastral_building_permits WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_building_permits', v_count);
  END IF;

  DELETE FROM cadastral_parcels WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_parcels', v_count);

  DELETE FROM cadastral_boundary_conflicts WHERE reporting_parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_boundary_conflicts', v_count);

  DELETE FROM generated_certificates WHERE reference_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('generated_certificates', v_count);

  PERFORM log_audit_action('MANUAL_TEST_DATA_CLEANUP', 'cadastral_contributions', NULL, NULL, v_deleted);

  RETURN v_deleted;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_all_test_data_auto()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_parcel_ids uuid[];
  v_contrib_ids uuid[];
  v_exp_ids uuid[];
  v_mortgage_ids uuid[];
  v_deleted jsonb := '{}'::jsonb;
  v_count int;
  v_retention int := 7;
  v_cutoff timestamptz;
  v_cfg jsonb;
BEGIN
  SELECT config_value INTO v_cfg FROM cadastral_search_config
    WHERE config_key = 'test_mode' AND is_active = true LIMIT 1;
  IF v_cfg IS NULL OR (v_cfg->>'enabled')::bool IS DISTINCT FROM true OR (v_cfg->>'auto_cleanup')::bool IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('skipped', true);
  END IF;
  v_retention := COALESCE((v_cfg->>'test_data_retention_days')::int, 7);
  v_cutoff := now() - (v_retention || ' days')::interval;

  SELECT array_agg(id) INTO v_parcel_ids FROM cadastral_parcels WHERE parcel_number LIKE 'TEST-%' AND created_at < v_cutoff;
  SELECT array_agg(id) INTO v_contrib_ids FROM cadastral_contributions WHERE parcel_number LIKE 'TEST-%' AND created_at < v_cutoff;

  IF v_contrib_ids IS NOT NULL THEN
    DELETE FROM fraud_attempts WHERE contribution_id = ANY(v_contrib_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('fraud_attempts', v_count);
    DELETE FROM permit_payments WHERE contribution_id = ANY(v_contrib_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('permit_payments', v_count);
    DELETE FROM permit_admin_actions WHERE contribution_id = ANY(v_contrib_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('permit_admin_actions', v_count);
  END IF;

  DELETE FROM cadastral_contributor_codes WHERE parcel_number LIKE 'TEST-%' AND created_at < v_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_contributor_codes', v_count);
  DELETE FROM cadastral_service_access WHERE parcel_number LIKE 'TEST-%' AND created_at < v_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_service_access', v_count);
  DELETE FROM payment_transactions WHERE (metadata->>'test_mode' = 'true' OR transaction_reference LIKE 'TEST-TXN-%') AND created_at < v_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('payment_transactions', v_count);
  DELETE FROM cadastral_invoices WHERE parcel_number LIKE 'TEST-%' AND created_at < v_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_invoices', v_count);
  DELETE FROM cadastral_contributions WHERE parcel_number LIKE 'TEST-%' AND created_at < v_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_contributions', v_count);

  IF v_parcel_ids IS NOT NULL THEN
    DELETE FROM mutation_requests WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('mutation_requests_by_parcel', v_count);
    DELETE FROM subdivision_requests WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('subdivision_requests_by_parcel', v_count);
    DELETE FROM cadastral_land_disputes WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_land_disputes_by_parcel', v_count);

    SELECT array_agg(id) INTO v_exp_ids FROM real_estate_expertise_requests WHERE parcel_id = ANY(v_parcel_ids);
    IF v_exp_ids IS NOT NULL THEN
      DELETE FROM expertise_payments WHERE expertise_request_id = ANY(v_exp_ids);
      GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('expertise_payments_by_parcel', v_count);
      DELETE FROM real_estate_expertise_requests WHERE id = ANY(v_exp_ids);
      GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('real_estate_expertise_requests_by_parcel', v_count);
    END IF;
  END IF;

  DELETE FROM mutation_requests WHERE reference_number LIKE 'TEST-%' AND created_at < v_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('mutation_requests', v_count);
  DELETE FROM subdivision_requests WHERE reference_number LIKE 'TEST-%' AND created_at < v_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('subdivision_requests', v_count);
  DELETE FROM land_title_requests WHERE reference_number LIKE 'TEST-%' AND created_at < v_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('land_title_requests', v_count);
  DELETE FROM cadastral_land_disputes WHERE (reference_number LIKE 'TEST-%' OR parcel_number LIKE 'TEST-%') AND created_at < v_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_land_disputes', v_count);

  SELECT array_agg(id) INTO v_exp_ids FROM real_estate_expertise_requests WHERE reference_number LIKE 'TEST-%' AND created_at < v_cutoff;
  IF v_exp_ids IS NOT NULL THEN
    DELETE FROM expertise_payments WHERE expertise_request_id = ANY(v_exp_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('expertise_payments', v_count);
  END IF;
  DELETE FROM real_estate_expertise_requests WHERE reference_number LIKE 'TEST-%' AND created_at < v_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('real_estate_expertise_requests', v_count);

  IF v_parcel_ids IS NOT NULL THEN
    SELECT array_agg(id) INTO v_mortgage_ids FROM cadastral_mortgages WHERE parcel_id = ANY(v_parcel_ids);
    IF v_mortgage_ids IS NOT NULL THEN
      DELETE FROM cadastral_mortgage_payments WHERE mortgage_id = ANY(v_mortgage_ids);
      GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_mortgage_payments', v_count);
    END IF;
    DELETE FROM cadastral_ownership_history WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_ownership_history', v_count);
    DELETE FROM cadastral_tax_history WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_tax_history', v_count);
    DELETE FROM cadastral_boundary_history WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_boundary_history', v_count);
    DELETE FROM cadastral_mortgages WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_mortgages', v_count);
    DELETE FROM cadastral_building_permits WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_building_permits', v_count);
  END IF;

  DELETE FROM cadastral_parcels WHERE parcel_number LIKE 'TEST-%' AND created_at < v_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_parcels', v_count);
  DELETE FROM cadastral_boundary_conflicts WHERE reporting_parcel_number LIKE 'TEST-%' AND created_at < v_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_boundary_conflicts', v_count);
  DELETE FROM generated_certificates WHERE reference_number LIKE 'TEST-%' AND generated_at < v_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('generated_certificates', v_count);

  PERFORM log_audit_action('AUTO_TEST_DATA_CLEANUP', 'cadastral_contributions', NULL,
    jsonb_build_object('retention_days', v_retention, 'cutoff', v_cutoff), v_deleted);

  RETURN v_deleted;
END;
$function$;
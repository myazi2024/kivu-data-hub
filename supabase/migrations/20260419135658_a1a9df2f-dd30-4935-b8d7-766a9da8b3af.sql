-- ============================================================
-- Canonical FK-safe cleanup functions for TEST data
-- ============================================================

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

  -- 1. Children of contributions (via contribution_id)
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

  -- 2. Tables referencing cadastral_parcels.id — purge BEFORE parcels (by parcel_id)
  IF v_parcel_ids IS NOT NULL THEN
    DELETE FROM mutation_requests WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('mutation_requests_by_parcel', v_count);

    DELETE FROM subdivision_requests WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('subdivision_requests_by_parcel', v_count);

    DELETE FROM land_title_requests WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('land_title_requests_by_parcel', v_count);

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

  -- 3. Reference-based pass for orphan TEST records
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

  -- 4. Parcel children (mortgages/payments/history/permits)
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

  -- 5. Parcels (now safe)
  DELETE FROM cadastral_parcels WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_parcels', v_count);

  -- 6. Independent tables
  DELETE FROM cadastral_boundary_conflicts WHERE reporting_parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_boundary_conflicts', v_count);

  DELETE FROM generated_certificates WHERE reference_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('generated_certificates', v_count);

  PERFORM log_audit_action(
    'MANUAL_TEST_DATA_CLEANUP',
    'cadastral_contributions',
    NULL,
    NULL,
    v_deleted
  );

  RETURN v_deleted;
END;
$function$;


CREATE OR REPLACE FUNCTION public.cleanup_all_test_data_auto()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '120s'
AS $function$
DECLARE
  result jsonb := '{}'::jsonb;
  cnt integer;
  v_parcel_ids uuid[];
  v_contrib_ids uuid[];
  v_exp_ids uuid[];
  v_mortgage_ids uuid[];
  cfg jsonb;
  retention_days int := 7;
  cutoff timestamptz;
  total_deleted integer := 0;
BEGIN
  SELECT config_value INTO cfg
    FROM public.cadastral_search_config
    WHERE config_key = 'test_mode' AND is_active = true
    LIMIT 1;

  IF cfg IS NULL OR (cfg->>'enabled')::boolean IS DISTINCT FROM true OR (cfg->>'auto_cleanup')::boolean IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'auto_cleanup disabled');
  END IF;

  retention_days := COALESCE((cfg->>'test_data_retention_days')::int, 7);
  cutoff := now() - make_interval(days => retention_days);

  SELECT array_agg(id) INTO v_parcel_ids
    FROM public.cadastral_parcels
    WHERE parcel_number LIKE 'TEST-%' AND created_at < cutoff;

  SELECT array_agg(id) INTO v_contrib_ids
    FROM public.cadastral_contributions
    WHERE parcel_number LIKE 'TEST-%' AND created_at < cutoff;

  -- 1. Children of contributions
  IF v_contrib_ids IS NOT NULL THEN
    DELETE FROM public.fraud_attempts WHERE contribution_id = ANY(v_contrib_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('fraud_attempts', cnt);

    DELETE FROM public.permit_payments WHERE contribution_id = ANY(v_contrib_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('permit_payments', cnt);

    DELETE FROM public.permit_admin_actions WHERE contribution_id = ANY(v_contrib_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('permit_admin_actions', cnt);
  END IF;

  DELETE FROM public.cadastral_contributor_codes
    WHERE parcel_number LIKE 'TEST-%' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('cadastral_contributor_codes', cnt);

  DELETE FROM public.cadastral_service_access
    WHERE parcel_number LIKE 'TEST-%' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('cadastral_service_access', cnt);

  DELETE FROM public.payment_transactions
    WHERE (metadata->>'test_mode' = 'true' OR transaction_reference LIKE 'TEST-TXN-%')
      AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('payment_transactions', cnt);

  DELETE FROM public.cadastral_invoices
    WHERE parcel_number LIKE 'TEST-%' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('cadastral_invoices', cnt);

  DELETE FROM public.cadastral_contributions
    WHERE parcel_number LIKE 'TEST-%' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('cadastral_contributions', cnt);

  -- 2. Tables referencing cadastral_parcels.id — purge BEFORE parcels
  IF v_parcel_ids IS NOT NULL THEN
    DELETE FROM public.mutation_requests WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('mutation_requests_by_parcel', cnt);

    DELETE FROM public.subdivision_requests WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('subdivision_requests_by_parcel', cnt);

    DELETE FROM public.land_title_requests WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('land_title_requests_by_parcel', cnt);

    DELETE FROM public.cadastral_land_disputes WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('cadastral_land_disputes_by_parcel', cnt);

    SELECT array_agg(id) INTO v_exp_ids
      FROM public.real_estate_expertise_requests WHERE parcel_id = ANY(v_parcel_ids);
    IF v_exp_ids IS NOT NULL THEN
      DELETE FROM public.expertise_payments WHERE expertise_request_id = ANY(v_exp_ids);
      GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('expertise_payments_by_parcel', cnt);
      DELETE FROM public.real_estate_expertise_requests WHERE id = ANY(v_exp_ids);
      GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('real_estate_expertise_requests_by_parcel', cnt);
    END IF;
  END IF;

  -- 3. Reference-based pass (orphans)
  DELETE FROM public.mutation_requests
    WHERE reference_number LIKE 'TEST-%' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('mutation_requests', cnt);

  DELETE FROM public.subdivision_requests
    WHERE reference_number LIKE 'TEST-%' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('subdivision_requests', cnt);

  DELETE FROM public.land_title_requests
    WHERE reference_number LIKE 'TEST-%' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('land_title_requests', cnt);

  DELETE FROM public.cadastral_land_disputes
    WHERE (reference_number LIKE 'TEST-%' OR parcel_number LIKE 'TEST-%') AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('cadastral_land_disputes', cnt);

  SELECT array_agg(id) INTO v_exp_ids
    FROM public.real_estate_expertise_requests
    WHERE reference_number LIKE 'TEST-%' AND created_at < cutoff;
  IF v_exp_ids IS NOT NULL THEN
    DELETE FROM public.expertise_payments WHERE expertise_request_id = ANY(v_exp_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('expertise_payments', cnt);
  END IF;
  DELETE FROM public.real_estate_expertise_requests
    WHERE reference_number LIKE 'TEST-%' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('real_estate_expertise_requests', cnt);

  -- 4. Parcel children
  IF v_parcel_ids IS NOT NULL THEN
    SELECT array_agg(id) INTO v_mortgage_ids
      FROM public.cadastral_mortgages WHERE parcel_id = ANY(v_parcel_ids);
    IF v_mortgage_ids IS NOT NULL THEN
      DELETE FROM public.cadastral_mortgage_payments WHERE mortgage_id = ANY(v_mortgage_ids);
      GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('cadastral_mortgage_payments', cnt);
    END IF;

    DELETE FROM public.cadastral_ownership_history WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('cadastral_ownership_history', cnt);

    DELETE FROM public.cadastral_tax_history WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('cadastral_tax_history', cnt);

    DELETE FROM public.cadastral_boundary_history WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('cadastral_boundary_history', cnt);

    DELETE FROM public.cadastral_mortgages WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('cadastral_mortgages', cnt);

    DELETE FROM public.cadastral_building_permits WHERE parcel_id = ANY(v_parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('cadastral_building_permits', cnt);
  END IF;

  -- 5. Parcels
  DELETE FROM public.cadastral_parcels
    WHERE parcel_number LIKE 'TEST-%' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('cadastral_parcels', cnt);

  -- 6. Independent tables
  DELETE FROM public.cadastral_boundary_conflicts
    WHERE reporting_parcel_number LIKE 'TEST-%' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('cadastral_boundary_conflicts', cnt);

  DELETE FROM public.generated_certificates
    WHERE reference_number LIKE 'TEST-%' AND generated_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('generated_certificates', cnt);

  SELECT COALESCE(SUM(value::int), 0) INTO total_deleted
    FROM jsonb_each_text(result);

  PERFORM public.log_audit_action(
    'AUTO_TEST_DATA_CLEANUP',
    'cadastral_contributions',
    NULL,
    jsonb_build_object('retention_days', retention_days, 'cutoff', cutoff),
    jsonb_build_object('total', total_deleted, 'per_table', result)
  );

  RETURN result;
END;
$function$;
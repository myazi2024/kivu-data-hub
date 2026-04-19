CREATE OR REPLACE FUNCTION public.cleanup_all_test_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parcel_ids uuid[];
  v_contrib_ids uuid[];
  v_exp_ids uuid[];
  v_mortgage_ids uuid[];
  v_deleted jsonb := '{}'::jsonb;
  v_count int;
BEGIN
  -- Admin check
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  -- Resolve TEST parcel ids and contribution ids
  SELECT array_agg(id) INTO v_parcel_ids FROM cadastral_parcels WHERE parcel_number LIKE 'TEST-%';
  SELECT array_agg(id) INTO v_contrib_ids FROM cadastral_contributions WHERE parcel_number LIKE 'TEST-%';

  -- 1. Children of contributions
  IF v_contrib_ids IS NOT NULL THEN
    DELETE FROM fraud_attempts WHERE contribution_id = ANY(v_contrib_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('fraud_attempts', v_count);

    -- permit_payments / permit_admin_actions are linked via contribution_id (NOT permit_id)
    DELETE FROM permit_payments WHERE contribution_id = ANY(v_contrib_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('permit_payments', v_count);

    DELETE FROM permit_admin_actions WHERE contribution_id = ANY(v_contrib_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('permit_admin_actions', v_count);
  END IF;

  DELETE FROM cadastral_contributor_codes WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_contributor_codes', v_count);

  -- 2. Service access + payment transactions + invoices
  DELETE FROM cadastral_service_access WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_service_access', v_count);

  DELETE FROM payment_transactions WHERE metadata->>'test_mode' = 'true' OR transaction_reference LIKE 'TEST-TXN-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('payment_transactions', v_count);

  DELETE FROM cadastral_invoices WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_invoices', v_count);

  -- 3. Contributions (now safe — permit_payments/permit_admin_actions purged above)
  DELETE FROM cadastral_contributions WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_contributions', v_count);

  -- 4. Tables referencing cadastral_parcels.id — purge BEFORE parcels
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

  -- 5. Reference-based pass for orphans
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

  -- 6. Parcel children (mortgages/payments/history/permits)
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

  -- 7. Parcels (now safe)
  DELETE FROM cadastral_parcels WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_parcels', v_count);

  -- 8. Independent tables
  DELETE FROM cadastral_boundary_conflicts WHERE reporting_parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('cadastral_boundary_conflicts', v_count);

  DELETE FROM generated_certificates WHERE reference_number LIKE 'TEST-%';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('generated_certificates', v_count);

  -- Audit log
  PERFORM log_audit_action(
    'MANUAL_TEST_DATA_CLEANUP',
    'cadastral_contributions',
    NULL,
    NULL,
    v_deleted
  );

  RETURN v_deleted;
END;
$$;
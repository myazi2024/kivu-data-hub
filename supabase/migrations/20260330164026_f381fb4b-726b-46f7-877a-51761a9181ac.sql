
CREATE OR REPLACE FUNCTION public.cleanup_all_test_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  cnt integer;
  contrib_ids uuid[];
  parcel_ids uuid[];
BEGIN
  -- Vérifier que l'appelant est admin
  IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Accès refusé: rôle admin requis';
  END IF;

  -- Collect IDs needed for FK-safe joins
  SELECT array_agg(id) INTO contrib_ids
  FROM cadastral_contributions WHERE parcel_number ILIKE 'TEST-%';

  SELECT array_agg(id) INTO parcel_ids
  FROM cadastral_parcels WHERE parcel_number ILIKE 'TEST-%';

  -- 1. Fraud attempts (FK → contributions)
  IF contrib_ids IS NOT NULL AND array_length(contrib_ids, 1) > 0 THEN
    DELETE FROM fraud_attempts WHERE contribution_id = ANY(contrib_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('fraud_attempts', cnt);
  END IF;

  -- 2. Contributor codes
  DELETE FROM cadastral_contributor_codes WHERE parcel_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_contributor_codes', cnt);

  -- 3. Service access (FK → invoices)
  DELETE FROM cadastral_service_access WHERE parcel_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_service_access', cnt);

  -- 4. Payment transactions
  DELETE FROM payment_transactions WHERE metadata->>'test_mode' = 'true';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('payment_transactions', cnt);

  -- 5. Invoices
  DELETE FROM cadastral_invoices WHERE parcel_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_invoices', cnt);

  -- 6. Contributions
  DELETE FROM cadastral_contributions WHERE parcel_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_contributions', cnt);

  -- 7. Parcel children
  IF parcel_ids IS NOT NULL AND array_length(parcel_ids, 1) > 0 THEN
    DELETE FROM cadastral_ownership_history WHERE parcel_id = ANY(parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('cadastral_ownership_history', cnt);

    DELETE FROM cadastral_tax_history WHERE parcel_id = ANY(parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('cadastral_tax_history', cnt);

    DELETE FROM cadastral_boundary_history WHERE parcel_id = ANY(parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('cadastral_boundary_history', cnt);

    DELETE FROM cadastral_mortgages WHERE parcel_id = ANY(parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('cadastral_mortgages', cnt);

    DELETE FROM cadastral_building_permits WHERE parcel_id = ANY(parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('cadastral_building_permits', cnt);
  END IF;

  -- 8. Parcels
  DELETE FROM cadastral_parcels WHERE parcel_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_parcels', cnt);

  -- 9. Independent tables
  DELETE FROM real_estate_expertise_requests WHERE reference_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('real_estate_expertise_requests', cnt);

  DELETE FROM cadastral_land_disputes WHERE parcel_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_land_disputes', cnt);

  DELETE FROM land_title_requests WHERE reference_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('land_title_requests', cnt);

  DELETE FROM cadastral_boundary_conflicts WHERE reporting_parcel_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_boundary_conflicts', cnt);

  DELETE FROM generated_certificates WHERE reference_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('generated_certificates', cnt);

  DELETE FROM mutation_requests WHERE reference_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('mutation_requests', cnt);

  DELETE FROM subdivision_requests WHERE reference_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('subdivision_requests', cnt);

  -- Audit log
  PERFORM log_audit_action(
    'TEST_DATA_CLEANUP_SERVER',
    'cadastral_contributions',
    NULL,
    NULL,
    jsonb_build_object('deleted', result)
  );

  RETURN result;
END;
$$;

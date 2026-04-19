CREATE OR REPLACE FUNCTION public.cleanup_all_test_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '120s'
AS $function$
DECLARE
  result jsonb := '{}'::jsonb;
  cnt integer;
  parcel_ids uuid[];
  total_deleted integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  DELETE FROM public.fraud_attempts WHERE contribution_id IN (
    SELECT id FROM public.cadastral_contributions WHERE parcel_number LIKE 'TEST-%'
  );
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('fraud_attempts', cnt);

  DELETE FROM public.cadastral_contributor_codes WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_contributor_codes', cnt);

  DELETE FROM public.cadastral_service_access WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_service_access', cnt);

  DELETE FROM public.expertise_payments WHERE expertise_request_id IN (
    SELECT id FROM public.real_estate_expertise_requests WHERE reference_number LIKE 'TEST-%'
  );
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('expertise_payments', cnt);

  DELETE FROM public.payment_transactions WHERE metadata->>'test_mode' = 'true';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('payment_transactions', cnt);

  DELETE FROM public.real_estate_expertise_requests WHERE reference_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('real_estate_expertise_requests', cnt);

  DELETE FROM public.cadastral_invoices WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_invoices', cnt);

  DELETE FROM public.cadastral_contributions WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_contributions', cnt);

  DELETE FROM public.cadastral_boundary_conflicts
    WHERE reporting_parcel_number LIKE 'TEST-%' OR conflicting_parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_boundary_conflicts', cnt);

  -- Resolve parcel_ids early to also catch FK children whose reference doesn't match TEST-%
  SELECT array_agg(id) INTO parcel_ids FROM public.cadastral_parcels WHERE parcel_number LIKE 'TEST-%';

  -- FK-safe: purge ALL tables referencing cadastral_parcels.id BEFORE deleting parcels
  -- Double pass: by parcel_id (catches legacy refs without TEST prefix) + by reference_number (catches orphan TEST refs without parcel_id)

  -- mutation_requests
  IF parcel_ids IS NOT NULL AND array_length(parcel_ids, 1) > 0 THEN
    DELETE FROM public.mutation_requests WHERE parcel_id = ANY(parcel_ids);
  END IF;
  DELETE FROM public.mutation_requests WHERE reference_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('mutation_requests', cnt);

  -- subdivision_requests (and child lots/roads via FK cascade if defined; otherwise explicit)
  IF parcel_ids IS NOT NULL AND array_length(parcel_ids, 1) > 0 THEN
    BEGIN
      DELETE FROM public.subdivision_lots WHERE subdivision_request_id IN (
        SELECT id FROM public.subdivision_requests WHERE parcel_id = ANY(parcel_ids) OR reference_number LIKE 'TEST-%'
      );
    EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN
      DELETE FROM public.subdivision_roads WHERE subdivision_request_id IN (
        SELECT id FROM public.subdivision_requests WHERE parcel_id = ANY(parcel_ids) OR reference_number LIKE 'TEST-%'
      );
    EXCEPTION WHEN undefined_table THEN NULL; END;
    DELETE FROM public.subdivision_requests WHERE parcel_id = ANY(parcel_ids);
  END IF;
  DELETE FROM public.subdivision_requests WHERE reference_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('subdivision_requests', cnt);

  -- land_title_requests
  IF parcel_ids IS NOT NULL AND array_length(parcel_ids, 1) > 0 THEN
    DELETE FROM public.land_title_requests WHERE parcel_id = ANY(parcel_ids);
  END IF;
  DELETE FROM public.land_title_requests WHERE reference_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('land_title_requests', cnt);

  -- cadastral_land_disputes
  IF parcel_ids IS NOT NULL AND array_length(parcel_ids, 1) > 0 THEN
    DELETE FROM public.cadastral_land_disputes WHERE parcel_id = ANY(parcel_ids);
  END IF;
  DELETE FROM public.cadastral_land_disputes WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_land_disputes', cnt);

  -- Permit children (admin actions / payments) before permits
  IF parcel_ids IS NOT NULL AND array_length(parcel_ids, 1) > 0 THEN
    BEGIN
      DELETE FROM public.permit_admin_actions WHERE permit_id IN (
        SELECT id FROM public.cadastral_building_permits WHERE parcel_id = ANY(parcel_ids)
      );
    EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN
      DELETE FROM public.permit_payments WHERE permit_id IN (
        SELECT id FROM public.cadastral_building_permits WHERE parcel_id = ANY(parcel_ids)
      );
    EXCEPTION WHEN undefined_table THEN NULL; END;
  END IF;

  -- Parcel-children (mortgages/payments/history/permits)
  IF parcel_ids IS NOT NULL AND array_length(parcel_ids, 1) > 0 THEN
    DELETE FROM public.cadastral_mortgage_payments WHERE mortgage_id IN (
      SELECT id FROM public.cadastral_mortgages WHERE parcel_id = ANY(parcel_ids)
    );
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('cadastral_mortgage_payments', cnt);

    DELETE FROM public.cadastral_mortgages WHERE parcel_id = ANY(parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('cadastral_mortgages', cnt);

    DELETE FROM public.cadastral_tax_history WHERE parcel_id = ANY(parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('cadastral_tax_history', cnt);

    DELETE FROM public.cadastral_ownership_history WHERE parcel_id = ANY(parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('cadastral_ownership_history', cnt);

    DELETE FROM public.cadastral_boundary_history WHERE parcel_id = ANY(parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('cadastral_boundary_history', cnt);

    DELETE FROM public.cadastral_building_permits WHERE parcel_id = ANY(parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('cadastral_building_permits', cnt);
  END IF;

  -- Now safe to delete parcels
  DELETE FROM public.cadastral_parcels WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_parcels', cnt);

  BEGIN
    DELETE FROM public.generated_certificates WHERE reference_number LIKE 'TEST-%';
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('generated_certificates', cnt);
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Compute total
  SELECT COALESCE(SUM(value::int), 0) INTO total_deleted
    FROM jsonb_each_text(result);

  -- Unified audit log
  PERFORM public.log_audit_action(
    'MANUAL_TEST_DATA_CLEANUP',
    'cadastral_contributions',
    NULL,
    NULL,
    jsonb_build_object('total', total_deleted, 'per_table', result)
  );

  RETURN result;
END;
$function$;
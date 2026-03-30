CREATE OR REPLACE FUNCTION public.cleanup_all_test_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  cnt integer;
  parcel_ids uuid[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  -- 1. fraud_attempts (FK → contributions)
  DELETE FROM public.fraud_attempts WHERE contribution_id IN (
    SELECT id FROM public.cadastral_contributions WHERE parcel_number ILIKE 'TEST-%'
  );
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('fraud_attempts', cnt);

  -- 2. contributor_codes (FK → contributions, invoices)
  DELETE FROM public.cadastral_contributor_codes WHERE parcel_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_contributor_codes', cnt);

  -- 3. service_access (FK → invoices)
  DELETE FROM public.cadastral_service_access WHERE parcel_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_service_access', cnt);

  -- 4. expertise_payments (FK → real_estate_expertise_requests)
  DELETE FROM public.expertise_payments WHERE expertise_request_id IN (
    SELECT id FROM public.real_estate_expertise_requests WHERE reference_number ILIKE 'TEST-%'
  );
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('expertise_payments', cnt);

  -- 5. payment_transactions (test data)
  DELETE FROM public.payment_transactions WHERE metadata->>'test_mode' = 'true';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('payment_transactions', cnt);

  -- 6. real_estate_expertise_requests
  DELETE FROM public.real_estate_expertise_requests WHERE reference_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('real_estate_expertise_requests', cnt);

  -- 7. invoices (before contributions)
  DELETE FROM public.cadastral_invoices WHERE parcel_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_invoices', cnt);

  -- 8. contributions (after invoices and all children)
  DELETE FROM public.cadastral_contributions WHERE parcel_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_contributions', cnt);

  -- 9. boundary_conflicts
  DELETE FROM public.cadastral_boundary_conflicts
    WHERE reporting_parcel_number ILIKE 'TEST-%' OR conflicting_parcel_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_boundary_conflicts', cnt);

  -- 10. land_disputes
  DELETE FROM public.cadastral_land_disputes WHERE parcel_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_land_disputes', cnt);

  -- 11. Parcel children
  SELECT array_agg(id) INTO parcel_ids FROM public.cadastral_parcels WHERE parcel_number ILIKE 'TEST-%';

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

    DELETE FROM public.mutation_requests WHERE parcel_id = ANY(parcel_ids) OR reference_number ILIKE 'TEST-%';
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('mutation_requests', cnt);

    DELETE FROM public.subdivision_requests WHERE parcel_id = ANY(parcel_ids) OR reference_number ILIKE 'TEST-%';
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('subdivision_requests', cnt);

    DELETE FROM public.land_title_requests WHERE reference_number ILIKE 'TEST-%';
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('land_title_requests', cnt);

    DELETE FROM public.cadastral_parcels WHERE id = ANY(parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('cadastral_parcels', cnt);
  END IF;

  DELETE FROM public.generated_certificates WHERE parcel_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('generated_certificates', cnt);

  DELETE FROM public.notifications WHERE title ILIKE '%TEST-%' OR message ILIKE '%TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('notifications', cnt);

  RETURN result;
END;
$$;
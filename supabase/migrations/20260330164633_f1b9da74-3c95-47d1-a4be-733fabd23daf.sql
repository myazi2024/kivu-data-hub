
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
  -- Vérifier que l'appelant est admin
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  -- 1. fraud_attempts via contribution_id join
  DELETE FROM public.fraud_attempts WHERE contribution_id IN (
    SELECT id FROM public.cadastral_contributions WHERE parcel_number ILIKE 'TEST-%'
  );
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('fraud_attempts', cnt);

  -- 2. cadastral_contributor_codes
  DELETE FROM public.cadastral_contributor_codes WHERE parcel_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_contributor_codes', cnt);

  -- 3. cadastral_contributions
  DELETE FROM public.cadastral_contributions WHERE parcel_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_contributions', cnt);

  -- 4. cadastral_service_access
  DELETE FROM public.cadastral_service_access WHERE parcel_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_service_access', cnt);

  -- 5. cadastral_invoices
  DELETE FROM public.cadastral_invoices WHERE parcel_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_invoices', cnt);

  -- 6. cadastral_boundary_conflicts
  DELETE FROM public.cadastral_boundary_conflicts
    WHERE reporting_parcel_number ILIKE 'TEST-%' OR conflicting_parcel_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_boundary_conflicts', cnt);

  -- 7. cadastral_land_disputes
  DELETE FROM public.cadastral_land_disputes WHERE parcel_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_land_disputes', cnt);

  -- Collect parcel IDs for FK-dependent tables
  SELECT array_agg(id) INTO parcel_ids FROM public.cadastral_parcels WHERE parcel_number ILIKE 'TEST-%';

  IF parcel_ids IS NOT NULL AND array_length(parcel_ids, 1) > 0 THEN
    -- 8. cadastral_mortgage_payments (via mortgage)
    DELETE FROM public.cadastral_mortgage_payments WHERE mortgage_id IN (
      SELECT id FROM public.cadastral_mortgages WHERE parcel_id = ANY(parcel_ids)
    );
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('cadastral_mortgage_payments', cnt);

    -- 9. cadastral_mortgages
    DELETE FROM public.cadastral_mortgages WHERE parcel_id = ANY(parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('cadastral_mortgages', cnt);

    -- 10. cadastral_tax_history
    DELETE FROM public.cadastral_tax_history WHERE parcel_id = ANY(parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('cadastral_tax_history', cnt);

    -- 11. cadastral_ownership_history
    DELETE FROM public.cadastral_ownership_history WHERE parcel_id = ANY(parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('cadastral_ownership_history', cnt);

    -- 12. cadastral_boundary_history
    DELETE FROM public.cadastral_boundary_history WHERE parcel_id = ANY(parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('cadastral_boundary_history', cnt);

    -- 13. cadastral_building_permits
    DELETE FROM public.cadastral_building_permits WHERE parcel_id = ANY(parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('cadastral_building_permits', cnt);

    -- 14. mutation_requests (FK parcel_id -> cadastral_parcels)
    DELETE FROM public.mutation_requests WHERE parcel_id = ANY(parcel_ids) OR reference_number ILIKE 'TEST-%';
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('mutation_requests', cnt);

    -- 15. land_title_requests
    DELETE FROM public.land_title_requests WHERE reference_number ILIKE 'TEST-%';
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('land_title_requests', cnt);

    -- 16. cadastral_parcels (parent)
    DELETE FROM public.cadastral_parcels WHERE id = ANY(parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('cadastral_parcels', cnt);
  END IF;

  -- 17. generated_certificates
  DELETE FROM public.generated_certificates WHERE parcel_number ILIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('generated_certificates', cnt);

  -- 18. notifications with TEST-
  DELETE FROM public.notifications WHERE title ILIKE '%TEST-%' OR message ILIKE '%TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('notifications', cnt);

  RETURN result;
END;
$$;

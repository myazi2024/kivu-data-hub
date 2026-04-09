
-- ============================================================
-- Partial indexes for TEST-% data (accelerate cleanup & count)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_parcels_test ON public.cadastral_parcels (parcel_number text_pattern_ops) WHERE parcel_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_contributions_test ON public.cadastral_contributions (parcel_number text_pattern_ops) WHERE parcel_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_invoices_test ON public.cadastral_invoices (parcel_number text_pattern_ops) WHERE parcel_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_contributor_codes_test ON public.cadastral_contributor_codes (parcel_number text_pattern_ops) WHERE parcel_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_service_access_test ON public.cadastral_service_access (parcel_number text_pattern_ops) WHERE parcel_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_title_requests_test ON public.land_title_requests (reference_number text_pattern_ops) WHERE reference_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_expertise_requests_test ON public.real_estate_expertise_requests (reference_number text_pattern_ops) WHERE reference_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_disputes_test ON public.cadastral_land_disputes (parcel_number text_pattern_ops) WHERE parcel_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_boundary_conflicts_test ON public.cadastral_boundary_conflicts (reporting_parcel_number text_pattern_ops) WHERE reporting_parcel_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_certificates_test ON public.generated_certificates (reference_number text_pattern_ops) WHERE reference_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_mutations_test ON public.mutation_requests (reference_number text_pattern_ops) WHERE reference_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_subdivisions_test ON public.subdivision_requests (reference_number text_pattern_ops) WHERE reference_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_payments_test_mode ON public.payment_transactions ((metadata->>'test_mode')) WHERE metadata->>'test_mode' = 'true';

-- ============================================================
-- Optimized cleanup_all_test_data: LIKE instead of ILIKE + 120s timeout
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_all_test_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout = '120s'
AS $function$
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
    SELECT id FROM public.cadastral_contributions WHERE parcel_number LIKE 'TEST-%'
  );
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('fraud_attempts', cnt);

  -- 2. contributor_codes (FK → contributions, invoices)
  DELETE FROM public.cadastral_contributor_codes WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_contributor_codes', cnt);

  -- 3. service_access (FK → invoices)
  DELETE FROM public.cadastral_service_access WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_service_access', cnt);

  -- 4. expertise_payments (FK → real_estate_expertise_requests)
  DELETE FROM public.expertise_payments WHERE expertise_request_id IN (
    SELECT id FROM public.real_estate_expertise_requests WHERE reference_number LIKE 'TEST-%'
  );
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('expertise_payments', cnt);

  -- 5. payment_transactions (test data)
  DELETE FROM public.payment_transactions WHERE metadata->>'test_mode' = 'true';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('payment_transactions', cnt);

  -- 6. real_estate_expertise_requests
  DELETE FROM public.real_estate_expertise_requests WHERE reference_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('real_estate_expertise_requests', cnt);

  -- 7. invoices (before contributions)
  DELETE FROM public.cadastral_invoices WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_invoices', cnt);

  -- 8. contributions (after invoices and all children)
  DELETE FROM public.cadastral_contributions WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_contributions', cnt);

  -- 9. boundary_conflicts
  DELETE FROM public.cadastral_boundary_conflicts
    WHERE reporting_parcel_number LIKE 'TEST-%' OR conflicting_parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_boundary_conflicts', cnt);

  -- 10. land_disputes
  DELETE FROM public.cadastral_land_disputes WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_land_disputes', cnt);

  -- 11. land_title_requests
  DELETE FROM public.land_title_requests WHERE reference_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('land_title_requests', cnt);

  -- 12. Parcel children
  SELECT array_agg(id) INTO parcel_ids FROM public.cadastral_parcels WHERE parcel_number LIKE 'TEST-%';

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

    DELETE FROM public.mutation_requests WHERE parcel_id = ANY(parcel_ids) OR reference_number LIKE 'TEST-%';
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('mutation_requests', cnt);

    DELETE FROM public.subdivision_requests WHERE parcel_id = ANY(parcel_ids) OR reference_number LIKE 'TEST-%';
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('subdivision_requests', cnt);

    DELETE FROM public.cadastral_parcels WHERE id = ANY(parcel_ids);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('cadastral_parcels', cnt);
  END IF;

  DELETE FROM public.generated_certificates WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('generated_certificates', cnt);

  DELETE FROM public.notifications WHERE title LIKE '%TEST-%' OR message LIKE '%TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('notifications', cnt);

  RETURN result;
END;
$function$;

-- ============================================================
-- Optimized count_test_data_stats: LIKE instead of ILIKE
-- ============================================================
CREATE OR REPLACE FUNCTION public.count_test_data_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}'::jsonb;
  cnt integer;
  parcel_ids uuid[];
  contrib_ids uuid[];
  exp_req_ids uuid[];
BEGIN
  SELECT count(*) INTO cnt FROM public.cadastral_parcels WHERE parcel_number LIKE 'TEST-%';
  result := result || jsonb_build_object('parcels', cnt);

  SELECT count(*) INTO cnt FROM public.cadastral_contributions WHERE parcel_number LIKE 'TEST-%';
  result := result || jsonb_build_object('contributions', cnt);

  SELECT count(*) INTO cnt FROM public.cadastral_invoices WHERE parcel_number LIKE 'TEST-%';
  result := result || jsonb_build_object('invoices', cnt);

  SELECT count(*) INTO cnt FROM public.payment_transactions WHERE metadata->>'test_mode' = 'true';
  result := result || jsonb_build_object('payments', cnt);

  SELECT count(*) INTO cnt FROM public.cadastral_contributor_codes WHERE parcel_number LIKE 'TEST-%';
  result := result || jsonb_build_object('cccCodes', cnt);

  SELECT count(*) INTO cnt FROM public.cadastral_service_access WHERE parcel_number LIKE 'TEST-%';
  result := result || jsonb_build_object('serviceAccess', cnt);

  SELECT count(*) INTO cnt FROM public.land_title_requests WHERE reference_number LIKE 'TEST-%';
  result := result || jsonb_build_object('titleRequests', cnt);

  SELECT count(*) INTO cnt FROM public.real_estate_expertise_requests WHERE reference_number LIKE 'TEST-%';
  result := result || jsonb_build_object('expertiseRequests', cnt);

  SELECT count(*) INTO cnt FROM public.cadastral_land_disputes WHERE parcel_number LIKE 'TEST-%';
  result := result || jsonb_build_object('disputes', cnt);

  SELECT count(*) INTO cnt FROM public.cadastral_boundary_conflicts WHERE reporting_parcel_number LIKE 'TEST-%';
  result := result || jsonb_build_object('boundaryConflicts', cnt);

  SELECT count(*) INTO cnt FROM public.generated_certificates WHERE reference_number LIKE 'TEST-%';
  result := result || jsonb_build_object('certificates', cnt);

  SELECT count(*) INTO cnt FROM public.mutation_requests WHERE reference_number LIKE 'TEST-%';
  result := result || jsonb_build_object('mutationRequests', cnt);

  SELECT count(*) INTO cnt FROM public.subdivision_requests WHERE reference_number LIKE 'TEST-%';
  result := result || jsonb_build_object('subdivisionRequests', cnt);

  -- FK-based counts
  SELECT array_agg(id) INTO parcel_ids FROM public.cadastral_parcels WHERE parcel_number LIKE 'TEST-%';
  IF parcel_ids IS NOT NULL THEN
    SELECT count(*) INTO cnt FROM public.cadastral_ownership_history WHERE parcel_id = ANY(parcel_ids);
    result := result || jsonb_build_object('ownershipHistory', cnt);

    SELECT count(*) INTO cnt FROM public.cadastral_tax_history WHERE parcel_id = ANY(parcel_ids);
    result := result || jsonb_build_object('taxHistory', cnt);

    SELECT count(*) INTO cnt FROM public.cadastral_boundary_history WHERE parcel_id = ANY(parcel_ids);
    result := result || jsonb_build_object('boundaryHistory', cnt);

    SELECT count(*) INTO cnt FROM public.cadastral_mortgages WHERE parcel_id = ANY(parcel_ids);
    result := result || jsonb_build_object('mortgages', cnt);

    SELECT count(*) INTO cnt FROM public.cadastral_building_permits WHERE parcel_id = ANY(parcel_ids);
    result := result || jsonb_build_object('buildingPermits', cnt);
  ELSE
    result := result || '{"ownershipHistory":0,"taxHistory":0,"boundaryHistory":0,"mortgages":0,"buildingPermits":0}'::jsonb;
  END IF;

  SELECT array_agg(id) INTO exp_req_ids FROM public.real_estate_expertise_requests WHERE reference_number LIKE 'TEST-%';
  IF exp_req_ids IS NOT NULL THEN
    SELECT count(*) INTO cnt FROM public.expertise_payments WHERE expertise_request_id = ANY(exp_req_ids);
  ELSE
    cnt := 0;
  END IF;
  result := result || jsonb_build_object('expertisePayments', cnt);

  SELECT array_agg(id) INTO contrib_ids FROM public.cadastral_contributions WHERE parcel_number LIKE 'TEST-%';
  IF contrib_ids IS NOT NULL THEN
    SELECT count(*) INTO cnt FROM public.fraud_attempts WHERE contribution_id = ANY(contrib_ids);
  ELSE
    cnt := 0;
  END IF;
  result := result || jsonb_build_object('fraudAttempts', cnt);

  RETURN result;
END;
$function$;

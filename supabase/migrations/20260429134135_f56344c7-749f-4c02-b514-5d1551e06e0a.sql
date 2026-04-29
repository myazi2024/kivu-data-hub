-- Dry-run RPC: counts TEST rows per cleanup step without deleting.
-- Mirrors the WHERE clauses of _cleanup_test_data_chunk_internal so admins
-- can preview what a purge will remove. SECURITY DEFINER, admin-only.

CREATE OR REPLACE FUNCTION public.count_test_data_to_cleanup()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  result jsonb := '{}'::jsonb;
  total bigint := 0;
  c bigint;
BEGIN
  -- Admin guard (matches count_test_data_stats / cleanup edge function)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
  ) INTO is_admin;
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Forbidden: admin role required' USING ERRCODE = 'P0001';
  END IF;

  -- Each step mirrors the FK-safe order used by _cleanup_test_data_chunk_internal.
  -- Patterns are derived from public.test_entities_registry; we hardcode here
  -- to stay aligned with the cleanup function's filters.

  -- permit_payments
  SELECT COUNT(*) INTO c FROM public.cadastral_permit_payments pp
    WHERE EXISTS (
      SELECT 1 FROM public.cadastral_building_permits bp
      WHERE bp.id = pp.permit_id AND bp.permit_number ILIKE 'TEST-PC%'
    );
  result := result || jsonb_build_object('permit_payments', c); total := total + c;

  -- permit_admin_actions
  SELECT COUNT(*) INTO c FROM public.cadastral_permit_admin_actions pa
    WHERE EXISTS (
      SELECT 1 FROM public.cadastral_building_permits bp
      WHERE bp.id = pa.permit_id AND bp.permit_number ILIKE 'TEST-PC%'
    );
  result := result || jsonb_build_object('permit_admin_actions', c); total := total + c;

  -- fraud_attempts (referenced via contributions parcel_number)
  SELECT COUNT(*) INTO c FROM public.fraud_attempts WHERE parcel_number ILIKE 'TEST-%';
  result := result || jsonb_build_object('fraud_attempts', c); total := total + c;

  -- contributor_codes
  SELECT COUNT(*) INTO c FROM public.cadastral_contributor_codes WHERE parcel_number ILIKE 'TEST-%';
  result := result || jsonb_build_object('contributor_codes', c); total := total + c;

  -- service_access
  SELECT COUNT(*) INTO c FROM public.cadastral_service_access WHERE parcel_number ILIKE 'TEST-%';
  result := result || jsonb_build_object('service_access', c); total := total + c;

  -- payment_transactions (linked to TEST invoices)
  SELECT COUNT(*) INTO c FROM public.payment_transactions pt
    WHERE EXISTS (
      SELECT 1 FROM public.cadastral_invoices inv
      WHERE inv.id = pt.invoice_id AND inv.parcel_number ILIKE 'TEST-%'
    );
  result := result || jsonb_build_object('payment_transactions', c); total := total + c;

  -- invoices
  SELECT COUNT(*) INTO c FROM public.cadastral_invoices WHERE parcel_number ILIKE 'TEST-%';
  result := result || jsonb_build_object('invoices', c); total := total + c;

  -- contributions
  SELECT COUNT(*) INTO c FROM public.cadastral_contributions WHERE parcel_number ILIKE 'TEST-%';
  result := result || jsonb_build_object('contributions', c); total := total + c;

  -- mutation_requests
  SELECT COUNT(*) INTO c FROM public.mutation_requests WHERE reference_number ILIKE 'TEST-%';
  result := result || jsonb_build_object('mutation_requests', c); total := total + c;

  -- subdivision_requests
  SELECT COUNT(*) INTO c FROM public.subdivision_requests WHERE reference_number ILIKE 'TEST-%';
  result := result || jsonb_build_object('subdivision_requests', c); total := total + c;

  -- land_disputes
  SELECT COUNT(*) INTO c FROM public.cadastral_land_disputes WHERE parcel_number ILIKE 'TEST-%';
  result := result || jsonb_build_object('land_disputes', c); total := total + c;

  -- expertise_payments
  SELECT COUNT(*) INTO c FROM public.real_estate_expertise_payments ep
    WHERE EXISTS (
      SELECT 1 FROM public.real_estate_expertise_requests er
      WHERE er.id = ep.expertise_request_id AND er.reference_number ILIKE 'TEST-%'
    );
  result := result || jsonb_build_object('expertise_payments', c); total := total + c;

  -- expertise_requests
  SELECT COUNT(*) INTO c FROM public.real_estate_expertise_requests WHERE reference_number ILIKE 'TEST-%';
  result := result || jsonb_build_object('expertise_requests', c); total := total + c;

  -- land_title_requests
  SELECT COUNT(*) INTO c FROM public.land_title_requests WHERE reference_number ILIKE 'TEST-%';
  result := result || jsonb_build_object('land_title_requests', c); total := total + c;

  -- ownership_history (linked to TEST parcels)
  SELECT COUNT(*) INTO c FROM public.cadastral_ownership_history oh
    WHERE EXISTS (
      SELECT 1 FROM public.cadastral_parcels p
      WHERE p.id = oh.parcel_id AND p.parcel_number ILIKE 'TEST-%'
    );
  result := result || jsonb_build_object('ownership_history', c); total := total + c;

  -- tax_history
  SELECT COUNT(*) INTO c FROM public.cadastral_tax_history th
    WHERE EXISTS (
      SELECT 1 FROM public.cadastral_parcels p
      WHERE p.id = th.parcel_id AND p.parcel_number ILIKE 'TEST-%'
    );
  result := result || jsonb_build_object('tax_history', c); total := total + c;

  -- boundary_history
  SELECT COUNT(*) INTO c FROM public.cadastral_boundary_history bh
    WHERE EXISTS (
      SELECT 1 FROM public.cadastral_parcels p
      WHERE p.id = bh.parcel_id AND p.parcel_number ILIKE 'TEST-%'
    );
  result := result || jsonb_build_object('boundary_history', c); total := total + c;

  -- mortgage_payments
  SELECT COUNT(*) INTO c FROM public.cadastral_mortgage_payments mp
    WHERE EXISTS (
      SELECT 1 FROM public.cadastral_mortgages m
      WHERE m.id = mp.mortgage_id AND m.reference_number ILIKE 'TEST-HYP-%'
    );
  result := result || jsonb_build_object('mortgage_payments', c); total := total + c;

  -- mortgages
  SELECT COUNT(*) INTO c FROM public.cadastral_mortgages WHERE reference_number ILIKE 'TEST-HYP-%';
  result := result || jsonb_build_object('mortgages', c); total := total + c;

  -- building_permits
  SELECT COUNT(*) INTO c FROM public.cadastral_building_permits WHERE permit_number ILIKE 'TEST-PC%';
  result := result || jsonb_build_object('building_permits', c); total := total + c;

  -- parcels
  SELECT COUNT(*) INTO c FROM public.cadastral_parcels WHERE parcel_number ILIKE 'TEST-%';
  result := result || jsonb_build_object('parcels', c); total := total + c;

  -- generated_certificates
  SELECT COUNT(*) INTO c FROM public.generated_certificates WHERE reference_number ILIKE 'TEST-CERT-%';
  result := result || jsonb_build_object('generated_certificates', c); total := total + c;

  -- boundary_conflicts
  SELECT COUNT(*) INTO c FROM public.cadastral_boundary_conflicts WHERE reporting_parcel_number ILIKE 'TEST-%';
  result := result || jsonb_build_object('boundary_conflicts', c); total := total + c;

  RETURN jsonb_build_object(
    'per_step', result,
    'total', total,
    'computed_at', now()
  );
EXCEPTION WHEN OTHERS THEN
  -- If a table is missing (extension drift), return what we have so far
  RAISE WARNING 'count_test_data_to_cleanup partial: %', SQLERRM;
  RETURN jsonb_build_object(
    'per_step', result,
    'total', total,
    'partial', true,
    'error', SQLERRM
  );
END;
$$;

REVOKE ALL ON FUNCTION public.count_test_data_to_cleanup() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_test_data_to_cleanup() TO authenticated;

COMMENT ON FUNCTION public.count_test_data_to_cleanup() IS
  'Dry-run TEST data cleanup: returns per-step counts and total without deleting. Admin-only.';
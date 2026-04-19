-- Chunked cleanup RPC: deletes up to p_limit rows for one named step.
-- Each call is one short transaction → avoids statement_timeout on large datasets.
CREATE OR REPLACE FUNCTION public.cleanup_test_data_chunk(p_step text, p_limit int DEFAULT 500)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_deleted int := 0;
BEGIN
  -- Admin guard
  IF v_uid IS NULL OR NOT (
    public.has_role(v_uid, 'admin'::app_role)
    OR public.has_role(v_uid, 'super_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  IF p_limit IS NULL OR p_limit <= 0 OR p_limit > 5000 THEN
    p_limit := 500;
  END IF;

  CASE p_step
    -- 1) Permits / fraud children (must go before contributions/invoices)
    WHEN 'permit_payments' THEN
      WITH v AS (
        SELECT pp.id FROM public.permit_payments pp
        JOIN public.cadastral_contributions c ON c.id = pp.contribution_id
        WHERE c.parcel_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.permit_payments USING v WHERE permit_payments.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    WHEN 'permit_admin_actions' THEN
      WITH v AS (
        SELECT paa.id FROM public.permit_admin_actions paa
        JOIN public.cadastral_contributions c ON c.id = paa.contribution_id
        WHERE c.parcel_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.permit_admin_actions USING v WHERE permit_admin_actions.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    WHEN 'fraud_attempts' THEN
      WITH v AS (
        SELECT fa.id FROM public.fraud_attempts fa
        JOIN public.cadastral_contributions c ON c.id = fa.contribution_id
        WHERE c.parcel_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.fraud_attempts USING v WHERE fraud_attempts.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    -- 2) Contributor codes / service access / payment_transactions / invoices / contributions
    WHEN 'contributor_codes' THEN
      WITH v AS (
        SELECT id FROM public.cadastral_contributor_codes
        WHERE parcel_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.cadastral_contributor_codes USING v WHERE cadastral_contributor_codes.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    WHEN 'service_access' THEN
      WITH v AS (
        SELECT id FROM public.cadastral_service_access
        WHERE parcel_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.cadastral_service_access USING v WHERE cadastral_service_access.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    WHEN 'payment_transactions' THEN
      WITH v AS (
        SELECT pt.id FROM public.payment_transactions pt
        JOIN public.cadastral_invoices i ON i.id = pt.invoice_id
        WHERE i.parcel_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.payment_transactions USING v WHERE payment_transactions.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    WHEN 'invoices' THEN
      WITH v AS (
        SELECT id FROM public.cadastral_invoices
        WHERE parcel_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.cadastral_invoices USING v WHERE cadastral_invoices.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    WHEN 'contributions' THEN
      WITH v AS (
        SELECT id FROM public.cadastral_contributions
        WHERE parcel_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.cadastral_contributions USING v WHERE cadastral_contributions.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    -- 3) Parcel-attached requests (use parcel_id when column exists)
    WHEN 'mutation_requests' THEN
      WITH v AS (
        SELECT mr.id FROM public.mutation_requests mr
        JOIN public.cadastral_parcels p ON p.id = mr.parcel_id
        WHERE p.parcel_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.mutation_requests USING v WHERE mutation_requests.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    WHEN 'subdivision_requests' THEN
      WITH v AS (
        SELECT sr.id FROM public.subdivision_requests sr
        JOIN public.cadastral_parcels p ON p.id = sr.parcel_id
        WHERE p.parcel_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.subdivision_requests USING v WHERE subdivision_requests.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    WHEN 'land_disputes' THEN
      WITH v AS (
        SELECT ld.id FROM public.cadastral_land_disputes ld
        WHERE ld.parcel_number LIKE 'TEST-%'
           OR ld.reference_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.cadastral_land_disputes USING v WHERE cadastral_land_disputes.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    WHEN 'expertise_payments' THEN
      WITH v AS (
        SELECT ep.id FROM public.expertise_payments ep
        JOIN public.real_estate_expertise_requests er ON er.id = ep.expertise_request_id
        WHERE er.reference_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.expertise_payments USING v WHERE expertise_payments.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    WHEN 'expertise_requests' THEN
      WITH v AS (
        SELECT id FROM public.real_estate_expertise_requests
        WHERE reference_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.real_estate_expertise_requests USING v WHERE real_estate_expertise_requests.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    -- 4) Orphan refs (land_title_requests has no parcel_id column → only reference_number)
    WHEN 'land_title_requests' THEN
      WITH v AS (
        SELECT id FROM public.land_title_requests
        WHERE reference_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.land_title_requests USING v WHERE land_title_requests.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    -- 5) Parcel children (FK to cadastral_parcels)
    WHEN 'ownership_history' THEN
      WITH v AS (
        SELECT oh.id FROM public.cadastral_ownership_history oh
        JOIN public.cadastral_parcels p ON p.id = oh.parcel_id
        WHERE p.parcel_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.cadastral_ownership_history USING v WHERE cadastral_ownership_history.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    WHEN 'tax_history' THEN
      WITH v AS (
        SELECT th.id FROM public.cadastral_tax_history th
        JOIN public.cadastral_parcels p ON p.id = th.parcel_id
        WHERE p.parcel_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.cadastral_tax_history USING v WHERE cadastral_tax_history.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    WHEN 'boundary_history' THEN
      WITH v AS (
        SELECT bh.id FROM public.cadastral_boundary_history bh
        JOIN public.cadastral_parcels p ON p.id = bh.parcel_id
        WHERE p.parcel_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.cadastral_boundary_history USING v WHERE cadastral_boundary_history.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    WHEN 'mortgage_payments' THEN
      WITH v AS (
        SELECT mp.id FROM public.cadastral_mortgage_payments mp
        JOIN public.cadastral_mortgages m ON m.id = mp.mortgage_id
        JOIN public.cadastral_parcels p ON p.id = m.parcel_id
        WHERE p.parcel_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.cadastral_mortgage_payments USING v WHERE cadastral_mortgage_payments.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    WHEN 'mortgages' THEN
      WITH v AS (
        SELECT m.id FROM public.cadastral_mortgages m
        JOIN public.cadastral_parcels p ON p.id = m.parcel_id
        WHERE p.parcel_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.cadastral_mortgages USING v WHERE cadastral_mortgages.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    WHEN 'building_permits' THEN
      WITH v AS (
        SELECT bp.id FROM public.cadastral_building_permits bp
        JOIN public.cadastral_parcels p ON p.id = bp.parcel_id
        WHERE p.parcel_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.cadastral_building_permits USING v WHERE cadastral_building_permits.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    -- 6) Parcels themselves (last)
    WHEN 'parcels' THEN
      WITH v AS (
        SELECT id FROM public.cadastral_parcels
        WHERE parcel_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.cadastral_parcels USING v WHERE cadastral_parcels.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    -- 7) Standalone TEST artefacts
    WHEN 'generated_certificates' THEN
      WITH v AS (
        SELECT id FROM public.generated_certificates
        WHERE certificate_number LIKE 'TEST-%'
           OR parcel_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.generated_certificates USING v WHERE generated_certificates.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    WHEN 'boundary_conflicts' THEN
      WITH v AS (
        SELECT id FROM public.cadastral_boundary_conflicts
        WHERE reporting_parcel_number LIKE 'TEST-%'
           OR conflicting_parcel_number LIKE 'TEST-%'
        LIMIT p_limit
      )
      DELETE FROM public.cadastral_boundary_conflicts USING v WHERE cadastral_boundary_conflicts.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    ELSE
      RAISE EXCEPTION 'Unknown cleanup step: %', p_step;
  END CASE;

  RETURN COALESCE(v_deleted, 0);
END;
$function$;

-- Convert auto cron to internal batched LOOP to avoid long transactions
CREATE OR REPLACE FUNCTION public.cleanup_all_test_data_auto()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_steps text[] := ARRAY[
    'permit_payments','permit_admin_actions','fraud_attempts',
    'contributor_codes','service_access','payment_transactions','invoices','contributions',
    'mutation_requests','subdivision_requests','land_disputes',
    'expertise_payments','expertise_requests',
    'land_title_requests',
    'ownership_history','tax_history','boundary_history',
    'mortgage_payments','mortgages','building_permits',
    'parcels',
    'generated_certificates','boundary_conflicts'
  ];
  v_step text;
  v_total int := 0;
  v_step_total int;
  v_chunk int;
  v_batch int := 1000;
  v_summary jsonb := '{}'::jsonb;
BEGIN
  FOREACH v_step IN ARRAY v_steps LOOP
    v_step_total := 0;
    LOOP
      -- inline equivalent of cleanup_test_data_chunk but without admin guard (cron)
      EXECUTE format('SELECT public._cleanup_test_data_chunk_internal(%L, %L)', v_step, v_batch)
        INTO v_chunk;
      v_step_total := v_step_total + COALESCE(v_chunk, 0);
      EXIT WHEN COALESCE(v_chunk, 0) = 0;
    END LOOP;
    v_summary := v_summary || jsonb_build_object(v_step, v_step_total);
    v_total := v_total + v_step_total;
  END LOOP;

  INSERT INTO public.audit_logs (action, table_name, new_values)
  VALUES ('AUTO_TEST_DATA_CLEANUP_BATCHED', 'cadastral_parcels',
          jsonb_build_object('total_deleted', v_total, 'per_step', v_summary));

  RETURN jsonb_build_object('total_deleted', v_total, 'per_step', v_summary);
END;
$function$;

-- Internal helper without admin guard (used by cron only)
CREATE OR REPLACE FUNCTION public._cleanup_test_data_chunk_internal(p_step text, p_limit int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted int := 0;
BEGIN
  CASE p_step
    WHEN 'permit_payments' THEN
      WITH v AS (SELECT pp.id FROM public.permit_payments pp JOIN public.cadastral_contributions c ON c.id = pp.contribution_id WHERE c.parcel_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.permit_payments USING v WHERE permit_payments.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'permit_admin_actions' THEN
      WITH v AS (SELECT paa.id FROM public.permit_admin_actions paa JOIN public.cadastral_contributions c ON c.id = paa.contribution_id WHERE c.parcel_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.permit_admin_actions USING v WHERE permit_admin_actions.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'fraud_attempts' THEN
      WITH v AS (SELECT fa.id FROM public.fraud_attempts fa JOIN public.cadastral_contributions c ON c.id = fa.contribution_id WHERE c.parcel_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.fraud_attempts USING v WHERE fraud_attempts.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'contributor_codes' THEN
      WITH v AS (SELECT id FROM public.cadastral_contributor_codes WHERE parcel_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.cadastral_contributor_codes USING v WHERE cadastral_contributor_codes.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'service_access' THEN
      WITH v AS (SELECT id FROM public.cadastral_service_access WHERE parcel_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.cadastral_service_access USING v WHERE cadastral_service_access.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'payment_transactions' THEN
      WITH v AS (SELECT pt.id FROM public.payment_transactions pt JOIN public.cadastral_invoices i ON i.id = pt.invoice_id WHERE i.parcel_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.payment_transactions USING v WHERE payment_transactions.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'invoices' THEN
      WITH v AS (SELECT id FROM public.cadastral_invoices WHERE parcel_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.cadastral_invoices USING v WHERE cadastral_invoices.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'contributions' THEN
      WITH v AS (SELECT id FROM public.cadastral_contributions WHERE parcel_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.cadastral_contributions USING v WHERE cadastral_contributions.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'mutation_requests' THEN
      WITH v AS (SELECT mr.id FROM public.mutation_requests mr JOIN public.cadastral_parcels p ON p.id = mr.parcel_id WHERE p.parcel_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.mutation_requests USING v WHERE mutation_requests.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'subdivision_requests' THEN
      WITH v AS (SELECT sr.id FROM public.subdivision_requests sr JOIN public.cadastral_parcels p ON p.id = sr.parcel_id WHERE p.parcel_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.subdivision_requests USING v WHERE subdivision_requests.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'land_disputes' THEN
      WITH v AS (SELECT id FROM public.cadastral_land_disputes WHERE parcel_number LIKE 'TEST-%' OR reference_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.cadastral_land_disputes USING v WHERE cadastral_land_disputes.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'expertise_payments' THEN
      WITH v AS (SELECT ep.id FROM public.expertise_payments ep JOIN public.real_estate_expertise_requests er ON er.id = ep.expertise_request_id WHERE er.reference_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.expertise_payments USING v WHERE expertise_payments.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'expertise_requests' THEN
      WITH v AS (SELECT id FROM public.real_estate_expertise_requests WHERE reference_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.real_estate_expertise_requests USING v WHERE real_estate_expertise_requests.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'land_title_requests' THEN
      WITH v AS (SELECT id FROM public.land_title_requests WHERE reference_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.land_title_requests USING v WHERE land_title_requests.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'ownership_history' THEN
      WITH v AS (SELECT oh.id FROM public.cadastral_ownership_history oh JOIN public.cadastral_parcels p ON p.id = oh.parcel_id WHERE p.parcel_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.cadastral_ownership_history USING v WHERE cadastral_ownership_history.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'tax_history' THEN
      WITH v AS (SELECT th.id FROM public.cadastral_tax_history th JOIN public.cadastral_parcels p ON p.id = th.parcel_id WHERE p.parcel_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.cadastral_tax_history USING v WHERE cadastral_tax_history.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'boundary_history' THEN
      WITH v AS (SELECT bh.id FROM public.cadastral_boundary_history bh JOIN public.cadastral_parcels p ON p.id = bh.parcel_id WHERE p.parcel_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.cadastral_boundary_history USING v WHERE cadastral_boundary_history.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'mortgage_payments' THEN
      WITH v AS (SELECT mp.id FROM public.cadastral_mortgage_payments mp JOIN public.cadastral_mortgages m ON m.id = mp.mortgage_id JOIN public.cadastral_parcels p ON p.id = m.parcel_id WHERE p.parcel_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.cadastral_mortgage_payments USING v WHERE cadastral_mortgage_payments.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'mortgages' THEN
      WITH v AS (SELECT m.id FROM public.cadastral_mortgages m JOIN public.cadastral_parcels p ON p.id = m.parcel_id WHERE p.parcel_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.cadastral_mortgages USING v WHERE cadastral_mortgages.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'building_permits' THEN
      WITH v AS (SELECT bp.id FROM public.cadastral_building_permits bp JOIN public.cadastral_parcels p ON p.id = bp.parcel_id WHERE p.parcel_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.cadastral_building_permits USING v WHERE cadastral_building_permits.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'parcels' THEN
      WITH v AS (SELECT id FROM public.cadastral_parcels WHERE parcel_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.cadastral_parcels USING v WHERE cadastral_parcels.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'generated_certificates' THEN
      WITH v AS (SELECT id FROM public.generated_certificates WHERE certificate_number LIKE 'TEST-%' OR parcel_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.generated_certificates USING v WHERE generated_certificates.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    WHEN 'boundary_conflicts' THEN
      WITH v AS (SELECT id FROM public.cadastral_boundary_conflicts WHERE reporting_parcel_number LIKE 'TEST-%' OR conflicting_parcel_number LIKE 'TEST-%' LIMIT p_limit)
      DELETE FROM public.cadastral_boundary_conflicts USING v WHERE cadastral_boundary_conflicts.id = v.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    ELSE
      RAISE EXCEPTION 'Unknown cleanup step: %', p_step;
  END CASE;
  RETURN COALESCE(v_deleted, 0);
END;
$function$;

REVOKE ALL ON FUNCTION public._cleanup_test_data_chunk_internal(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_test_data_chunk(text, int) TO authenticated;
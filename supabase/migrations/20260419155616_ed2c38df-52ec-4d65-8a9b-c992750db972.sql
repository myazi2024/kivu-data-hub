CREATE OR REPLACE FUNCTION public._cleanup_test_data_chunk_internal(p_step text, p_limit integer)
 RETURNS integer
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
      WITH v AS (SELECT id FROM public.generated_certificates WHERE reference_number LIKE 'TEST-%' OR parcel_number LIKE 'TEST-%' LIMIT p_limit)
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
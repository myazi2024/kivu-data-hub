-- Audit P3: Hardening trigger anti-prod + visibilité lots/voies de lotissement

-- 1) Étendre le trigger anti-insert prod aux autorisations & hypothèques
DROP TRIGGER IF EXISTS trg_prevent_test_data_in_prod ON public.cadastral_building_permits;
CREATE TRIGGER trg_prevent_test_data_in_prod
  BEFORE INSERT ON public.cadastral_building_permits
  FOR EACH ROW EXECUTE FUNCTION public.prevent_test_data_in_prod('permit_number');

DROP TRIGGER IF EXISTS trg_prevent_test_data_in_prod ON public.cadastral_mortgages;
CREATE TRIGGER trg_prevent_test_data_in_prod
  BEFORE INSERT ON public.cadastral_mortgages
  FOR EACH ROW EXECUTE FUNCTION public.prevent_test_data_in_prod('reference_number');

-- 2) Étendre count_test_data_stats pour inclure subdivision_lots & subdivision_roads
CREATE OR REPLACE FUNCTION public.count_test_data_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}'::jsonb;
  rec record;
  cnt bigint;
  parcel_ids uuid[];
  sub_ids uuid[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  FOR rec IN
    SELECT label_key, table_name, marker_column, marker_pattern
    FROM public.test_entities_registry
    WHERE is_active = true
    ORDER BY display_order
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM public.%I WHERE %I LIKE $1',
      rec.table_name, rec.marker_column
    ) INTO cnt USING rec.marker_pattern;
    result := result || jsonb_build_object(rec.label_key, cnt);
  END LOOP;

  SELECT count(*) INTO cnt FROM public.payment_transactions WHERE metadata->>'test_mode' = 'true';
  result := result || jsonb_build_object('payments', cnt);

  SELECT count(*) INTO cnt FROM public.expertise_payments
    WHERE expertise_request_id IN (
      SELECT id FROM public.real_estate_expertise_requests WHERE reference_number LIKE 'TEST-%'
    );
  result := result || jsonb_build_object('expertisePayments', cnt);

  SELECT array_agg(id) INTO parcel_ids
    FROM public.cadastral_parcels WHERE parcel_number LIKE 'TEST-%';

  IF parcel_ids IS NOT NULL AND array_length(parcel_ids, 1) > 0 THEN
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
    result := result
      || jsonb_build_object('ownershipHistory', 0)
      || jsonb_build_object('taxHistory', 0)
      || jsonb_build_object('boundaryHistory', 0)
      || jsonb_build_object('mortgages', 0)
      || jsonb_build_object('buildingPermits', 0);
  END IF;

  SELECT count(*) INTO cnt FROM public.fraud_attempts
    WHERE contribution_id IN (
      SELECT id FROM public.cadastral_contributions WHERE parcel_number LIKE 'TEST-%'
    );
  result := result || jsonb_build_object('fraudAttempts', cnt);

  BEGIN
    SELECT count(*) INTO cnt FROM public.generated_certificates WHERE reference_number LIKE 'TEST-%';
    result := result || jsonb_build_object('certificates', cnt);
  EXCEPTION WHEN undefined_table THEN
    result := result || jsonb_build_object('certificates', 0);
  END;

  -- NEW: subdivision lots & roads (FK to subdivision_requests TEST-)
  SELECT array_agg(id) INTO sub_ids
    FROM public.subdivision_requests WHERE reference_number LIKE 'TEST-%';

  IF sub_ids IS NOT NULL AND array_length(sub_ids, 1) > 0 THEN
    SELECT count(*) INTO cnt FROM public.subdivision_lots WHERE subdivision_request_id = ANY(sub_ids);
    result := result || jsonb_build_object('subdivisionLots', cnt);
    SELECT count(*) INTO cnt FROM public.subdivision_roads WHERE subdivision_request_id = ANY(sub_ids);
    result := result || jsonb_build_object('subdivisionRoads', cnt);
  ELSE
    result := result
      || jsonb_build_object('subdivisionLots', 0)
      || jsonb_build_object('subdivisionRoads', 0);
  END IF;

  RETURN result;
END;
$function$;
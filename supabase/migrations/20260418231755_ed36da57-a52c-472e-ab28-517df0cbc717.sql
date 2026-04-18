-- ============================================================================
-- 1. test_entities_registry: dynamic list of test-data tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.test_entities_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_key text NOT NULL UNIQUE,
  table_name text NOT NULL,
  marker_column text NOT NULL,
  marker_pattern text NOT NULL DEFAULT 'TEST-%',
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.test_entities_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read test_entities_registry" ON public.test_entities_registry;
CREATE POLICY "Admins read test_entities_registry"
  ON public.test_entities_registry FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins write test_entities_registry" ON public.test_entities_registry;
CREATE POLICY "Super admins write test_entities_registry"
  ON public.test_entities_registry FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Seed registry
INSERT INTO public.test_entities_registry (label_key, table_name, marker_column, display_order)
VALUES
  ('parcels',              'cadastral_parcels',                'parcel_number',            10),
  ('contributions',        'cadastral_contributions',          'parcel_number',            20),
  ('invoices',             'cadastral_invoices',               'parcel_number',            30),
  ('cccCodes',             'cadastral_contributor_codes',      'parcel_number',            40),
  ('serviceAccess',        'cadastral_service_access',         'parcel_number',            50),
  ('titleRequests',        'land_title_requests',              'reference_number',         60),
  ('expertiseRequests',    'real_estate_expertise_requests',   'reference_number',         70),
  ('disputes',             'cadastral_land_disputes',          'parcel_number',            80),
  ('boundaryConflicts',    'cadastral_boundary_conflicts',     'reporting_parcel_number',  90),
  ('mutationRequests',     'mutation_requests',                'reference_number',        100),
  ('subdivisionRequests',  'subdivision_requests',             'reference_number',        110)
ON CONFLICT (label_key) DO NOTHING;

-- ============================================================================
-- 2. count_test_data_stats: dynamic version (registry-driven)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.count_test_data_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  rec record;
  cnt bigint;
  -- Static counters that don't fit the registry pattern (FK-based or special filters)
  parcel_ids uuid[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  -- Iterate over registry: simple "marker_column LIKE marker_pattern" entities
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

  -- Special: payments via metadata flag
  SELECT count(*) INTO cnt FROM public.payment_transactions WHERE metadata->>'test_mode' = 'true';
  result := result || jsonb_build_object('payments', cnt);

  -- Special: expertise_payments via FK to TEST- expertise requests
  SELECT count(*) INTO cnt FROM public.expertise_payments
    WHERE expertise_request_id IN (
      SELECT id FROM public.real_estate_expertise_requests WHERE reference_number LIKE 'TEST-%'
    );
  result := result || jsonb_build_object('expertisePayments', cnt);

  -- Special: parcel-children via FK
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

  -- Special: fraud_attempts via FK to TEST- contributions
  SELECT count(*) INTO cnt FROM public.fraud_attempts
    WHERE contribution_id IN (
      SELECT id FROM public.cadastral_contributions WHERE parcel_number LIKE 'TEST-%'
    );
  result := result || jsonb_build_object('fraudAttempts', cnt);

  -- Special: certificates (uses generated_certificates if table exists)
  BEGIN
    SELECT count(*) INTO cnt FROM public.generated_certificates WHERE reference_number LIKE 'TEST-%';
    result := result || jsonb_build_object('certificates', cnt);
  EXCEPTION WHEN undefined_table THEN
    result := result || jsonb_build_object('certificates', 0);
  END;

  RETURN result;
END;
$$;

-- ============================================================================
-- 3. cleanup_all_test_data: add unified audit log at the end
-- ============================================================================
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

  DELETE FROM public.cadastral_land_disputes WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_land_disputes', cnt);

  DELETE FROM public.land_title_requests WHERE reference_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('land_title_requests', cnt);

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
  END IF;

  DELETE FROM public.cadastral_parcels WHERE parcel_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_parcels', cnt);

  BEGIN
    DELETE FROM public.generated_certificates WHERE reference_number LIKE 'TEST-%';
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('generated_certificates', cnt);
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  DELETE FROM public.mutation_requests WHERE reference_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('mutation_requests', cnt);

  DELETE FROM public.subdivision_requests WHERE reference_number LIKE 'TEST-%';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('subdivision_requests', cnt);

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

-- ============================================================================
-- 4. cleanup_all_test_data_auto: callable by cron without admin check
--    SECURITY DEFINER + no role gate (cron runs as postgres superuser)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_all_test_data_auto()
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
  cfg jsonb;
  retention_days int := 7;
  cutoff timestamptz;
  total_deleted integer := 0;
BEGIN
  -- Read config
  SELECT config_value INTO cfg
    FROM public.cadastral_search_config
    WHERE config_key = 'test_mode' AND is_active = true
    LIMIT 1;

  IF cfg IS NULL OR (cfg->>'enabled')::boolean IS DISTINCT FROM true OR (cfg->>'auto_cleanup')::boolean IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'auto_cleanup disabled');
  END IF;

  retention_days := COALESCE((cfg->>'test_data_retention_days')::int, 7);
  cutoff := now() - make_interval(days => retention_days);

  DELETE FROM public.fraud_attempts WHERE contribution_id IN (
    SELECT id FROM public.cadastral_contributions
    WHERE parcel_number LIKE 'TEST-%' AND created_at < cutoff
  );
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('fraud_attempts', cnt);

  DELETE FROM public.cadastral_contributor_codes
    WHERE parcel_number LIKE 'TEST-%' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_contributor_codes', cnt);

  DELETE FROM public.cadastral_service_access
    WHERE parcel_number LIKE 'TEST-%' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_service_access', cnt);

  DELETE FROM public.expertise_payments WHERE expertise_request_id IN (
    SELECT id FROM public.real_estate_expertise_requests
    WHERE reference_number LIKE 'TEST-%' AND created_at < cutoff
  );
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('expertise_payments', cnt);

  DELETE FROM public.payment_transactions
    WHERE metadata->>'test_mode' = 'true' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('payment_transactions', cnt);

  DELETE FROM public.real_estate_expertise_requests
    WHERE reference_number LIKE 'TEST-%' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('real_estate_expertise_requests', cnt);

  DELETE FROM public.cadastral_invoices
    WHERE parcel_number LIKE 'TEST-%' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_invoices', cnt);

  DELETE FROM public.cadastral_contributions
    WHERE parcel_number LIKE 'TEST-%' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_contributions', cnt);

  DELETE FROM public.cadastral_boundary_conflicts
    WHERE reporting_parcel_number LIKE 'TEST-%' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_boundary_conflicts', cnt);

  DELETE FROM public.cadastral_land_disputes
    WHERE parcel_number LIKE 'TEST-%' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_land_disputes', cnt);

  DELETE FROM public.land_title_requests
    WHERE reference_number LIKE 'TEST-%' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('land_title_requests', cnt);

  SELECT array_agg(id) INTO parcel_ids
    FROM public.cadastral_parcels
    WHERE parcel_number LIKE 'TEST-%' AND created_at < cutoff;

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

  DELETE FROM public.cadastral_parcels
    WHERE parcel_number LIKE 'TEST-%' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('cadastral_parcels', cnt);

  DELETE FROM public.mutation_requests
    WHERE reference_number LIKE 'TEST-%' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('mutation_requests', cnt);

  DELETE FROM public.subdivision_requests
    WHERE reference_number LIKE 'TEST-%' AND created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('subdivision_requests', cnt);

  SELECT COALESCE(SUM(value::int), 0) INTO total_deleted
    FROM jsonb_each_text(result);

  PERFORM public.log_audit_action(
    'AUTO_TEST_DATA_CLEANUP',
    'cadastral_contributions',
    NULL,
    jsonb_build_object('retention_days', retention_days, 'cutoff', cutoff),
    jsonb_build_object('total', total_deleted, 'per_table', result)
  );

  RETURN result;
END;
$function$;

-- ============================================================================
-- 5. Anti-insert trigger: block TEST- inserts when test_mode disabled
-- ============================================================================
CREATE OR REPLACE FUNCTION public.prevent_test_data_in_prod()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cfg jsonb;
  marker text;
BEGIN
  -- Pick the relevant column for this trigger (set via TG_ARGV[0])
  IF TG_ARGV[0] IS NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE format('SELECT ($1).%I::text', TG_ARGV[0]) INTO marker USING NEW;

  IF marker IS NULL OR marker NOT LIKE 'TEST-%' THEN
    RETURN NEW;
  END IF;

  SELECT config_value INTO cfg
    FROM public.cadastral_search_config
    WHERE config_key = 'test_mode' AND is_active = true
    LIMIT 1;

  IF cfg IS NULL OR (cfg->>'enabled')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Insertion de données TEST- bloquée: le mode test est désactivé';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('cadastral_parcels',              'parcel_number'),
      ('cadastral_contributions',        'parcel_number'),
      ('cadastral_invoices',             'parcel_number'),
      ('cadastral_contributor_codes',    'parcel_number'),
      ('cadastral_land_disputes',        'parcel_number'),
      ('real_estate_expertise_requests', 'reference_number'),
      ('land_title_requests',            'reference_number'),
      ('mutation_requests',              'reference_number'),
      ('subdivision_requests',           'reference_number'),
      ('cadastral_boundary_conflicts',   'reporting_parcel_number')
    ) AS t(tbl, col)
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_prevent_test_data_in_prod ON public.%I',
      rec.tbl
    );
    EXECUTE format(
      'CREATE TRIGGER trg_prevent_test_data_in_prod BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.prevent_test_data_in_prod(%L)',
      rec.tbl, rec.col
    );
  END LOOP;
END $$;

-- ============================================================================
-- 6. Replace cron: drop legacy edge-function cron, install RPC-based cron
-- ============================================================================
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-test-data-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-test-data-daily-rpc');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cleanup-test-data-daily-rpc',
  '0 3 * * *',
  $$ SELECT public.cleanup_all_test_data_auto(); $$
);

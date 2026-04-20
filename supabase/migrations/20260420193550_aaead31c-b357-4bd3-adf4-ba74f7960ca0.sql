
-- 1. Compléter le registry avec les tables enfants utilisées par la purge
INSERT INTO public.test_entities_registry (label_key, table_name, marker_column, marker_pattern, display_order, is_active)
VALUES
  ('ownershipHistory',  'cadastral_ownership_history', 'owner_name',           'TEST-%', 150, true),
  ('taxHistory',        'cadastral_tax_history',       'receipt_document_url', 'TEST-%', 160, true),
  ('boundaryHistory',   'cadastral_boundary_history',  'pv_reference_number',  'TEST-%', 170, true),
  ('mortgagePayments',  'cadastral_mortgage_payments', 'payment_receipt_url',  'TEST-%', 180, true),
  ('expertisePayments', 'real_estate_expertise_payments','transaction_reference','TEST-%', 190, true),
  ('fraudAttempts',     'fraud_attempts',              'reference_number',     'TEST-%', 200, true),
  ('permitPayments',    'building_permit_payments',    'payment_reference',    'TEST-%', 210, true),
  ('permitAdminActions','building_permit_admin_actions','notes',               'TEST-%', 220, true)
ON CONFLICT (label_key) DO NOTHING;

-- 2. Marquer la RPC manuelle comme dépréciée (NOTICE en tête d'exécution).
--    On ne change ni la signature ni la logique pour préserver toute compatibilité.
DO $$
DECLARE
  src text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
    INTO src
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'cleanup_all_test_data'
  LIMIT 1;

  IF src IS NULL THEN
    RAISE NOTICE 'cleanup_all_test_data() not found, skipping deprecation tag';
    RETURN;
  END IF;

  -- Inject RAISE NOTICE just after the BEGIN (idempotent: skip if already present)
  IF position('Deprecated: use cleanup-test-data-batch' in src) > 0 THEN
    RAISE NOTICE 'cleanup_all_test_data() already tagged as deprecated';
    RETURN;
  END IF;

  -- Replace the first BEGIN with BEGIN + RAISE NOTICE
  src := regexp_replace(
    src,
    'AS \$function\$\s*(DECLARE|BEGIN)',
    E'AS $function$\n\\1\n  -- DEPRECATION NOTICE injected by migration\n  ',
    'i'
  );
  -- Inject the actual notice right after the first BEGIN keyword
  src := regexp_replace(
    src,
    '(\nBEGIN\n)',
    E'\nBEGIN\n  RAISE NOTICE ''[DEPRECATED] cleanup_all_test_data() is deprecated. Use the cleanup-test-data-batch edge function instead.'';\n',
    'i'
  );

  EXECUTE src;
END $$;

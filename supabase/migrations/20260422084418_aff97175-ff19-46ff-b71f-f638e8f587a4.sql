-- Activate the 8 child entities in the test entities registry
-- so count_test_data_stats() and TestDataExportButton include them
-- (the cleanup-test-data-batch edge function already purges them).
UPDATE public.test_entities_registry
SET is_active = true
WHERE label_key IN (
  'ownershipHistory',
  'taxHistory',
  'boundaryHistory',
  'mortgagePayments',
  'expertisePayments',
  'fraudAttempts',
  'permitPayments',
  'permitAdminActions'
)
AND is_active = false;
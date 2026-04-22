UPDATE public.test_entities_registry
SET is_active = false
WHERE label_key IN (
  'fraudAttempts',
  'ownershipHistory',
  'taxHistory',
  'boundaryHistory',
  'expertisePayments',
  'mortgagePayments'
);
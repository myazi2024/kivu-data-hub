UPDATE public.test_entities_registry
   SET is_active = false
 WHERE label_key IN (
   'ownershipHistory','taxHistory','boundaryHistory',
   'mortgagePayments','expertisePayments','fraudAttempts',
   'permitPayments','permitAdminActions'
 );
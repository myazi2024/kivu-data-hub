UPDATE public.test_entities_registry
SET table_name = 'expertise_payments', marker_column = 'transaction_id'
WHERE label_key = 'expertisePayments';

UPDATE public.test_entities_registry
SET table_name = 'permit_payments', marker_column = 'transaction_id'
WHERE label_key = 'permitPayments';

UPDATE public.test_entities_registry
SET table_name = 'permit_admin_actions', marker_column = 'comment'
WHERE label_key = 'permitAdminActions';
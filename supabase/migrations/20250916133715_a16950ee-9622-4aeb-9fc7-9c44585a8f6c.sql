-- Créer un revendeur de test
INSERT INTO public.resellers (
    id,
    user_id,
    reseller_code, 
    business_name,
    commission_rate,
    is_active,
    contact_phone
) VALUES (
    gen_random_uuid(),
    gen_random_uuid(), -- ID utilisateur fictif pour le test
    'TEST-RESELLER',
    'BIC Test Reseller',
    15.00,
    true,
    '+243 999 000 001'
);

-- Créer des codes de remise de test
INSERT INTO public.discount_codes (
    id,
    reseller_id,
    code,
    discount_amount_usd,
    discount_percentage,
    is_active,
    expires_at,
    max_usage
) VALUES 
(
    gen_random_uuid(),
    (SELECT id FROM public.resellers WHERE reseller_code = 'TEST-RESELLER'),
    'BIC-TEST50',
    50.00,
    NULL,
    true,
    now() + INTERVAL '30 days',
    10
),
(
    gen_random_uuid(),
    (SELECT id FROM public.resellers WHERE reseller_code = 'TEST-RESELLER'),
    'PROMO2024',
    25.00,
    NULL,
    true,
    now() + INTERVAL '7 days',
    5
),
(
    gen_random_uuid(),
    (SELECT id FROM public.resellers WHERE reseller_code = 'TEST-RESELLER'),
    'REMISE20',
    NULL,
    20.00,
    true,
    now() + INTERVAL '15 days',
    NULL
);
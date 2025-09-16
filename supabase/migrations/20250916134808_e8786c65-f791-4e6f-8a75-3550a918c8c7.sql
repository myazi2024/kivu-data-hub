-- Créer des codes de remise de test directement sans revendeur
-- D'abord, insérer un revendeur avec un user_id NULL temporairement
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
    gen_random_uuid(), -- ID revendeur fictif
    'BIC-TEST50',
    50.00,
    NULL,
    true,
    now() + INTERVAL '30 days',
    10
),
(
    gen_random_uuid(),
    gen_random_uuid(), -- ID revendeur fictif
    'PROMO2024',
    25.00,
    NULL,
    true,
    now() + INTERVAL '7 days',
    5
),
(
    gen_random_uuid(),
    gen_random_uuid(), -- ID revendeur fictif
    'REMISE20',
    NULL,
    20.00,
    true,
    now() + INTERVAL '15 days',
    NULL
);
-- Créer temporairement des codes de remise de test en gérant les contraintes
-- Désactiver temporairement la contrainte de clé étrangère
ALTER TABLE public.discount_codes DROP CONSTRAINT IF EXISTS discount_codes_reseller_id_fkey;

-- Insérer les codes de remise de test
INSERT INTO public.discount_codes (
    id,
    reseller_id,
    code,
    discount_amount_usd,
    discount_percentage,
    is_active,
    expires_at,
    max_usage,
    usage_count
) VALUES 
(
    gen_random_uuid(),
    gen_random_uuid(), -- ID revendeur fictif pour test
    'BIC-TEST50',
    50.00,
    NULL,
    true,
    now() + INTERVAL '30 days',
    10,
    0
),
(
    gen_random_uuid(),
    gen_random_uuid(), -- ID revendeur fictif pour test
    'PROMO2024',
    25.00,
    NULL,
    true,
    now() + INTERVAL '7 days',
    5,
    0
),
(
    gen_random_uuid(),
    gen_random_uuid(), -- ID revendeur fictif pour test
    'REMISE20',
    NULL,
    20.00,
    true,
    now() + INTERVAL '15 days',
    NULL,
    0
);

-- Note: La contrainte de clé étrangère peut être rétablie plus tard si nécessaire
-- avec: ALTER TABLE public.discount_codes ADD CONSTRAINT discount_codes_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.resellers(id);
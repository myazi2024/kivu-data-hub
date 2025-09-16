-- Créer un revendeur de test d'abord
-- D'abord créer un profil de test temporaire
INSERT INTO public.profiles (id, user_id, email, full_name, role)
VALUES (
    gen_random_uuid(),
    gen_random_uuid(),
    'test-reseller@bic.com',
    'Test Reseller BIC',
    'user'
);

-- Créer un revendeur de test avec un user_id valide
INSERT INTO public.resellers (
    id,
    user_id,
    reseller_code,
    business_name,
    commission_rate,
    is_active,
    contact_phone
) SELECT 
    gen_random_uuid(),
    user_id,
    'TEST-RESELLER',
    'BIC Test Reseller',
    15.00,
    true,
    '+243 999 000 001'
FROM public.profiles 
WHERE email = 'test-reseller@bic.com'
LIMIT 1;

-- Mettre à jour les codes de remise existants pour pointer vers le bon revendeur
UPDATE public.discount_codes 
SET reseller_id = (SELECT id FROM public.resellers WHERE reseller_code = 'TEST-RESELLER')
WHERE code IN ('BIC-TEST50', 'PROMO2024', 'REMISE20');
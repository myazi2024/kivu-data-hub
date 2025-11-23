-- Migration pour créer des resellers par défaut pour les discount_codes orphelins
-- et corriger les problèmes de données

-- D'abord, créons la fonction generate_reseller_code si elle n'existe pas
CREATE OR REPLACE FUNCTION generate_reseller_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Générer un code aléatoire de 8 caractères
    new_code := 'RSL-' || upper(substring(md5(random()::text) from 1 for 8));
    
    -- Vérifier si le code existe déjà
    SELECT EXISTS(SELECT 1 FROM resellers WHERE reseller_code = new_code) INTO code_exists;
    
    -- Si le code n'existe pas, le retourner
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$;

-- Créer un revendeur par défaut pour le système
DO $$
DECLARE
  default_reseller_id UUID;
  admin_user_id UUID;
BEGIN
  -- Trouver un utilisateur admin
  SELECT user_id INTO admin_user_id
  FROM user_roles
  WHERE role = 'admin'
  LIMIT 1;

  -- Si pas d'admin, utiliser le premier utilisateur de auth.users
  IF admin_user_id IS NULL THEN
    SELECT id INTO admin_user_id
    FROM auth.users
    LIMIT 1;
  END IF;

  -- Si toujours pas d'utilisateur, créer un UUID fictif
  IF admin_user_id IS NULL THEN
    admin_user_id := gen_random_uuid();
  END IF;

  -- Créer un revendeur par défaut pour chaque reseller_id orphelin
  FOR default_reseller_id IN 
    SELECT DISTINCT reseller_id
    FROM discount_codes
    WHERE NOT EXISTS (
      SELECT 1 FROM resellers WHERE id = discount_codes.reseller_id
    )
  LOOP
    INSERT INTO resellers (
      id,
      user_id,
      reseller_code,
      business_name,
      contact_phone,
      commission_rate,
      fixed_commission_usd,
      is_active
    ) VALUES (
      default_reseller_id,
      admin_user_id,
      generate_reseller_code(),
      'Revendeur Legacy (à configurer)',
      NULL,
      10.0,
      0,
      false  -- Désactivé par défaut jusqu'à configuration
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- Ajouter un commentaire sur la table pour documenter
COMMENT ON TABLE resellers IS 'Table des revendeurs qui peuvent créer des codes de remise';
COMMENT ON COLUMN resellers.reseller_code IS 'Code unique du revendeur généré automatiquement';
COMMENT ON COLUMN resellers.commission_rate IS 'Taux de commission en pourcentage (0-100)';
COMMENT ON COLUMN resellers.fixed_commission_usd IS 'Commission fixe en USD par vente (0 pour utiliser commission_rate)';
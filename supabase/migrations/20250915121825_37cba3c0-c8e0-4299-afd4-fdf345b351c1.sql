-- Créer une table pour stocker la configuration des services cadastraux
CREATE TABLE IF NOT EXISTS public.cadastral_services_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_usd NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insérer les services actuels dans la base de données
INSERT INTO public.cadastral_services_config (service_id, name, price_usd, description) VALUES
('information', 'Informations générales', 3, 'Identité du propriétaire actuel, superficie exacte, statut juridique de la parcelle et coordonnées géographiques. Idéal pour vérifier la propriété et obtenir les données de base.'),
('location_history', 'Localisation et Historique de bornage', 2, 'Position géographique précise, limites cadastrales, historique complet des opérations de bornage et modifications géométriques. Essentiel pour les projets de construction et délimitation de terrain.'),
('history', 'Historique complet des propriétaires', 3, 'Chaîne complète de propriété depuis la création de la parcelle, toutes les transactions, mutations, héritages et transferts. Crucial pour vérifier la légalité des transactions passées.'),
('obligations', 'Obligations fiscales et hypothécaires', 15, 'État détaillé des taxes foncières impayées, hypothèques en cours, servitudes, restrictions d''usage et tous encumbrements juridiques. Indispensable avant tout achat immobilier.');

-- RLS pour la table des services
ALTER TABLE public.cadastral_services_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services config are viewable by everyone" 
ON public.cadastral_services_config 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Only admins can manage services config" 
ON public.cadastral_services_config 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Trigger pour updated_at
CREATE TRIGGER update_cadastral_services_config_updated_at
  BEFORE UPDATE ON public.cadastral_services_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Créer une fonction pour valider et créer une facture cadastrale sécurisée
CREATE OR REPLACE FUNCTION public.create_cadastral_invoice_secure(
  parcel_number_param TEXT,
  selected_services_param TEXT[],
  discount_code_param TEXT DEFAULT NULL
)
RETURNS TABLE(
  invoice_id UUID,
  invoice_number TEXT,
  total_amount_usd NUMERIC,
  original_amount_usd NUMERIC,
  discount_amount_usd NUMERIC,
  discount_code_used TEXT,
  services_data JSONB,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  calculated_total NUMERIC := 0;
  original_total NUMERIC := 0;
  discount_amount NUMERIC := 0;
  discount_code TEXT := NULL;
  invoice_id_var UUID;
  invoice_number_var TEXT;
  services_info JSONB;
  discount_validation RECORD;
  user_id_var UUID;
BEGIN
  -- Vérifier l'authentification
  user_id_var := auth.uid();
  IF user_id_var IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, NULL::TEXT, NULL::JSONB, 'Utilisateur non authentifié'::TEXT;
    RETURN;
  END IF;

  -- Vérifier que la parcelle existe
  IF NOT EXISTS (SELECT 1 FROM public.cadastral_parcels WHERE parcel_number = parcel_number_param) THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, NULL::TEXT, NULL::JSONB, 'Parcelle non trouvée'::TEXT;
    RETURN;
  END IF;

  -- Valider et calculer le montant total depuis la base de données
  SELECT 
    COALESCE(SUM(price_usd), 0),
    json_agg(json_build_object('id', service_id, 'name', name, 'price', price_usd, 'description', description))
  INTO original_total, services_info
  FROM public.cadastral_services_config 
  WHERE service_id = ANY(selected_services_param) AND is_active = true;

  IF original_total = 0 THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, NULL::TEXT, NULL::JSONB, 'Aucun service valide sélectionné'::TEXT;
    RETURN;
  END IF;

  calculated_total := original_total;

  -- Valider le code de remise si fourni
  IF discount_code_param IS NOT NULL AND discount_code_param != '' THEN
    SELECT * INTO discount_validation
    FROM public.validate_and_apply_discount_code(discount_code_param, calculated_total);
    
    IF discount_validation.is_valid THEN
      discount_amount := discount_validation.discount_amount;
      discount_code := discount_code_param;
      calculated_total := calculated_total - discount_amount;
    END IF;
  END IF;

  -- Créer la facture dans la base de données
  INSERT INTO public.cadastral_invoices (
    user_id,
    parcel_number,
    selected_services,
    total_amount_usd,
    original_amount_usd,
    discount_amount_usd,
    discount_code_used,
    client_email,
    client_name,
    status
  ) VALUES (
    user_id_var,
    parcel_number_param,
    to_jsonb(selected_services_param),
    calculated_total,
    original_total,
    discount_amount,
    discount_code,
    (SELECT email FROM public.profiles WHERE user_id = user_id_var),
    (SELECT full_name FROM public.profiles WHERE user_id = user_id_var),
    'pending'
  ) RETURNING id, invoice_number INTO invoice_id_var, invoice_number_var;

  -- Enregistrer dans les ventes du revendeur si applicable
  IF discount_validation.is_valid AND discount_validation.reseller_id IS NOT NULL THEN
    INSERT INTO public.reseller_sales (
      reseller_id,
      invoice_id,
      discount_code_id,
      sale_amount_usd,
      discount_applied_usd,
      commission_earned_usd
    )
    SELECT 
      discount_validation.reseller_id,
      invoice_id_var,
      discount_validation.code_id,
      calculated_total,
      discount_amount,
      CASE 
        WHEN r.fixed_commission_usd > 0 THEN r.fixed_commission_usd
        ELSE (calculated_total * r.commission_rate / 100)
      END
    FROM public.resellers r 
    WHERE r.id = discount_validation.reseller_id;

    -- Incrémenter le compteur d'utilisation du code
    UPDATE public.discount_codes 
    SET usage_count = usage_count + 1, updated_at = now()
    WHERE id = discount_validation.code_id;
  END IF;

  RETURN QUERY SELECT 
    invoice_id_var, 
    invoice_number_var, 
    calculated_total, 
    original_total, 
    discount_amount, 
    discount_code, 
    services_info,
    NULL::TEXT;
END;
$$;
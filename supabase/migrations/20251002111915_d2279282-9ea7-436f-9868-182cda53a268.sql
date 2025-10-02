-- Table pour les contributions cadastrales (données à vérifier)
CREATE TABLE public.cadastral_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  parcel_number TEXT NOT NULL,
  
  -- Informations générales
  property_title_type TEXT,
  current_owner_name TEXT,
  current_owner_legal_status TEXT,
  current_owner_since DATE,
  area_sqm NUMERIC,
  construction_type TEXT,
  construction_nature TEXT,
  declared_usage TEXT,
  
  -- Localisation
  province TEXT,
  ville TEXT,
  commune TEXT,
  quartier TEXT,
  avenue TEXT,
  territoire TEXT,
  collectivite TEXT,
  groupement TEXT,
  village TEXT,
  gps_coordinates JSONB,
  
  -- Historiques
  ownership_history JSONB,
  boundary_history JSONB,
  
  -- Obligations
  tax_history JSONB,
  mortgage_history JSONB,
  
  -- Métadonnées
  whatsapp_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les Codes Contributeur Cadastral (CCC)
CREATE TABLE public.cadastral_contributor_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contribution_id UUID NOT NULL REFERENCES public.cadastral_contributions(id) ON DELETE CASCADE,
  parcel_number TEXT NOT NULL,
  
  -- Valeur et utilisation
  value_usd NUMERIC NOT NULL DEFAULT 5.00,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  invoice_id UUID REFERENCES public.cadastral_invoices(id) ON DELETE SET NULL,
  
  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '90 days'),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cadastral_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadastral_contributor_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour cadastral_contributions
CREATE POLICY "Users can create their own contributions"
  ON public.cadastral_contributions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own contributions"
  ON public.cadastral_contributions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all contributions"
  ON public.cadastral_contributions
  FOR SELECT
  TO authenticated
  USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can update contributions"
  ON public.cadastral_contributions
  FOR UPDATE
  TO authenticated
  USING (get_current_user_role() = 'admin');

-- RLS Policies pour cadastral_contributor_codes
CREATE POLICY "Users can view their own codes"
  ON public.cadastral_contributor_codes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create codes"
  ON public.cadastral_contributor_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update codes"
  ON public.cadastral_contributor_codes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR get_current_user_role() = 'admin');

-- Fonction pour générer un code CCC unique
CREATE OR REPLACE FUNCTION public.generate_ccc_code()
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
    -- Générer un code au format CCC-XXXXX (5 chiffres aléatoires)
    new_code := 'CCC-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    
    -- Vérifier si le code existe déjà
    SELECT EXISTS(SELECT 1 FROM public.cadastral_contributor_codes WHERE code = new_code) INTO code_exists;
    
    -- Si le code n'existe pas, on sort de la boucle
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Fonction pour valider et appliquer un CCC
CREATE OR REPLACE FUNCTION public.validate_and_apply_ccc(
  code_input TEXT,
  invoice_amount NUMERIC
)
RETURNS TABLE(
  is_valid BOOLEAN,
  discount_amount NUMERIC,
  code_id UUID,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ccc_record RECORD;
  calculated_discount NUMERIC := 0;
BEGIN
  -- Chercher le code CCC
  SELECT c.id, c.value_usd, c.is_used, c.expires_at, c.user_id
  INTO ccc_record
  FROM public.cadastral_contributor_codes c
  WHERE c.code = code_input
    AND c.is_used = false
    AND c.expires_at > now();

  -- Si le code n'est pas trouvé ou invalide
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, 'Code invalide ou expiré'::TEXT;
    RETURN;
  END IF;

  -- Vérifier que le code appartient à l'utilisateur connecté
  IF ccc_record.user_id != auth.uid() THEN
    RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, 'Ce code ne vous appartient pas'::TEXT;
    RETURN;
  END IF;

  -- Calculer la remise (valeur du CCC, mais ne peut pas dépasser le montant)
  calculated_discount := LEAST(ccc_record.value_usd, invoice_amount);

  RETURN QUERY SELECT true, calculated_discount, ccc_record.id, 'Code valide'::TEXT;
END;
$$;

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_cadastral_contributions_updated_at
  BEFORE UPDATE ON public.cadastral_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour améliorer les performances
CREATE INDEX idx_cadastral_contributions_user_id ON public.cadastral_contributions(user_id);
CREATE INDEX idx_cadastral_contributions_status ON public.cadastral_contributions(status);
CREATE INDEX idx_cadastral_contributions_parcel_number ON public.cadastral_contributions(parcel_number);
CREATE INDEX idx_cadastral_contributor_codes_user_id ON public.cadastral_contributor_codes(user_id);
CREATE INDEX idx_cadastral_contributor_codes_code ON public.cadastral_contributor_codes(code);
CREATE INDEX idx_cadastral_contributor_codes_is_used ON public.cadastral_contributor_codes(is_used);
CREATE INDEX idx_cadastral_contributor_codes_expires_at ON public.cadastral_contributor_codes(expires_at);
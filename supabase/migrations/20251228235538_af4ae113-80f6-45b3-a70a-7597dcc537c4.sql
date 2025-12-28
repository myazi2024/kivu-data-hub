-- =====================================================
-- Table pour les demandes de titre foncier
-- =====================================================
CREATE TABLE public.land_title_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reference_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  
  -- Informations du demandeur
  requester_type TEXT NOT NULL DEFAULT 'owner',
  requester_last_name TEXT NOT NULL,
  requester_first_name TEXT NOT NULL,
  requester_middle_name TEXT,
  requester_phone TEXT NOT NULL,
  requester_email TEXT,
  requester_id_document_url TEXT,
  
  -- Informations du propriétaire (si différent du demandeur)
  is_owner_same_as_requester BOOLEAN DEFAULT true,
  owner_last_name TEXT,
  owner_first_name TEXT,
  owner_middle_name TEXT,
  owner_legal_status TEXT DEFAULT 'Personne physique',
  owner_phone TEXT,
  owner_id_document_url TEXT,
  
  -- Localisation de la parcelle
  section_type TEXT NOT NULL,
  province TEXT NOT NULL,
  ville TEXT,
  commune TEXT,
  quartier TEXT,
  avenue TEXT,
  territoire TEXT,
  collectivite TEXT,
  groupement TEXT,
  village TEXT,
  circonscription_fonciere TEXT,
  
  -- Données techniques
  area_sqm NUMERIC,
  gps_coordinates JSONB,
  parcel_sides JSONB,
  road_bordering_sides JSONB,
  
  -- Documents
  proof_of_ownership_url TEXT,
  additional_documents JSONB DEFAULT '[]'::jsonb,
  
  -- Paiement
  fee_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount_usd NUMERIC NOT NULL DEFAULT 0,
  payment_id UUID,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Traitement
  processing_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  estimated_processing_days INTEGER DEFAULT 30,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.land_title_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create their own land title requests"
  ON public.land_title_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own land title requests"
  ON public.land_title_requests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all land title requests"
  ON public.land_title_requests
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
  ));

CREATE POLICY "Admins can update land title requests"
  ON public.land_title_requests
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
  ));

CREATE POLICY "Users can update their own pending requests"
  ON public.land_title_requests
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Index pour optimisation
CREATE INDEX idx_land_title_requests_user_id ON public.land_title_requests(user_id);
CREATE INDEX idx_land_title_requests_status ON public.land_title_requests(status);
CREATE INDEX idx_land_title_requests_reference ON public.land_title_requests(reference_number);

-- Fonction pour générer le numéro de référence
CREATE OR REPLACE FUNCTION public.generate_land_title_reference()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  reference TEXT;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(reference_number FROM 'TF-' || year_part || '-(\d+)$') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM public.land_title_requests
  WHERE reference_number LIKE 'TF-' || year_part || '-%';
  
  reference := 'TF-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
  
  RETURN reference;
END;
$$;

-- Trigger pour générer le numéro de référence
CREATE OR REPLACE FUNCTION public.set_land_title_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.reference_number IS NULL OR NEW.reference_number = '' THEN
    NEW.reference_number := public.generate_land_title_reference();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_land_title_reference_trigger
  BEFORE INSERT ON public.land_title_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_land_title_reference();

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_land_title_requests_updated_at
  BEFORE UPDATE ON public.land_title_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cadastral_services_updated_at();

-- =====================================================
-- Ajouter les permissions pour les demandes de titre
-- =====================================================
INSERT INTO public.permissions (resource_name, action_name, display_name, description) VALUES
  ('land_titles', 'create', 'Créer des demandes de titre', 'Permet de créer des demandes de titre foncier'),
  ('land_titles', 'read', 'Consulter les demandes de titre', 'Permet de consulter les demandes de titre foncier'),
  ('land_titles', 'update', 'Modifier les demandes de titre', 'Permet de modifier les demandes de titre foncier'),
  ('land_titles', 'approve', 'Approuver les demandes de titre', 'Permet d''approuver ou rejeter les demandes de titre'),
  ('land_titles', 'delete', 'Supprimer les demandes de titre', 'Permet de supprimer des demandes de titre foncier')
ON CONFLICT DO NOTHING;

-- =====================================================
-- Table de configuration des frais de titre foncier
-- =====================================================
CREATE TABLE public.land_title_fees_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fee_name TEXT NOT NULL,
  description TEXT,
  amount_usd NUMERIC NOT NULL DEFAULT 0,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.land_title_fees_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Land title fees config viewable by everyone"
  ON public.land_title_fees_config
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage land title fees config"
  ON public.land_title_fees_config
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
  ));

-- Insérer les frais par défaut
INSERT INTO public.land_title_fees_config (fee_name, description, amount_usd, is_mandatory, display_order) VALUES
  ('Frais de mesurage', 'Frais pour le mesurage officiel de la parcelle', 50, true, 1),
  ('Frais de bornage', 'Frais pour la pose des bornes cadastrales', 75, true, 2),
  ('Frais d''enregistrement', 'Frais administratifs d''enregistrement au cadastre', 100, true, 3),
  ('Frais de délivrance du titre', 'Frais pour l''établissement du certificat d''enregistrement', 150, true, 4),
  ('Frais de dossier', 'Frais de traitement du dossier', 25, true, 5);
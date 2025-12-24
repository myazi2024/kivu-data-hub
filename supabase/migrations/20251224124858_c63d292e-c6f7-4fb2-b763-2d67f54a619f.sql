-- Créer la table pour les demandes d'expertise immobilière
CREATE TABLE IF NOT EXISTS public.real_estate_expertise_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  parcel_id UUID REFERENCES public.cadastral_parcels(id),
  parcel_number TEXT NOT NULL,
  
  -- Informations sur le bien
  property_description TEXT,
  construction_year INTEGER,
  construction_quality TEXT,
  number_of_floors INTEGER DEFAULT 1,
  total_built_area_sqm NUMERIC,
  property_condition TEXT,
  
  -- Équipements et commodités
  has_water_supply BOOLEAN DEFAULT false,
  has_electricity BOOLEAN DEFAULT false,
  has_sewage_system BOOLEAN DEFAULT false,
  has_internet BOOLEAN DEFAULT false,
  has_security_system BOOLEAN DEFAULT false,
  has_parking BOOLEAN DEFAULT false,
  parking_spaces INTEGER,
  has_garden BOOLEAN DEFAULT false,
  garden_area_sqm NUMERIC,
  
  -- Environnement et accessibilité
  road_access_type TEXT,
  distance_to_main_road_m NUMERIC,
  distance_to_hospital_km NUMERIC,
  distance_to_school_km NUMERIC,
  distance_to_market_km NUMERIC,
  flood_risk_zone BOOLEAN DEFAULT false,
  erosion_risk_zone BOOLEAN DEFAULT false,
  
  -- Informations complémentaires
  additional_notes TEXT,
  supporting_documents JSONB DEFAULT '[]'::jsonb,
  
  -- Demandeur
  requester_name TEXT NOT NULL,
  requester_phone TEXT,
  requester_email TEXT,
  
  -- Traitement
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'rejected')),
  assigned_to UUID,
  assigned_at TIMESTAMP WITH TIME ZONE,
  
  -- Résultat de l'expertise
  market_value_usd NUMERIC,
  expertise_date TIMESTAMP WITH TIME ZONE,
  expertise_report_url TEXT,
  certificate_url TEXT,
  certificate_issue_date TIMESTAMP WITH TIME ZONE,
  certificate_expiry_date TIMESTAMP WITH TIME ZONE,
  
  -- Notes de traitement
  processing_notes TEXT,
  rejection_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_expertise_requests_user_id ON public.real_estate_expertise_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_expertise_requests_parcel_number ON public.real_estate_expertise_requests(parcel_number);
CREATE INDEX IF NOT EXISTS idx_expertise_requests_status ON public.real_estate_expertise_requests(status);
CREATE INDEX IF NOT EXISTS idx_expertise_requests_assigned_to ON public.real_estate_expertise_requests(assigned_to);

-- Enable RLS
ALTER TABLE public.real_estate_expertise_requests ENABLE ROW LEVEL SECURITY;

-- Fonction simplifiée pour vérifier si un utilisateur a le rôle expert_immobilier ou admin
CREATE OR REPLACE FUNCTION public.is_expert_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_role boolean;
BEGIN
  -- Check user_roles table (using text comparison)
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin', 'expert_immobilier', 'super_admin')
  ) INTO has_role;
  
  IF has_role THEN
    RETURN true;
  END IF;
  
  -- Check profiles table
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND role::text IN ('admin', 'super_admin')
  ) INTO has_role;
  
  RETURN has_role;
END;
$$;

-- Policies pour les utilisateurs
CREATE POLICY "Users can view their own expertise requests"
  ON public.real_estate_expertise_requests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create expertise requests"
  ON public.real_estate_expertise_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies pour les experts/admins
CREATE POLICY "Experts and admins can view all expertise requests"
  ON public.real_estate_expertise_requests
  FOR SELECT
  USING (public.is_expert_or_admin(auth.uid()));

CREATE POLICY "Experts and admins can update expertise requests"
  ON public.real_estate_expertise_requests
  FOR UPDATE
  USING (public.is_expert_or_admin(auth.uid()));

-- Trigger pour updated_at
CREATE OR REPLACE TRIGGER update_expertise_requests_updated_at
  BEFORE UPDATE ON public.real_estate_expertise_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Ajouter les permissions pour le rôle expert_immobilier
INSERT INTO public.permissions (resource_name, action_name, display_name, description)
VALUES 
  ('expertise_requests', 'view', 'Voir les demandes d''expertise', 'Permet de consulter les demandes d''expertise immobilière'),
  ('expertise_requests', 'process', 'Traiter les demandes d''expertise', 'Permet de traiter et évaluer les demandes d''expertise'),
  ('expertise_requests', 'assign', 'Assigner les demandes d''expertise', 'Permet d''assigner des demandes à des experts')
ON CONFLICT DO NOTHING;
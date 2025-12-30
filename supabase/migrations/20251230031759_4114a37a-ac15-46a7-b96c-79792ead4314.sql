-- Table pour les frais modulaires par type de titre foncier
CREATE TABLE public.land_title_fees_by_type (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title_type TEXT NOT NULL, -- Ex: 'certificat_enregistrement', 'bail_emphyteotique', 'concession_ordinaire', 'permis_occupation', etc.
  fee_category TEXT NOT NULL, -- Ex: 'mesurage', 'bornage', 'enregistrement', 'delivrance', 'dossier'
  fee_name TEXT NOT NULL,
  description TEXT,
  
  -- Montants de base
  base_amount_usd NUMERIC NOT NULL DEFAULT 0,
  
  -- Conditions d'application
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  applies_to_urban BOOLEAN NOT NULL DEFAULT true,
  applies_to_rural BOOLEAN NOT NULL DEFAULT true,
  
  -- Variations par superficie (tranches en m²)
  min_area_sqm NUMERIC, -- Si NULL, pas de minimum
  max_area_sqm NUMERIC, -- Si NULL, pas de maximum
  area_multiplier NUMERIC DEFAULT 1.0, -- Multiplicateur selon la superficie
  
  -- Surcharge par zone
  urban_surcharge_usd NUMERIC DEFAULT 0,
  rural_discount_usd NUMERIC DEFAULT 0,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les recherches fréquentes
CREATE INDEX idx_land_title_fees_by_type_title ON public.land_title_fees_by_type(title_type);
CREATE INDEX idx_land_title_fees_by_type_active ON public.land_title_fees_by_type(is_active);

-- Enable RLS
ALTER TABLE public.land_title_fees_by_type ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Land title fees by type viewable by everyone"
  ON public.land_title_fees_by_type FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage land title fees by type"
  ON public.land_title_fees_by_type FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin')
  ));

-- Trigger pour updated_at
CREATE TRIGGER update_land_title_fees_by_type_updated_at
  BEFORE UPDATE ON public.land_title_fees_by_type
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insertion des données initiales pour chaque type de titre

-- =============================================
-- CERTIFICAT D'ENREGISTREMENT (titre définitif)
-- =============================================
INSERT INTO public.land_title_fees_by_type (title_type, fee_category, fee_name, description, base_amount_usd, is_mandatory, urban_surcharge_usd, display_order) VALUES
('certificat_enregistrement', 'mesurage', 'Frais de mesurage', 'Mesurage officiel par géomètre assermenté', 75, true, 25, 1),
('certificat_enregistrement', 'bornage', 'Frais de bornage', 'Pose des bornes cadastrales officielles', 100, true, 25, 2),
('certificat_enregistrement', 'enregistrement', 'Frais d''enregistrement', 'Enregistrement au livre foncier', 150, true, 50, 3),
('certificat_enregistrement', 'delivrance', 'Frais de délivrance du titre', 'Établissement du certificat d''enregistrement', 200, true, 50, 4),
('certificat_enregistrement', 'dossier', 'Frais de dossier', 'Traitement administratif', 30, true, 10, 5);

-- Frais variables par superficie pour certificat
INSERT INTO public.land_title_fees_by_type (title_type, fee_category, fee_name, description, base_amount_usd, is_mandatory, min_area_sqm, max_area_sqm, display_order) VALUES
('certificat_enregistrement', 'superficie', 'Supplément petite parcelle (<500m²)', 'Pas de supplément', 0, true, 0, 500, 6),
('certificat_enregistrement', 'superficie', 'Supplément parcelle moyenne (500-2000m²)', 'Supplément selon superficie', 50, true, 500, 2000, 7),
('certificat_enregistrement', 'superficie', 'Supplément grande parcelle (2000-10000m²)', 'Supplément selon superficie', 150, true, 2000, 10000, 8),
('certificat_enregistrement', 'superficie', 'Supplément très grande parcelle (>1ha)', 'Supplément pour terrain > 1 hectare', 300, true, 10000, NULL, 9);

-- =============================================
-- CONCESSION PERPÉTUELLE (terrain non bâti)
-- =============================================
INSERT INTO public.land_title_fees_by_type (title_type, fee_category, fee_name, description, base_amount_usd, is_mandatory, urban_surcharge_usd, display_order) VALUES
('concession_perpetuelle', 'mesurage', 'Frais de mesurage', 'Mesurage officiel', 70, true, 20, 1),
('concession_perpetuelle', 'bornage', 'Frais de bornage', 'Pose des bornes', 90, true, 20, 2),
('concession_perpetuelle', 'enregistrement', 'Frais d''enregistrement', 'Enregistrement au cadastre', 120, true, 30, 3),
('concession_perpetuelle', 'delivrance', 'Frais de délivrance', 'Établissement du titre de concession', 175, true, 40, 4),
('concession_perpetuelle', 'dossier', 'Frais de dossier', 'Traitement administratif', 25, true, 5, 5);

-- Frais variables par superficie pour concession perpétuelle
INSERT INTO public.land_title_fees_by_type (title_type, fee_category, fee_name, description, base_amount_usd, is_mandatory, min_area_sqm, max_area_sqm, display_order) VALUES
('concession_perpetuelle', 'superficie', 'Supplément petite parcelle', 'Pas de supplément', 0, true, 0, 500, 6),
('concession_perpetuelle', 'superficie', 'Supplément parcelle moyenne', 'Supplément selon superficie', 40, true, 500, 2000, 7),
('concession_perpetuelle', 'superficie', 'Supplément grande parcelle', 'Supplément selon superficie', 120, true, 2000, 10000, 8),
('concession_perpetuelle', 'superficie', 'Supplément très grande parcelle', 'Supplément > 1 hectare', 250, true, 10000, NULL, 9);

-- =============================================
-- BAIL EMPHYTÉOTIQUE (25 ans - étrangers)
-- =============================================
INSERT INTO public.land_title_fees_by_type (title_type, fee_category, fee_name, description, base_amount_usd, is_mandatory, urban_surcharge_usd, display_order) VALUES
('bail_emphyteotique', 'mesurage', 'Frais de mesurage', 'Mesurage officiel', 80, true, 30, 1),
('bail_emphyteotique', 'bornage', 'Frais de bornage', 'Pose des bornes', 100, true, 25, 2),
('bail_emphyteotique', 'enregistrement', 'Frais d''enregistrement', 'Enregistrement du bail', 130, true, 40, 3),
('bail_emphyteotique', 'delivrance', 'Frais de délivrance du bail', 'Établissement du contrat de bail', 180, true, 50, 4),
('bail_emphyteotique', 'redevance', 'Redevance annuelle (1ère année)', 'Loyer foncier annuel', 100, true, 50, 5),
('bail_emphyteotique', 'dossier', 'Frais de dossier', 'Traitement administratif', 30, true, 10, 6);

-- Frais variables par superficie pour bail emphytéotique
INSERT INTO public.land_title_fees_by_type (title_type, fee_category, fee_name, description, base_amount_usd, is_mandatory, min_area_sqm, max_area_sqm, display_order) VALUES
('bail_emphyteotique', 'superficie', 'Supplément petite parcelle', 'Pas de supplément', 0, true, 0, 500, 7),
('bail_emphyteotique', 'superficie', 'Supplément parcelle moyenne', 'Supplément selon superficie', 60, true, 500, 2000, 8),
('bail_emphyteotique', 'superficie', 'Supplément grande parcelle', 'Supplément selon superficie', 180, true, 2000, 10000, 9),
('bail_emphyteotique', 'superficie', 'Supplément très grande parcelle', 'Supplément > 1 hectare', 400, true, 10000, NULL, 10);

-- =============================================
-- CONCESSION ORDINAIRE (15-25 ans)
-- =============================================
INSERT INTO public.land_title_fees_by_type (title_type, fee_category, fee_name, description, base_amount_usd, is_mandatory, urban_surcharge_usd, display_order) VALUES
('concession_ordinaire', 'mesurage', 'Frais de mesurage', 'Mesurage officiel', 50, true, 15, 1),
('concession_ordinaire', 'bornage', 'Frais de bornage', 'Pose des bornes', 70, true, 15, 2),
('concession_ordinaire', 'enregistrement', 'Frais d''enregistrement', 'Enregistrement de la concession', 80, true, 20, 3),
('concession_ordinaire', 'delivrance', 'Frais de délivrance', 'Établissement du titre', 120, true, 30, 4),
('concession_ordinaire', 'dossier', 'Frais de dossier', 'Traitement administratif', 20, true, 5, 5);

-- Frais variables par superficie pour concession ordinaire
INSERT INTO public.land_title_fees_by_type (title_type, fee_category, fee_name, description, base_amount_usd, is_mandatory, min_area_sqm, max_area_sqm, display_order) VALUES
('concession_ordinaire', 'superficie', 'Supplément petite parcelle', 'Pas de supplément', 0, true, 0, 500, 6),
('concession_ordinaire', 'superficie', 'Supplément parcelle moyenne', 'Supplément selon superficie', 30, true, 500, 2000, 7),
('concession_ordinaire', 'superficie', 'Supplément grande parcelle', 'Supplément selon superficie', 80, true, 2000, 10000, 8),
('concession_ordinaire', 'superficie', 'Supplément très grande parcelle', 'Supplément > 1 hectare', 180, true, 10000, NULL, 9);

-- =============================================
-- PERMIS D'OCCUPATION PROVISOIRE
-- =============================================
INSERT INTO public.land_title_fees_by_type (title_type, fee_category, fee_name, description, base_amount_usd, is_mandatory, urban_surcharge_usd, display_order) VALUES
('permis_occupation', 'mesurage', 'Frais de mesurage', 'Mesurage simplifié', 30, true, 10, 1),
('permis_occupation', 'enregistrement', 'Frais d''enregistrement', 'Enregistrement provisoire', 40, true, 10, 2),
('permis_occupation', 'delivrance', 'Frais de délivrance du permis', 'Établissement du permis', 60, true, 15, 3),
('permis_occupation', 'dossier', 'Frais de dossier', 'Traitement administratif', 15, true, 5, 4);

-- =============================================
-- AUTORISATION D'OCCUPATION PROVISOIRE
-- =============================================
INSERT INTO public.land_title_fees_by_type (title_type, fee_category, fee_name, description, base_amount_usd, is_mandatory, urban_surcharge_usd, display_order) VALUES
('autorisation_occupation', 'enregistrement', 'Frais d''enregistrement', 'Enregistrement de l''autorisation', 25, true, 5, 1),
('autorisation_occupation', 'delivrance', 'Frais de délivrance', 'Établissement de l''autorisation', 35, true, 10, 2),
('autorisation_occupation', 'dossier', 'Frais de dossier', 'Traitement administratif', 10, true, 0, 3);

-- =============================================
-- LOCATION (bail court terme)
-- =============================================
INSERT INTO public.land_title_fees_by_type (title_type, fee_category, fee_name, description, base_amount_usd, is_mandatory, urban_surcharge_usd, display_order) VALUES
('location', 'enregistrement', 'Frais d''enregistrement du bail', 'Enregistrement du contrat de location', 20, true, 5, 1),
('location', 'delivrance', 'Frais de délivrance', 'Établissement du contrat', 25, true, 5, 2),
('location', 'dossier', 'Frais de dossier', 'Traitement administratif', 10, true, 0, 3);
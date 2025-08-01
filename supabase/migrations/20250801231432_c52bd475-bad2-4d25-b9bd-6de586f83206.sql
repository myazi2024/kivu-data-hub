-- Create territorial zones table for storing real estate indicators by geographical zone
CREATE TABLE public.territorial_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  zone_type TEXT NOT NULL CHECK (zone_type IN ('province', 'ville', 'commune', 'quartier', 'avenue')),
  coordinates JSONB NOT NULL,
  parent_zone_id UUID REFERENCES public.territorial_zones(id),
  
  -- Prix et transactions
  prix_moyen_loyer DECIMAL(10,2) NOT NULL DEFAULT 0,
  prix_moyen_vente_m2 DECIMAL(10,2) NOT NULL DEFAULT 0,
  variation_loyer_3mois_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  volume_annonces_mois INTEGER NOT NULL DEFAULT 0,
  
  -- Occupation et démographie
  taux_vacance_locative DECIMAL(5,2) NOT NULL DEFAULT 0,
  densite_residentielle INTEGER NOT NULL DEFAULT 0,
  population_locative_estimee INTEGER NOT NULL DEFAULT 0,
  
  -- Revenus et potentiel
  recettes_locatives_theoriques_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Caractéristiques du marché
  typologie_dominante TEXT NOT NULL DEFAULT 'Usage mixte',
  indice_pression_fonciere TEXT NOT NULL DEFAULT 'Modéré' CHECK (indice_pression_fonciere IN ('Faible', 'Modéré', 'Élevé', 'Très élevé')),
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.territorial_zones ENABLE ROW LEVEL SECURITY;

-- Create policies for territorial zones
CREATE POLICY "Territorial zones are viewable by everyone" 
ON public.territorial_zones 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create territorial zones" 
ON public.territorial_zones 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update territorial zones" 
ON public.territorial_zones 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX idx_territorial_zones_type ON public.territorial_zones(zone_type);
CREATE INDEX idx_territorial_zones_parent ON public.territorial_zones(parent_zone_id);
CREATE INDEX idx_territorial_zones_coordinates ON public.territorial_zones USING GIN(coordinates);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_territorial_zones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_territorial_zones_updated_at
  BEFORE UPDATE ON public.territorial_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_territorial_zones_updated_at();

-- Insert sample data for Goma and Kinshasa zones
INSERT INTO public.territorial_zones (
  name, zone_type, coordinates, prix_moyen_loyer, prix_moyen_vente_m2, 
  taux_vacance_locative, densite_residentielle, population_locative_estimee,
  recettes_locatives_theoriques_usd, variation_loyer_3mois_pct, volume_annonces_mois,
  typologie_dominante, indice_pression_fonciere
) VALUES 
-- Quartiers de Goma
('Quartier Katindo', 'quartier', '[[-1.6672, 29.2248], [-1.6682, 29.2348], [-1.6772, 29.2348], [-1.6772, 29.2248]]', 
 280, 650, 26.6, 320, 2100, 35840, 4.2, 96, 'Appartements modernes', 'Élevé'),

('Quartier Himbi', 'quartier', '[[-1.6772, 29.2248], [-1.6782, 29.2348], [-1.6872, 29.2348], [-1.6872, 29.2248]]',
 180, 420, 8.3, 450, 3200, 28800, 2.1, 142, 'Maisons individuelles', 'Modéré'),

('Quartier Ndosho', 'quartier', '[[-1.6572, 29.2148], [-1.6582, 29.2248], [-1.6672, 29.2248], [-1.6672, 29.2148]]',
 450, 890, 15.2, 280, 1800, 48600, 6.8, 78, 'Immeubles résidentiels', 'Très élevé'),

('Quartier Majengo', 'quartier', '[[-1.6872, 29.2248], [-1.6882, 29.2348], [-1.6972, 29.2348], [-1.6972, 29.2248]]',
 120, 280, 42.1, 620, 4500, 19800, -1.2, 203, 'Usage mixte', 'Faible'),

('Quartier Kahembe', 'quartier', '[[-1.6472, 29.2048], [-1.6482, 29.2148], [-1.6572, 29.2148], [-1.6572, 29.2048]]',
 320, 720, 18.7, 390, 2600, 41280, 3.5, 89, 'Appartements modernes', 'Élevé'),

-- Communes de Kinshasa
('Commune de Gombe', 'commune', '[[-4.4319, 15.2563], [-4.4329, 15.2663], [-4.4419, 15.2663], [-4.4419, 15.2563]]',
 850, 1800, 12.4, 180, 85000, 2890000, 8.2, 456, 'Immeubles de bureaux', 'Très élevé'),

('Commune de Kalamu', 'commune', '[[-4.4419, 15.2563], [-4.4429, 15.2663], [-4.4519, 15.2663], [-4.4519, 15.2563]]',
 220, 480, 28.9, 890, 340000, 1456000, 1.8, 789, 'Maisons populaires', 'Modéré'),

-- Villes principales
('Goma', 'ville', '[[-1.7000, 29.2000], [-1.6500, 29.2000], [-1.6500, 29.2500], [-1.7000, 29.2500]]',
 250, 580, 22.3, 420, 15200, 189000, 3.8, 604, 'Usage mixte', 'Élevé'),

('Kinshasa', 'ville', '[[-4.4700, 15.2200], [-4.4200, 15.2200], [-4.4200, 15.3000], [-4.4700, 15.3000]]',
 380, 820, 19.8, 650, 425000, 4346000, 5.1, 1245, 'Usage mixte', 'Très élevé'),

-- Provinces
('Nord-Kivu', 'province', '[[-2.0000, 28.5000], [-1.2000, 28.5000], [-1.2000, 29.8000], [-2.0000, 29.8000]]',
 195, 440, 25.1, 380, 180000, 1254000, 2.9, 856, 'Usage mixte', 'Modéré'),

('Kinshasa Province', 'province', '[[-4.8000, 14.8000], [-4.0000, 14.8000], [-4.0000, 15.8000], [-4.8000, 15.8000]]',
 340, 720, 21.2, 580, 520000, 5200000, 4.6, 1689, 'Usage mixte', 'Élevé');
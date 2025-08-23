-- Création de la table pour les informations cadastrales
CREATE TABLE public.cadastral_parcels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_number TEXT NOT NULL UNIQUE, -- Numéro SU ou SR
  parcel_type TEXT NOT NULL CHECK (parcel_type IN ('SU', 'SR')), -- Section Urbaine ou Rurale
  location TEXT NOT NULL, -- Nom de la localité (ex: GOMA, RUTSHURU)
  
  -- Informations du titre de propriété
  property_title_type TEXT NOT NULL DEFAULT 'Certificat d''enregistrement',
  
  -- Dimensions et superficie
  area_sqm NUMERIC NOT NULL DEFAULT 0,
  area_hectares NUMERIC GENERATED ALWAYS AS (area_sqm / 10000) STORED,
  
  -- Emplacement géographique
  gps_coordinates JSONB, -- Array de coordonnées des bornes [{lat, lng, borne}]
  latitude NUMERIC,
  longitude NUMERIC,
  
  -- Propriétaire actuel
  current_owner_name TEXT NOT NULL,
  current_owner_legal_status TEXT DEFAULT 'Personne physique',
  current_owner_since DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Création de la table pour l'historique des propriétaires
CREATE TABLE public.cadastral_ownership_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id UUID NOT NULL REFERENCES public.cadastral_parcels(id) ON DELETE CASCADE,
  owner_name TEXT NOT NULL,
  legal_status TEXT DEFAULT 'Personne physique',
  ownership_start_date DATE NOT NULL,
  ownership_end_date DATE,
  mutation_type TEXT, -- Type de mutation (achat, héritage, donation, etc.)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Création de la table pour l'historique des taxes foncières
CREATE TABLE public.cadastral_tax_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id UUID NOT NULL REFERENCES public.cadastral_parcels(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,
  amount_usd NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
  payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parcel_id, tax_year)
);

-- Indices pour améliorer les performances de recherche
CREATE INDEX idx_cadastral_parcels_parcel_number ON public.cadastral_parcels(parcel_number);
CREATE INDEX idx_cadastral_parcels_type_location ON public.cadastral_parcels(parcel_type, location);
CREATE INDEX idx_cadastral_ownership_history_parcel_id ON public.cadastral_ownership_history(parcel_id);
CREATE INDEX idx_cadastral_tax_history_parcel_id ON public.cadastral_tax_history(parcel_id);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_cadastral_parcels_updated_at
  BEFORE UPDATE ON public.cadastral_parcels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies - Lecture publique pour permettre la recherche
ALTER TABLE public.cadastral_parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadastral_ownership_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadastral_tax_history ENABLE ROW LEVEL SECURITY;

-- Politique de lecture publique pour les parcelles cadastrales
CREATE POLICY "Cadastral parcels are viewable by everyone"
  ON public.cadastral_parcels
  FOR SELECT
  USING (true);

-- Politique de lecture publique pour l'historique des propriétaires
CREATE POLICY "Cadastral ownership history is viewable by everyone"
  ON public.cadastral_ownership_history
  FOR SELECT
  USING (true);

-- Politique de lecture publique pour l'historique des taxes
CREATE POLICY "Cadastral tax history is viewable by everyone"
  ON public.cadastral_tax_history
  FOR SELECT
  USING (true);

-- Politiques d'écriture pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can manage cadastral parcels"
  ON public.cadastral_parcels
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage ownership history"
  ON public.cadastral_ownership_history
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage tax history"
  ON public.cadastral_tax_history
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Insertion de quelques données d'exemple pour tester
INSERT INTO public.cadastral_parcels (
  parcel_number, parcel_type, location, property_title_type, area_sqm,
  latitude, longitude, current_owner_name, current_owner_legal_status,
  gps_coordinates
) VALUES 
(
  'SU-GOMA-0456', 'SU', 'GOMA', 'Certificat d''enregistrement', 1200,
  -1.6792, 29.2228, 'Jean Baptiste MUKENDI', 'Personne physique',
  '[{"lat": -1.6792, "lng": 29.2228, "borne": "A"}, {"lat": -1.6793, "lng": 29.2229, "borne": "B"}, {"lat": -1.6794, "lng": 29.2230, "borne": "C"}, {"lat": -1.6791, "lng": 29.2227, "borne": "D"}]'::jsonb
),
(
  'SR-RUTSHURU-0321', 'SR', 'RUTSHURU', 'Concession provisoire', 50000,
  -1.1854, 29.4643, 'Coopérative Agricole TUUNGANE', 'Personne morale',
  '[{"lat": -1.1854, "lng": 29.4643, "borne": "A"}, {"lat": -1.1860, "lng": 29.4650, "borne": "B"}, {"lat": -1.1870, "lng": 29.4645, "borne": "C"}, {"lat": -1.1848, "lng": 29.4640, "borne": "D"}]'::jsonb
);

-- Insertion de l'historique des propriétaires
INSERT INTO public.cadastral_ownership_history (parcel_id, owner_name, legal_status, ownership_start_date, ownership_end_date, mutation_type)
SELECT id, 'Marie KASONGO', 'Personne physique', '2018-03-15'::date, '2023-01-10'::date, 'Vente'
FROM public.cadastral_parcels WHERE parcel_number = 'SU-GOMA-0456';

-- Insertion de l'historique des taxes foncières
INSERT INTO public.cadastral_tax_history (parcel_id, tax_year, amount_usd, payment_status, payment_date)
SELECT id, 2023, 150, 'paid', '2023-05-15'::date FROM public.cadastral_parcels WHERE parcel_number = 'SU-GOMA-0456'
UNION ALL
SELECT id, 2024, 165, 'paid', '2024-04-20'::date FROM public.cadastral_parcels WHERE parcel_number = 'SU-GOMA-0456'
UNION ALL
SELECT id, 2023, 500, 'paid', '2023-06-10'::date FROM public.cadastral_parcels WHERE parcel_number = 'SR-RUTSHURU-0321'
UNION ALL  
SELECT id, 2024, 520, 'overdue', NULL FROM public.cadastral_parcels WHERE parcel_number = 'SR-RUTSHURU-0321';
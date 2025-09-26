-- Ajouter des colonnes pour les données de construction dans la table cadastral_parcels
ALTER TABLE public.cadastral_parcels 
ADD COLUMN IF NOT EXISTS construction_type TEXT,
ADD COLUMN IF NOT EXISTS construction_nature TEXT CHECK (construction_nature IN ('Durable', 'Semi-durable', 'Précaire')),
ADD COLUMN IF NOT EXISTS declared_usage TEXT CHECK (declared_usage IN ('Résidentiel', 'Commercial', 'Mixte', 'Institutionnel', 'Industriel', 'Agricole'));

-- Créer une table pour les permis de construire
CREATE TABLE IF NOT EXISTS public.cadastral_building_permits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id UUID NOT NULL REFERENCES public.cadastral_parcels(id) ON DELETE CASCADE,
  permit_number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  validity_period_months INTEGER NOT NULL DEFAULT 36,
  issuing_service TEXT NOT NULL,
  administrative_status TEXT NOT NULL CHECK (administrative_status IN ('Conforme', 'En attente', 'Non autorisé')) DEFAULT 'En attente',
  issuing_service_contact TEXT,
  permit_document_url TEXT,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_cadastral_building_permits_parcel_id ON public.cadastral_building_permits(parcel_id);
CREATE INDEX IF NOT EXISTS idx_cadastral_building_permits_current ON public.cadastral_building_permits(parcel_id, is_current) WHERE is_current = true;

-- Fonction pour calculer si un permis est valide
CREATE OR REPLACE FUNCTION public.is_permit_valid(issue_date DATE, validity_months INTEGER)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT issue_date + (validity_months || ' months')::INTERVAL > CURRENT_DATE;
$$;

-- RLS policies pour les permis de construire
ALTER TABLE public.cadastral_building_permits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Building permits are viewable by everyone" 
ON public.cadastral_building_permits 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage building permits" 
ON public.cadastral_building_permits 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_cadastral_building_permits_updated_at
BEFORE UPDATE ON public.cadastral_building_permits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger d'audit pour les permis de construire
CREATE TRIGGER audit_cadastral_building_permits_changes
AFTER INSERT OR UPDATE OR DELETE ON public.cadastral_building_permits
FOR EACH ROW EXECUTE FUNCTION public.audit_cadastral_changes();

-- Insérer quelques exemples de données pour les permis de construire
INSERT INTO public.cadastral_building_permits (parcel_id, permit_number, issue_date, validity_period_months, issuing_service, administrative_status, issuing_service_contact) 
SELECT 
  cp.id,
  'PC-' || LPAD((RANDOM() * 9999)::INTEGER::TEXT, 4, '0') || '/' || EXTRACT(YEAR FROM CURRENT_DATE),
  CURRENT_DATE - (RANDOM() * 365 * 2)::INTEGER,
  36,
  CASE 
    WHEN cp.parcel_type = 'SU' THEN 
      CASE (RANDOM() * 3)::INTEGER
        WHEN 0 THEN 'Division Urbaine de l''Habitat - Goma'
        WHEN 1 THEN 'Commune de Goma'
        ELSE 'Circonscription Foncière de Goma'
      END
    ELSE 'Territoire de Nyiragongo'
  END,
  CASE (RANDOM() * 3)::INTEGER
    WHEN 0 THEN 'Conforme'
    WHEN 1 THEN 'En attente'
    ELSE 'Conforme'
  END,
  CASE 
    WHEN cp.parcel_type = 'SU' THEN '+243 970 000 001'
    ELSE '+243 970 000 002'
  END
FROM public.cadastral_parcels cp 
WHERE RANDOM() < 0.7 -- 70% des parcelles auront un permis
LIMIT 50;

-- Mettre à jour quelques parcelles avec des données de construction
UPDATE public.cadastral_parcels 
SET 
  construction_type = CASE (RANDOM() * 6)::INTEGER
    WHEN 0 THEN 'Maison individuelle'
    WHEN 1 THEN 'Immeuble R+2'
    WHEN 2 THEN 'Bâtiment commercial'
    WHEN 3 THEN 'Hangar'
    WHEN 4 THEN 'Villa'
    ELSE 'Usage mixte'
  END,
  construction_nature = CASE (RANDOM() * 3)::INTEGER
    WHEN 0 THEN 'Durable'
    WHEN 1 THEN 'Semi-durable'
    ELSE 'Précaire'
  END,
  declared_usage = CASE (RANDOM() * 6)::INTEGER
    WHEN 0 THEN 'Résidentiel'
    WHEN 1 THEN 'Commercial'
    WHEN 2 THEN 'Mixte'
    WHEN 3 THEN 'Institutionnel'
    WHEN 4 THEN 'Industriel'
    ELSE 'Agricole'
  END
WHERE RANDOM() < 0.8; -- 80% des parcelles auront des données de construction
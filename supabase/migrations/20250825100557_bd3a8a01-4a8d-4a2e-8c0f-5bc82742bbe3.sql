-- Ajouter les champs pour les informations de localisation détaillées
ALTER TABLE cadastral_parcels 
ADD COLUMN province text DEFAULT 'Nord-Kivu',
ADD COLUMN ville text DEFAULT NULL,
ADD COLUMN commune text DEFAULT NULL,
ADD COLUMN quartier text DEFAULT NULL,
ADD COLUMN avenue text DEFAULT NULL,
ADD COLUMN territoire text DEFAULT NULL,
ADD COLUMN collectivite text DEFAULT NULL,
ADD COLUMN groupement text DEFAULT NULL,
ADD COLUMN village text DEFAULT NULL;

-- Ajouter les champs pour les informations de bornage
ALTER TABLE cadastral_parcels 
ADD COLUMN nombre_bornes integer DEFAULT 3,
ADD COLUMN surface_calculee_bornes numeric DEFAULT NULL;

-- Créer une table pour l'historique de bornage
CREATE TABLE cadastral_boundary_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id uuid NOT NULL REFERENCES cadastral_parcels(id),
  pv_reference_number text NOT NULL,
  boundary_purpose text NOT NULL CHECK (boundary_purpose IN ('Réajustement ou rectification', 'Morcellement ou fusion', 'Mise en valeur ou mutation')),
  surveyor_name text NOT NULL,
  survey_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Activer RLS sur la nouvelle table
ALTER TABLE cadastral_boundary_history ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture publique
CREATE POLICY "Boundary history is viewable by everyone" 
ON cadastral_boundary_history 
FOR SELECT 
USING (true);

-- Politique pour permettre la gestion aux utilisateurs authentifiés
CREATE POLICY "Authenticated users can manage boundary history" 
ON cadastral_boundary_history 
FOR ALL 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);
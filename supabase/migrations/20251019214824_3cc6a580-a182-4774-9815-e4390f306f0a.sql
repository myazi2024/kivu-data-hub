-- Ajouter une colonne pour stocker les demandes de permis de construire
ALTER TABLE public.cadastral_contributions 
ADD COLUMN IF NOT EXISTS permit_request_data JSONB DEFAULT NULL;

COMMENT ON COLUMN public.cadastral_contributions.permit_request_data IS 'Données de demande de permis de construire soumises par le contributeur (JSONB)';
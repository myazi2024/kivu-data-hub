-- Ajouter les champs manquants pour harmonisation du formulaire CCC avec les résultats
ALTER TABLE public.cadastral_contributions 
ADD COLUMN IF NOT EXISTS circonscription_fonciere TEXT,
ADD COLUMN IF NOT EXISTS building_permits JSONB;
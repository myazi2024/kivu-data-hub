-- Ajouter la colonne pour la date de délivrance du titre foncier
ALTER TABLE public.cadastral_contributions 
ADD COLUMN IF NOT EXISTS title_issue_date DATE;

-- Ajouter un commentaire pour documenter le champ
COMMENT ON COLUMN public.cadastral_contributions.title_issue_date IS 'Date de délivrance du titre foncier, utilisée pour calculer le taux des frais de mutation';

-- Ajouter également cette colonne dans la table cadastral_parcels pour les parcelles validées
ALTER TABLE public.cadastral_parcels 
ADD COLUMN IF NOT EXISTS title_issue_date DATE;

COMMENT ON COLUMN public.cadastral_parcels.title_issue_date IS 'Date de délivrance du titre foncier';
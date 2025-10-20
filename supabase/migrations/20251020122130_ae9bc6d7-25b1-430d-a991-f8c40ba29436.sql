-- Ajouter le champ lease_type aux contributions cadastrales
ALTER TABLE public.cadastral_contributions 
ADD COLUMN lease_type text CHECK (lease_type IN ('initial', 'renewal'));

-- Ajouter le champ lease_type aux parcelles cadastrales
ALTER TABLE public.cadastral_parcels 
ADD COLUMN lease_type text CHECK (lease_type IN ('initial', 'renewal'));

-- Ajouter un commentaire explicatif
COMMENT ON COLUMN public.cadastral_contributions.lease_type IS 'Type de bail pour les titres renouvelables (Concession ordinaire, Bail emphytéotique, Certificat de location)';
COMMENT ON COLUMN public.cadastral_parcels.lease_type IS 'Type de bail pour les titres renouvelables (Concession ordinaire, Bail emphytéotique, Certificat de location)';
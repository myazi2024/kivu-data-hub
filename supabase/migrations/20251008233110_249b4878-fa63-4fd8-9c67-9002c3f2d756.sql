-- Ajouter le champ title_reference_number à la table cadastral_contributions
ALTER TABLE public.cadastral_contributions 
ADD COLUMN title_reference_number TEXT;
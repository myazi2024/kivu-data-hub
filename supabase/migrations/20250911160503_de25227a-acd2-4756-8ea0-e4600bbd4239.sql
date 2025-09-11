-- Ajouter le champ circonscription_fonciere à la table cadastral_parcels
ALTER TABLE public.cadastral_parcels 
ADD COLUMN circonscription_fonciere TEXT DEFAULT 'Circonscription Foncière de Goma';

-- Mettre à jour les parcelles existantes avec des circonscriptions réalistes
UPDATE public.cadastral_parcels 
SET circonscription_fonciere = CASE 
  WHEN commune = 'Goma' THEN 'Circonscription Foncière de Goma'
  WHEN commune = 'Karisimbi' THEN 'Circonscription Foncière de Goma'
  WHEN commune = 'Nyiragongo' THEN 'Circonscription Foncière de Nyiragongo'
  WHEN ville = 'Bukavu' THEN 'Circonscription Foncière de Bukavu'
  WHEN ville = 'Uvira' THEN 'Circonscription Foncière d''Uvira'
  WHEN territoire = 'Rutshuru' THEN 'Circonscription Foncière de Rutshuru'
  WHEN territoire = 'Masisi' THEN 'Circonscription Foncière de Masisi'
  WHEN territoire = 'Walikale' THEN 'Circonscription Foncière de Walikale'
  ELSE 'Circonscription Foncière de Goma'
END;
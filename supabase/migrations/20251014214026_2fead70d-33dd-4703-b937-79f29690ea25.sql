-- Supprimer la parcelle test existante si elle existe
DELETE FROM public.cadastral_parcels WHERE parcel_number = 'SU/2024/001/TEST';

-- Insérer une parcelle test avec données incomplètes
INSERT INTO public.cadastral_parcels (
  parcel_number,
  parcel_type,
  location,
  property_title_type,
  title_reference_number,
  current_owner_name,
  current_owner_legal_status,
  current_owner_since,
  area_sqm,
  province,
  ville,
  commune,
  quartier,
  avenue,
  territoire,
  collectivite,
  groupement,
  village,
  gps_coordinates,
  construction_type,
  construction_nature,
  declared_usage,
  circonscription_fonciere
) VALUES (
  'SU/2024/001/TEST',
  'SU',
  'Goma, Karisimbi',
  'Certificat d''enregistrement',
  'CE-2024-TEST-001',
  'Société Test SARL',
  'Personne morale',
  '2023-06-15',
  500,
  'Nord-Kivu',
  'Goma',
  'Karisimbi',
  'Murara',
  NULL, -- avenue (donnée manquante)
  NULL, -- territoire (donnée manquante)
  NULL, -- collectivite (donnée manquante)
  NULL, -- groupement (donnée manquante)
  NULL, -- village (donnée manquante)
  NULL, -- gps_coordinates (donnée manquante)
  NULL, -- construction_type (donnée manquante)
  NULL, -- construction_nature (donnée manquante)
  NULL, -- declared_usage (donnée manquante)
  'Circonscription Foncière de Goma'
);
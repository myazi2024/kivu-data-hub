-- Créer un numéro SU test avec des données manquantes
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
  circonscription_fonciere,
  whatsapp_number
) VALUES (
  'SU/GMA/2024/TEST-001',
  'SU',
  'Goma, Quartier Himbi, Commune de Goma',
  'Certificat d''enregistrement',
  'CE-2024-TEST-001',
  'Jean KABONGO',
  'Personne physique',
  '2024-01-15',
  350,
  'Nord-Kivu',
  'Goma',
  'Goma',
  'Himbi',
  'Circonscription Foncière de Goma',
  '+243 999 999 999'
)
ON CONFLICT (parcel_number) DO NOTHING;

-- Note: Ce numéro SU a intentionnellement des données manquantes pour tester la fonctionnalité :
-- Informations générales manquantes: construction_type, construction_nature, declared_usage, building_permits, owner_document_url, property_title_document_url
-- Localisation manquante: avenue, gps_coordinates, nombre_bornes, surface_calculee_bornes
-- Historique manquant: ownership_history, boundary_history (pas d'enregistrements dans les tables liées)
-- Obligations manquantes: tax_history, mortgage_history (pas d'enregistrements dans les tables liées)
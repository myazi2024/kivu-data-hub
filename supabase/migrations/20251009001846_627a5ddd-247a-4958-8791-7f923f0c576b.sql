-- Mettre à jour les données de test avec tous les nouveaux champs (sans area_hectares qui est généré)

-- Mettre à jour une parcelle existante ou en créer une nouvelle avec tous les champs
INSERT INTO public.cadastral_parcels (
  parcel_number,
  parcel_type,
  location,
  property_title_type,
  title_reference_number,
  area_sqm,
  current_owner_name,
  current_owner_legal_status,
  current_owner_since,
  whatsapp_number,
  province,
  ville,
  commune,
  quartier,
  avenue,
  construction_type,
  construction_nature,
  declared_usage,
  gps_coordinates,
  nombre_bornes,
  latitude,
  longitude,
  owner_document_url,
  property_title_document_url
) VALUES (
  'SU/2130/TEST',
  'SU',
  'Goma - Himbi',
  'Certificat d''enregistrement',
  'CE/NK/GOMA/2024/00123',
  500,
  'Jean Mukundi',
  'Personne physique',
  '2020-03-15',
  '+243998123456',
  'Nord-Kivu',
  'Goma',
  'Karisimbi',
  'Himbi',
  'Avenue des Volcans',
  'Villa',
  'Durable',
  'Résidentiel',
  '[
    {"lat": -1.67890, "lng": 29.22340, "borne": "Borne 1"},
    {"lat": -1.67895, "lng": 29.22350, "borne": "Borne 2"},
    {"lat": -1.67900, "lng": 29.22345, "borne": "Borne 3"},
    {"lat": -1.67895, "lng": 29.22335, "borne": "Borne 4"}
  ]'::jsonb,
  4,
  -1.67895,
  29.22342,
  'https://example.com/documents/owner-id.pdf',
  'https://example.com/documents/property-title.pdf'
)
ON CONFLICT (parcel_number) 
DO UPDATE SET
  title_reference_number = EXCLUDED.title_reference_number,
  whatsapp_number = EXCLUDED.whatsapp_number,
  gps_coordinates = EXCLUDED.gps_coordinates,
  nombre_bornes = EXCLUDED.nombre_bornes,
  construction_type = EXCLUDED.construction_type,
  construction_nature = EXCLUDED.construction_nature,
  declared_usage = EXCLUDED.declared_usage,
  owner_document_url = EXCLUDED.owner_document_url,
  property_title_document_url = EXCLUDED.property_title_document_url,
  updated_at = now()
RETURNING id;

-- Ajouter des permis de construire pour cette parcelle
WITH parcel AS (
  SELECT id FROM public.cadastral_parcels WHERE parcel_number = 'SU/2130/TEST' LIMIT 1
)
INSERT INTO public.cadastral_building_permits (
  parcel_id,
  permit_number,
  issuing_service,
  issue_date,
  validity_period_months,
  administrative_status,
  issuing_service_contact,
  is_current
)
SELECT 
  parcel.id,
  'PC/GOMA/2024/00456',
  'Division Urbaine de Goma',
  '2024-01-15',
  36,
  'Conforme',
  '+243997654321',
  true
FROM parcel
ON CONFLICT DO NOTHING;

-- Ajouter un permis expiré
WITH parcel AS (
  SELECT id FROM public.cadastral_parcels WHERE parcel_number = 'SU/2130/TEST' LIMIT 1
)
INSERT INTO public.cadastral_building_permits (
  parcel_id,
  permit_number,
  issuing_service,
  issue_date,
  validity_period_months,
  administrative_status,
  issuing_service_contact,
  is_current
)
SELECT 
  parcel.id,
  'PC/GOMA/2020/00123',
  'Division Urbaine de Goma',
  '2020-03-15',
  36,
  'Conforme',
  '+243997654321',
  false
FROM parcel
ON CONFLICT DO NOTHING;

-- Ajouter l'historique de propriété
WITH parcel AS (
  SELECT id FROM public.cadastral_parcels WHERE parcel_number = 'SU/2130/TEST' LIMIT 1
)
INSERT INTO public.cadastral_ownership_history (
  parcel_id,
  owner_name,
  legal_status,
  ownership_start_date,
  ownership_end_date,
  mutation_type
)
SELECT 
  parcel.id,
  'Pierre Kasongo',
  'Personne physique',
  '2015-06-10',
  '2020-03-14',
  'Vente'
FROM parcel
ON CONFLICT DO NOTHING;

-- Ajouter l'historique fiscal
WITH parcel AS (
  SELECT id FROM public.cadastral_parcels WHERE parcel_number = 'SU/2130/TEST' LIMIT 1
)
INSERT INTO public.cadastral_tax_history (
  parcel_id,
  tax_year,
  amount_usd,
  payment_status,
  payment_date
)
SELECT 
  parcel.id,
  2024,
  150,
  'paid',
  '2024-02-15'
FROM parcel
ON CONFLICT DO NOTHING;

WITH parcel AS (
  SELECT id FROM public.cadastral_parcels WHERE parcel_number = 'SU/2130/TEST' LIMIT 1
)
INSERT INTO public.cadastral_tax_history (
  parcel_id,
  tax_year,
  amount_usd,
  payment_status,
  payment_date
)
SELECT 
  parcel.id,
  2023,
  150,
  'paid',
  '2023-03-20'
FROM parcel
ON CONFLICT DO NOTHING;

-- Ajouter l'historique de bornage
WITH parcel AS (
  SELECT id FROM public.cadastral_parcels WHERE parcel_number = 'SU/2130/TEST' LIMIT 1
)
INSERT INTO public.cadastral_boundary_history (
  parcel_id,
  pv_reference_number,
  boundary_purpose,
  surveyor_name,
  survey_date
)
SELECT 
  parcel.id,
  'PV/GOMA/2024/789',
  'Réajustement ou rectification',
  'Géomètre André Muhindo',
  '2024-01-10'
FROM parcel
ON CONFLICT DO NOTHING;
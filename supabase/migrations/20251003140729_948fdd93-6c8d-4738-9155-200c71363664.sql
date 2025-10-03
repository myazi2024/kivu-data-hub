-- Insertion de données de test pour les parcelles cadastrales
-- Ces données correspondent aux exemples affichés dans l'interface

-- Parcelle SU/2130/KIN (Kinshasa - Urbaine)
INSERT INTO public.cadastral_parcels (
  parcel_number,
  parcel_type,
  location,
  property_title_type,
  area_sqm,
  latitude,
  longitude,
  current_owner_name,
  current_owner_legal_status,
  current_owner_since,
  province,
  ville,
  commune,
  quartier,
  avenue,
  circonscription_fonciere,
  gps_coordinates,
  nombre_bornes
) VALUES (
  'SU/2130/KIN',
  'SU',
  'Kinshasa, Commune de Gombe, Quartier du Centre',
  'Certificat d''enregistrement',
  850.5,
  -4.3276,
  15.3136,
  'Jean-Pierre Mukendi',
  'Personne physique',
  '2018-03-15',
  'Kinshasa',
  'Kinshasa',
  'Gombe',
  'Centre',
  'Avenue de la Liberté',
  'Circonscription Foncière de Kinshasa',
  '[{"lat": -4.3276, "lng": 15.3136, "borne": "B1"}, {"lat": -4.3278, "lng": 15.3136, "borne": "B2"}, {"lat": -4.3278, "lng": 15.3139, "borne": "B3"}, {"lat": -4.3276, "lng": 15.3139, "borne": "B4"}]'::jsonb,
  4
);

-- Parcelle SU/0456/GOM (Goma - Urbaine)
INSERT INTO public.cadastral_parcels (
  parcel_number,
  parcel_type,
  location,
  property_title_type,
  area_sqm,
  latitude,
  longitude,
  current_owner_name,
  current_owner_legal_status,
  current_owner_since,
  province,
  ville,
  commune,
  quartier,
  avenue,
  circonscription_fonciere,
  gps_coordinates,
  nombre_bornes
) VALUES (
  'SU/0456/GOM',
  'SU',
  'Goma, Commune de Karisimbi, Quartier Virunga',
  'Titre de propriété',
  1200.0,
  -1.6740,
  29.2289,
  'Marie Kabila Mutombo',
  'Personne physique',
  '2020-06-20',
  'Nord-Kivu',
  'Goma',
  'Karisimbi',
  'Virunga',
  'Avenue du Rond-Point',
  'Circonscription Foncière de Goma',
  '[{"lat": -1.6740, "lng": 29.2289, "borne": "B1"}, {"lat": -1.6742, "lng": 29.2289, "borne": "B2"}, {"lat": -1.6742, "lng": 29.2293, "borne": "B3"}, {"lat": -1.6740, "lng": 29.2293, "borne": "B4"}]'::jsonb,
  4
);

-- Parcelle SU/2130/1/KIN (Kinshasa - Morcellement de SU/2130/KIN)
INSERT INTO public.cadastral_parcels (
  parcel_number,
  parcel_type,
  location,
  property_title_type,
  area_sqm,
  latitude,
  longitude,
  current_owner_name,
  current_owner_legal_status,
  current_owner_since,
  province,
  ville,
  commune,
  quartier,
  avenue,
  circonscription_fonciere,
  gps_coordinates,
  nombre_bornes
) VALUES (
  'SU/2130/1/KIN',
  'SU',
  'Kinshasa, Commune de Gombe, Quartier du Centre',
  'Certificat d''enregistrement',
  425.25,
  -4.3276,
  15.3136,
  'Jean-Pierre Mukendi',
  'Personne physique',
  '2022-09-10',
  'Kinshasa',
  'Kinshasa',
  'Gombe',
  'Centre',
  'Avenue de la Liberté',
  'Circonscription Foncière de Kinshasa',
  '[{"lat": -4.3276, "lng": 15.3136, "borne": "B1"}, {"lat": -4.3277, "lng": 15.3136, "borne": "B2"}, {"lat": -4.3277, "lng": 15.3139, "borne": "B3"}, {"lat": -4.3276, "lng": 15.3139, "borne": "B4"}]'::jsonb,
  4
);

-- Parcelle SU/0123/GOM (Goma - Format simplifié)
INSERT INTO public.cadastral_parcels (
  parcel_number,
  parcel_type,
  location,
  property_title_type,
  area_sqm,
  latitude,
  longitude,
  current_owner_name,
  current_owner_legal_status,
  current_owner_since,
  province,
  ville,
  commune,
  quartier,
  circonscription_fonciere,
  gps_coordinates,
  nombre_bornes
) VALUES (
  'SU/0123/GOM',
  'SU',
  'Goma, Commune de Goma, Quartier Birere',
  'Concession perpétuelle',
  950.0,
  -1.6793,
  29.2347,
  'Société SODEICO SARL',
  'Personne morale',
  '2019-11-05',
  'Nord-Kivu',
  'Goma',
  'Goma',
  'Birere',
  'Circonscription Foncière de Goma',
  '[{"lat": -1.6793, "lng": 29.2347, "borne": "B1"}, {"lat": -1.6795, "lng": 29.2347, "borne": "B2"}, {"lat": -1.6795, "lng": 29.2350, "borne": "B3"}, {"lat": -1.6793, "lng": 29.2350, "borne": "B4"}]'::jsonb,
  4
);

-- Parcelle SR/01/0987/BEN (Beni - Rurale)
INSERT INTO public.cadastral_parcels (
  parcel_number,
  parcel_type,
  location,
  property_title_type,
  area_sqm,
  latitude,
  longitude,
  current_owner_name,
  current_owner_legal_status,
  current_owner_since,
  province,
  territoire,
  collectivite,
  groupement,
  village,
  circonscription_fonciere,
  gps_coordinates,
  nombre_bornes
) VALUES (
  'SR/01/0987/BEN',
  'SR',
  'Territoire de Beni, Secteur de Bashu, Groupement Bunyuka',
  'Certificat d''enregistrement',
  15000.0,
  0.4984,
  29.4637,
  'Communauté Bunyuka',
  'Personne morale',
  '2017-02-28',
  'Nord-Kivu',
  'Beni',
  'Bashu',
  'Bunyuka',
  'Kasindi',
  'Circonscription Foncière de Beni',
  '[{"lat": 0.4984, "lng": 29.4637, "borne": "B1"}, {"lat": 0.4990, "lng": 29.4637, "borne": "B2"}, {"lat": 0.4990, "lng": 29.4650, "borne": "B3"}, {"lat": 0.4984, "lng": 29.4650, "borne": "B4"}]'::jsonb,
  4
);

-- Parcelle SR/0321/MAS (Masisi - Format simplifié rurale)
INSERT INTO public.cadastral_parcels (
  parcel_number,
  parcel_type,
  location,
  property_title_type,
  area_sqm,
  latitude,
  longitude,
  current_owner_name,
  current_owner_legal_status,
  current_owner_since,
  province,
  territoire,
  collectivite,
  groupement,
  village,
  circonscription_fonciere,
  gps_coordinates,
  nombre_bornes
) VALUES (
  'SR/0321/MAS',
  'SR',
  'Territoire de Masisi, Chefferie de Bahunde, Groupement Bapfuna',
  'Titre de propriété',
  25000.0,
  -1.4125,
  28.7850,
  'Coopérative Agricole Tumaini',
  'Personne morale',
  '2016-08-12',
  'Nord-Kivu',
  'Masisi',
  'Bahunde',
  'Bapfuna',
  'Nyabiondo',
  'Circonscription Foncière de Goma',
  '[{"lat": -1.4125, "lng": 28.7850, "borne": "B1"}, {"lat": -1.4135, "lng": 28.7850, "borne": "B2"}, {"lat": -1.4135, "lng": 28.7875, "borne": "B3"}, {"lat": -1.4125, "lng": 28.7875, "borne": "B4"}]'::jsonb,
  4
);

-- Ajout d'historique de propriété pour quelques parcelles
INSERT INTO public.cadastral_ownership_history (parcel_id, owner_name, legal_status, ownership_start_date, ownership_end_date, mutation_type)
SELECT id, 'Propriétaire Précédent', 'Personne physique', '2010-01-15'::date, '2018-03-14'::date, 'Vente'
FROM public.cadastral_parcels WHERE parcel_number = 'SU/2130/KIN';

INSERT INTO public.cadastral_ownership_history (parcel_id, owner_name, legal_status, ownership_start_date, ownership_end_date, mutation_type)
SELECT id, 'Famille Mutombo', 'Personne physique', '2015-05-10'::date, '2020-06-19'::date, 'Succession'
FROM public.cadastral_parcels WHERE parcel_number = 'SU/0456/GOM';

-- Ajout d'historique de taxes pour les parcelles urbaines
INSERT INTO public.cadastral_tax_history (parcel_id, tax_year, amount_usd, payment_status, payment_date)
SELECT id, 2023, 150.00, 'paid', '2023-03-15'::date
FROM public.cadastral_parcels WHERE parcel_number = 'SU/2130/KIN';

INSERT INTO public.cadastral_tax_history (parcel_id, tax_year, amount_usd, payment_status, payment_date)
SELECT id, 2024, 155.00, 'paid', '2024-03-10'::date
FROM public.cadastral_parcels WHERE parcel_number = 'SU/2130/KIN';

INSERT INTO public.cadastral_tax_history (parcel_id, tax_year, amount_usd, payment_status, payment_date)
SELECT id, 2023, 200.00, 'paid', '2023-04-20'::date
FROM public.cadastral_parcels WHERE parcel_number = 'SU/0456/GOM';

INSERT INTO public.cadastral_tax_history (parcel_id, tax_year, amount_usd, payment_status)
SELECT id, 2024, 210.00, 'pending'
FROM public.cadastral_parcels WHERE parcel_number = 'SU/0456/GOM';
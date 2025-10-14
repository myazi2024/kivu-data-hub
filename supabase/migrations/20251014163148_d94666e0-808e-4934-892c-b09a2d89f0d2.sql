-- Insérer un nouveau numéro SU de test avec données partielles
INSERT INTO public.cadastral_parcels (
  parcel_number,
  parcel_type,
  location,
  property_title_type,
  current_owner_name,
  current_owner_legal_status,
  current_owner_since,
  area_sqm,
  province,
  ville
) VALUES (
  'SU/2024/002/DEMO',
  'SU',
  'Goma, Nord-Kivu',
  'Certificat d''enregistrement',
  'Jean-Baptiste MUKENDI',
  'Personne physique',
  '2020-03-15',
  500.00,
  'Nord-Kivu',
  'Goma'
);

-- Ajouter quelques éléments d'historique mais pas tous
-- Historique de propriété (1 seul ancien propriétaire)
INSERT INTO public.cadastral_ownership_history (
  parcel_id,
  owner_name,
  legal_status,
  ownership_start_date,
  ownership_end_date,
  mutation_type
) VALUES (
  (SELECT id FROM public.cadastral_parcels WHERE parcel_number = 'SU/2024/002/DEMO'),
  'Marie KASONGO',
  'Personne physique',
  '2015-06-10',
  '2020-03-14',
  'Vente'
);

-- Historique fiscal (seulement 1 année)
INSERT INTO public.cadastral_tax_history (
  parcel_id,
  tax_year,
  amount_usd,
  payment_status,
  payment_date
) VALUES (
  (SELECT id FROM public.cadastral_parcels WHERE parcel_number = 'SU/2024/002/DEMO'),
  2023,
  150.00,
  'paid',
  '2023-04-20'
);

-- Insérer un deuxième numéro SU avec des données complètes pour comparaison
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
  construction_type,
  construction_nature,
  declared_usage,
  province,
  ville,
  commune,
  quartier,
  avenue,
  circonscription_fonciere,
  gps_coordinates,
  whatsapp_number
) VALUES (
  'SU/2024/003/FULL',
  'SU',
  'Goma, Quartier Himbi, Nord-Kivu',
  'Titre de propriété',
  'TP-GMA-2019-456',
  'Société KIVU INVEST SARL',
  'Personne morale',
  '2019-08-20',
  1200.00,
  'Bâtiment',
  'Durable',
  'Commercial',
  'Nord-Kivu',
  'Goma',
  'Goma',
  'Himbi',
  'Avenue de la Paix',
  'Circonscription Foncière de Goma',
  '[{"lat": -1.6789, "lng": 29.2234, "borne": "Borne 1"}, {"lat": -1.6790, "lng": 29.2235, "borne": "Borne 2"}, {"lat": -1.6791, "lng": 29.2236, "borne": "Borne 3"}, {"lat": -1.6792, "lng": 29.2237, "borne": "Borne 4"}]'::jsonb,
  '+243998765432'
);

-- Ajouter historique complet pour le numéro SU/2024/003/FULL
INSERT INTO public.cadastral_ownership_history (
  parcel_id,
  owner_name,
  legal_status,
  ownership_start_date,
  ownership_end_date,
  mutation_type
) VALUES 
  (
    (SELECT id FROM public.cadastral_parcels WHERE parcel_number = 'SU/2024/003/FULL'),
    'Pierre LUMINGU',
    'Personne physique',
    '2010-01-15',
    '2019-08-19',
    'Vente'
  ),
  (
    (SELECT id FROM public.cadastral_parcels WHERE parcel_number = 'SU/2024/003/FULL'),
    'André KABILA',
    'Personne physique',
    '2005-03-20',
    '2010-01-14',
    'Succession'
  );

INSERT INTO public.cadastral_tax_history (
  parcel_id,
  tax_year,
  amount_usd,
  payment_status,
  payment_date
) VALUES 
  (
    (SELECT id FROM public.cadastral_parcels WHERE parcel_number = 'SU/2024/003/FULL'),
    2024,
    450.00,
    'paid',
    '2024-03-15'
  ),
  (
    (SELECT id FROM public.cadastral_parcels WHERE parcel_number = 'SU/2024/003/FULL'),
    2023,
    420.00,
    'paid',
    '2023-03-20'
  ),
  (
    (SELECT id FROM public.cadastral_parcels WHERE parcel_number = 'SU/2024/003/FULL'),
    2022,
    400.00,
    'paid',
    '2022-04-10'
  );

INSERT INTO public.cadastral_building_permits (
  parcel_id,
  permit_number,
  issuing_service,
  issue_date,
  validity_period_months,
  administrative_status
) VALUES (
  (SELECT id FROM public.cadastral_parcels WHERE parcel_number = 'SU/2024/003/FULL'),
  'PC-GMA-2019-0234',
  'Division Urbaine de Goma',
  '2019-06-15',
  36,
  'Conforme'
);

INSERT INTO public.cadastral_boundary_history (
  parcel_id,
  pv_reference_number,
  boundary_purpose,
  surveyor_name,
  survey_date
) VALUES (
  (SELECT id FROM public.cadastral_parcels WHERE parcel_number = 'SU/2024/003/FULL'),
  'PV-BORN-2019-0156',
  'Mise en valeur ou mutation',
  'Cabinet Géomètre KIVU',
  '2019-05-10'
);
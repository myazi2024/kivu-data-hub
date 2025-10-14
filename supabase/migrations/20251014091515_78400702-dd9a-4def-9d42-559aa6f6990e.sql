-- Nettoyer anciennes données
DELETE FROM cadastral_building_permits WHERE parcel_id IN (
  SELECT id FROM cadastral_parcels WHERE parcel_number IN ('SU-GOMA-0456', 'SR-RUTSHURU-0321', 'SU/2130/KIN')
);
DELETE FROM cadastral_boundary_history WHERE parcel_id IN (
  SELECT id FROM cadastral_parcels WHERE parcel_number IN ('SU-GOMA-0456', 'SR-RUTSHURU-0321', 'SU/2130/KIN')
);
DELETE FROM cadastral_mortgage_payments WHERE mortgage_id IN (
  SELECT id FROM cadastral_mortgages WHERE parcel_id IN (
    SELECT id FROM cadastral_parcels WHERE parcel_number IN ('SU-GOMA-0456', 'SR-RUTSHURU-0321', 'SU/2130/KIN')
  )
);
DELETE FROM cadastral_mortgages WHERE parcel_id IN (
  SELECT id FROM cadastral_parcels WHERE parcel_number IN ('SU-GOMA-0456', 'SR-RUTSHURU-0321', 'SU/2130/KIN')
);
DELETE FROM cadastral_tax_history WHERE parcel_id IN (
  SELECT id FROM cadastral_parcels WHERE parcel_number IN ('SU-GOMA-0456', 'SR-RUTSHURU-0321', 'SU/2130/KIN')
);
DELETE FROM cadastral_ownership_history WHERE parcel_id IN (
  SELECT id FROM cadastral_parcels WHERE parcel_number IN ('SU-GOMA-0456', 'SR-RUTSHURU-0321', 'SU/2130/KIN')
);
DELETE FROM cadastral_parcels WHERE parcel_number IN ('SU-GOMA-0456', 'SR-RUTSHURU-0321', 'SU/2130/KIN');

-- Parcelle 1: SU-GOMA-0456 - Données complètes alignées avec formulaire CCC
INSERT INTO cadastral_parcels (
  id, parcel_number, parcel_type, property_title_type, title_reference_number,
  location, province, ville, commune, quartier, avenue, circonscription_fonciere,
  area_sqm, nombre_bornes, surface_calculee_bornes, gps_coordinates,
  latitude, longitude, current_owner_name, current_owner_legal_status,
  current_owner_since, construction_type, construction_nature, declared_usage,
  whatsapp_number, owner_document_url, property_title_document_url
) VALUES (
  'f19e34c4-b839-42a6-aaa4-173fc8092684', 'SU-GOMA-0456', 'SU',
  'Certificat d''enregistrement', 'CE/NK/2020/0456',
  'Goma, Himbi, Avenue du Lac', 'Nord-Kivu', 'Goma', 'Goma', 'Himbi',
  'Avenue du Lac', 'Circonscription Foncière de Goma', 1200.00, 4, 1198.50,
  '[{"borne":"Borne A (Nord-Ouest)","lat":-1.6792,"lng":29.2228},
    {"borne":"Borne B (Nord-Est)","lat":-1.6793,"lng":29.2229},
    {"borne":"Borne C (Sud-Est)","lat":-1.6794,"lng":29.223},
    {"borne":"Borne D (Sud-Ouest)","lat":-1.6791,"lng":29.2227}]'::jsonb,
  -1.6792, 29.2228, 'MUKENDI KABONGO Jean-Baptiste', 'Personne physique',
  '2020-03-15', 'Résidentiel', 'Durable', 'Résidentiel', '+243997654321',
  'https://example.com/docs/owner_mukendi.pdf',
  'https://example.com/docs/title_su_goma_0456.pdf'
);

INSERT INTO cadastral_ownership_history (parcel_id, owner_name, legal_status,
  ownership_start_date, ownership_end_date, mutation_type, ownership_document_url)
VALUES 
  ('f19e34c4-b839-42a6-aaa4-173fc8092684', 'KABILA MWAMBA Joseph',
   'Personne physique', '2015-06-10', '2020-03-14', 'Vente',
   'https://example.com/docs/previous_owner_kabila.pdf'),
  ('f19e34c4-b839-42a6-aaa4-173fc8092684', 'État Congolais',
   'Personne morale', '2010-01-15', '2015-06-09', 'Attribution', NULL);

INSERT INTO cadastral_tax_history (parcel_id, tax_year, amount_usd,
  payment_status, payment_date, receipt_document_url)
VALUES 
  ('f19e34c4-b839-42a6-aaa4-173fc8092684', 2024, 180.00, 'paid',
   '2024-03-10', 'https://example.com/receipts/tax_2024_su_goma_0456.pdf'),
  ('f19e34c4-b839-42a6-aaa4-173fc8092684', 2023, 175.00, 'paid',
   '2023-03-15', 'https://example.com/receipts/tax_2023_su_goma_0456.pdf'),
  ('f19e34c4-b839-42a6-aaa4-173fc8092684', 2022, 170.00, 'paid',
   '2022-03-20', 'https://example.com/receipts/tax_2022_su_goma_0456.pdf');

INSERT INTO cadastral_mortgages (parcel_id, creditor_name, creditor_type,
  mortgage_amount_usd, duration_months, contract_date, mortgage_status)
VALUES ('f19e34c4-b839-42a6-aaa4-173fc8092684',
  'Banque Commerciale du Congo (BCDC)', 'Banque', 15000.00, 120,
  '2020-04-01', 'active');

INSERT INTO cadastral_building_permits (parcel_id, permit_number, issuing_service,
  issuing_service_contact, issue_date, validity_period_months,
  administrative_status, is_current, permit_document_url)
VALUES ('f19e34c4-b839-42a6-aaa4-173fc8092684', 'PC/GOMA/2020/0158',
  'Service d''Urbanisme et Habitat - Mairie de Goma', '+243998765432',
  '2020-02-15', 36, 'Conforme', true,
  'https://example.com/permits/pc_goma_2020_0158.pdf');

INSERT INTO cadastral_boundary_history (parcel_id, surveyor_name, survey_date,
  pv_reference_number, boundary_purpose, boundary_document_url)
VALUES ('f19e34c4-b839-42a6-aaa4-173fc8092684', 'Géomètre TSHIMANGA Pascal',
  '2020-01-20', 'PV/NK/2020/0045', 'Réajustement ou rectification',
  'https://example.com/boundary/pv_2020_0045.pdf');

-- Parcelle 2: SR-RUTSHURU-0321
INSERT INTO cadastral_parcels (
  id, parcel_number, parcel_type, property_title_type, title_reference_number,
  location, province, territoire, collectivite, groupement, village,
  circonscription_fonciere, area_sqm, nombre_bornes, surface_calculee_bornes,
  gps_coordinates, latitude, longitude, current_owner_name,
  current_owner_legal_status, current_owner_since, construction_type,
  construction_nature, declared_usage, whatsapp_number, owner_document_url,
  property_title_document_url
) VALUES (
  '4042f3d7-48fd-4514-b339-e1b4ed4cb53e', 'SR-RUTSHURU-0321', 'SR',
  'Concession provisoire', 'CP/NK/2021/0321',
  'Rutshuru, Nyiragongo, Bukumu, Rugari, Kibumba', 'Nord-Kivu', 'Nyiragongo',
  'Bukumu', 'Rugari', 'Kibumba', 'Circonscription Foncière de Goma',
  50000.00, 6, 49875.00,
  '[{"borne":"Borne 1","lat":-1.1854,"lng":29.4643},
    {"borne":"Borne 2","lat":-1.186,"lng":29.465},
    {"borne":"Borne 3","lat":-1.187,"lng":29.4645},
    {"borne":"Borne 4","lat":-1.1865,"lng":29.4638},
    {"borne":"Borne 5","lat":-1.1852,"lng":29.4641},
    {"borne":"Borne 6","lat":-1.1848,"lng":29.464}]'::jsonb,
  -1.1854, 29.4643, 'Coopérative Agricole TUUNGANE', 'Personne morale',
  '2021-05-10', 'Agricole', 'Précaire', 'Agricole', '+243991234567',
  'https://example.com/docs/owner_tuungane.pdf',
  'https://example.com/docs/title_sr_rutshuru_0321.pdf'
);

INSERT INTO cadastral_ownership_history (parcel_id, owner_name, legal_status,
  ownership_start_date, ownership_end_date, mutation_type)
VALUES ('4042f3d7-48fd-4514-b339-e1b4ed4cb53e', 'Communauté Locale Kibumba',
  'Personne morale', '2018-01-01', '2021-05-09', 'Concession');

INSERT INTO cadastral_tax_history (parcel_id, tax_year, amount_usd,
  payment_status, payment_date)
VALUES 
  ('4042f3d7-48fd-4514-b339-e1b4ed4cb53e', 2024, 250.00, 'paid', '2024-02-15'),
  ('4042f3d7-48fd-4514-b339-e1b4ed4cb53e', 2023, 240.00, 'paid', '2023-02-20');

INSERT INTO cadastral_boundary_history (parcel_id, surveyor_name, survey_date,
  pv_reference_number, boundary_purpose)
VALUES ('4042f3d7-48fd-4514-b339-e1b4ed4cb53e', 'Géomètre MUSAVULI Daniel',
  '2021-04-15', 'PV/NK/2021/0089', 'Mise en valeur ou mutation');

-- Parcelle 3: SU/2130/KIN
INSERT INTO cadastral_parcels (
  id, parcel_number, parcel_type, property_title_type, title_reference_number,
  location, province, ville, commune, quartier, avenue, circonscription_fonciere,
  area_sqm, nombre_bornes, surface_calculee_bornes, gps_coordinates,
  latitude, longitude, current_owner_name, current_owner_legal_status,
  current_owner_since, construction_type, construction_nature, declared_usage,
  whatsapp_number, owner_document_url, property_title_document_url
) VALUES (
  'fe4d32b0-793a-46cc-b34d-97558195fc17', 'SU/2130/KIN', 'SU',
  'Certificat d''enregistrement', 'CE/KIN/2018/2130',
  'Kinshasa, Gombe, Centre, Avenue de la Liberté', 'Kinshasa', 'Kinshasa',
  'Gombe', 'Centre', 'Avenue de la Liberté', 'Circonscription Foncière de Kinshasa',
  850.50, 4, 849.75,
  '[{"borne":"B1","lat":-4.3276,"lng":15.3136},
    {"borne":"B2","lat":-4.3278,"lng":15.3136},
    {"borne":"B3","lat":-4.3278,"lng":15.3139},
    {"borne":"B4","lat":-4.3276,"lng":15.3139}]'::jsonb,
  -4.3276, 15.3136, 'MUKENDI Jean-Pierre', 'Personne physique',
  '2018-03-15', 'Commercial', 'Semi-durable', 'Commercial', '+243998123456',
  'https://example.com/docs/owner_mukendi_kin.pdf',
  'https://example.com/docs/title_su_2130_kin.pdf'
);

INSERT INTO cadastral_ownership_history (parcel_id, owner_name, legal_status,
  ownership_start_date, ownership_end_date, mutation_type, ownership_document_url)
VALUES ('fe4d32b0-793a-46cc-b34d-97558195fc17', 'Société KASAÏ MINING SARL',
  'Personne morale', '2010-01-15', '2018-03-14', 'Vente',
  'https://example.com/docs/previous_owner_kasai.pdf');

INSERT INTO cadastral_tax_history (parcel_id, tax_year, amount_usd,
  payment_status, payment_date, receipt_document_url)
VALUES 
  ('fe4d32b0-793a-46cc-b34d-97558195fc17', 2024, 155.00, 'paid',
   '2024-03-10', 'https://example.com/receipts/tax_2024_su_2130_kin.pdf'),
  ('fe4d32b0-793a-46cc-b34d-97558195fc17', 2023, 150.00, 'paid',
   '2023-03-15', 'https://example.com/receipts/tax_2023_su_2130_kin.pdf');
-- Ajouter des données d'exemple pour tester les nouvelles fonctionnalités
-- Mettre à jour quelques parcelles existantes avec les nouvelles informations de localisation

-- Pour les parcelles SU (Section Urbaine)
UPDATE cadastral_parcels 
SET 
  province = 'Nord-Kivu',
  ville = 'Goma',
  commune = 'Goma',
  quartier = 'Himbi',
  avenue = 'Avenue du Lac',
  nombre_bornes = 4,
  surface_calculee_bornes = 456.75
WHERE parcel_type = 'SU' AND id IN (
  SELECT id FROM cadastral_parcels WHERE parcel_type = 'SU' LIMIT 2
);

-- Pour les parcelles SR (Section Rurale)
UPDATE cadastral_parcels 
SET 
  province = 'Nord-Kivu',
  territoire = 'Nyiragongo',
  collectivite = 'Bukumu',
  groupement = 'Rugari',
  village = 'Kibumba',
  nombre_bornes = 6,
  surface_calculee_bornes = 2340.50
WHERE parcel_type = 'SR' AND id IN (
  SELECT id FROM cadastral_parcels WHERE parcel_type = 'SR' LIMIT 2
);

-- Ajouter des données d'exemple d'historique de bornage
INSERT INTO cadastral_boundary_history (parcel_id, pv_reference_number, boundary_purpose, surveyor_name, survey_date)
SELECT 
  p.id,
  CASE 
    WHEN random() < 0.33 THEN '2023' || LPAD(floor(random() * 10000)::text, 4, '0')
    WHEN random() < 0.66 THEN '2022' || LPAD(floor(random() * 10000)::text, 4, '0')
    ELSE '2021' || LPAD(floor(random() * 10000)::text, 4, '0')
  END,
  CASE 
    WHEN random() < 0.33 THEN 'Réajustement ou rectification'
    WHEN random() < 0.66 THEN 'Morcellement ou fusion'
    ELSE 'Mise en valeur ou mutation'
  END,
  CASE 
    WHEN random() < 0.25 THEN 'Géomètre MUKENDI Jean'
    WHEN random() < 0.50 THEN 'Géomètre KABILA Marie'
    WHEN random() < 0.75 THEN 'Géomètre NDALA Pierre'
    ELSE 'Géomètre WAMBA Sarah'
  END,
  CURRENT_DATE - (random() * 365 * 3)::int
FROM cadastral_parcels p
WHERE p.id IN (
  SELECT id FROM cadastral_parcels LIMIT 10
);
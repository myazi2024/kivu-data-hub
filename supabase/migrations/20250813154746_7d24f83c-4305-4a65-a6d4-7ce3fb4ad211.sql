-- Ajouter les nouvelles colonnes pour les données immobilières détaillées
ALTER TABLE public.territorial_zones 
ADD COLUMN IF NOT EXISTS nombre_transactions_estimees INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS taux_occupation_locatif NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS duree_moyenne_mise_location_jours INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS recettes_fiscales_estimees_usd NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS valeur_fonciere_moyenne_parcelle_usd NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS indice_pression_locative TEXT DEFAULT 'Modéré';

-- Mettre à jour les données existantes avec des valeurs réalistes
UPDATE public.territorial_zones SET
  nombre_transactions_estimees = CASE zone_type
    WHEN 'province' THEN volume_annonces_mois * 12 * 0.7 -- 70% des annonces se transforment en transactions
    WHEN 'ville' THEN volume_annonces_mois * 12 * 0.6
    WHEN 'commune' THEN volume_annonces_mois * 12 * 0.5
    ELSE volume_annonces_mois * 12 * 0.4
  END,
  taux_occupation_locatif = 100 - taux_vacance_locative,
  duree_moyenne_mise_location_jours = CASE 
    WHEN taux_vacance_locative > 30 THEN 90 + RANDOM() * 60 -- 90-150 jours si forte vacance
    WHEN taux_vacance_locative > 20 THEN 60 + RANDOM() * 30 -- 60-90 jours si vacance moyenne
    WHEN taux_vacance_locative > 10 THEN 30 + RANDOM() * 30 -- 30-60 jours si faible vacance
    ELSE 15 + RANDOM() * 15 -- 15-30 jours si très faible vacance
  END,
  recettes_fiscales_estimees_usd = recettes_locatives_theoriques_usd * 0.15, -- 15% de taxe foncière
  valeur_fonciere_moyenne_parcelle_usd = prix_moyen_vente_m2 * (200 + RANDOM() * 300), -- parcelle moyenne 200-500m²
  indice_pression_locative = CASE 
    WHEN taux_vacance_locative < 5 THEN 'Très élevé'
    WHEN taux_vacance_locative < 15 THEN 'Élevé'
    WHEN taux_vacance_locative < 25 THEN 'Modéré'
    ELSE 'Faible'
  END;
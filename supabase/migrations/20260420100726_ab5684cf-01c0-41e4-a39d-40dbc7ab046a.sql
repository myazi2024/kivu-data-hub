-- Étape 2 : Ajout colonne category au catalogue de services cadastraux
ALTER TABLE public.cadastral_services_config
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'consultation';

-- Backfill catégories sémantiques
UPDATE public.cadastral_services_config SET category = 'consultation' WHERE service_id IN ('information', 'location_history', 'history');
UPDATE public.cadastral_services_config SET category = 'fiscal' WHERE service_id = 'obligations';
UPDATE public.cadastral_services_config SET category = 'juridique' WHERE service_id = 'land_disputes';

-- Étape 1 : Icônes sémantiques (mise à jour data, jamais migré auparavant)
UPDATE public.cadastral_services_config SET icon_name = 'Info' WHERE service_id = 'information';
UPDATE public.cadastral_services_config SET icon_name = 'MapPin' WHERE service_id = 'location_history';
UPDATE public.cadastral_services_config SET icon_name = 'History' WHERE service_id = 'history';
UPDATE public.cadastral_services_config SET icon_name = 'Receipt' WHERE service_id = 'obligations';
UPDATE public.cadastral_services_config SET icon_name = 'Scale' WHERE service_id = 'land_disputes';
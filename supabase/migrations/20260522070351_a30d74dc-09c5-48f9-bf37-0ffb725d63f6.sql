-- Aligner les tarifs d'infrastructure de lotissement avec les "Infrastructures requises par voie"
-- 1. Ajout colonne linked_to pour catégoriser les clés liées à un attribut de voie
ALTER TABLE public.subdivision_infrastructure_tariffs
  ADD COLUMN IF NOT EXISTS linked_to TEXT;

COMMENT ON COLUMN public.subdivision_infrastructure_tariffs.linked_to IS
  'Origine voie: road_surface | drainage | street_lighting | NULL (autre)';

-- 2. Purge des clés seedées jamais consommées par le calcul (code mort)
DELETE FROM public.subdivision_infrastructure_tariffs
WHERE infrastructure_key IN (
  'road_primary', 'road_secondary', 'sidewalk',
  'water_station', 'green_space', 'playground', 'community_center'
);

-- 3. Tagger les clés génériques existantes
UPDATE public.subdivision_infrastructure_tariffs
SET linked_to = 'drainage'
WHERE infrastructure_key = 'drainage';

UPDATE public.subdivision_infrastructure_tariffs
SET linked_to = 'street_lighting'
WHERE infrastructure_key = 'street_lighting';

-- 4. Seed des tarifs par matériau de drainage (alignés sur DRAINAGE_CANAL_MATERIALS)
INSERT INTO public.subdivision_infrastructure_tariffs
  (infrastructure_key, label, category, unit, rate_usd, section_type, is_required, is_active, display_order, description, linked_to) VALUES
  ('drainage_beton',      'Caniveau béton armé',     'reseau', 'linear_m', 0, NULL, false, true, 41, 'Caniveau ou tuyau en béton armé', 'drainage'),
  ('drainage_pvc',        'Caniveau / tuyau PVC',    'reseau', 'linear_m', 0, NULL, false, true, 42, 'Tuyau / caniveau PVC', 'drainage'),
  ('drainage_maconnerie', 'Caniveau maçonnerie',     'reseau', 'linear_m', 0, NULL, false, true, 43, 'Caniveau maçonné', 'drainage'),
  ('drainage_pierre',     'Caniveau pierre/moellons','reseau', 'linear_m', 0, NULL, false, true, 44, 'Caniveau pierre ou moellons', 'drainage'),
  ('drainage_metal',      'Caniveau métal',          'reseau', 'linear_m', 0, NULL, false, true, 45, 'Caniveau métallique', 'drainage'),
  ('drainage_composite',  'Caniveau composite',      'reseau', 'linear_m', 0, NULL, false, true, 46, 'Caniveau composite', 'drainage')
ON CONFLICT (infrastructure_key, section_type) DO NOTHING;

-- 5. Seed éclairage public solaire (différencié du générique)
INSERT INTO public.subdivision_infrastructure_tariffs
  (infrastructure_key, label, category, unit, rate_usd, section_type, is_required, is_active, display_order, description, linked_to) VALUES
  ('street_lighting_solar', 'Éclairage public solaire', 'reseau', 'unit', 0, NULL, false, true, 51, 'Lampadaire solaire autonome (mât + panneau + batterie)', 'street_lighting')
ON CONFLICT (infrastructure_key, section_type) DO NOTHING;

-- 6. Seed des tarifs road_surface_<material> pour chaque matériau actif du catalogue
INSERT INTO public.subdivision_infrastructure_tariffs
  (infrastructure_key, label, category, unit, rate_usd, section_type, is_required, is_active, display_order, description, linked_to)
SELECT
  'road_surface_' || m.key,
  'Revêtement : ' || m.label,
  'voirie',
  'sqm',
  0,
  NULL,
  false,
  true,
  100 + COALESCE(m.display_order, 0),
  COALESCE(m.description, 'Revêtement de voie (m²)'),
  'road_surface'
FROM public.subdivision_road_surface_materials m
WHERE m.is_active = true
ON CONFLICT (infrastructure_key, section_type) DO NOTHING;
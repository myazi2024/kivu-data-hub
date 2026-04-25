-- Ajout des contraintes techniques applicables à la parcelle-mère
ALTER TABLE public.subdivision_zoning_rules
  ADD COLUMN IF NOT EXISTS parent_min_area_sqm numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_max_area_sqm numeric NULL,
  ADD COLUMN IF NOT EXISTS allow_if_active_dispute boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_if_active_mortgage boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_registered_title boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_title_age_years integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allow_if_pending_mutation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_gps_coordinates boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS min_gps_points integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS allow_if_pending_subdivision boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exclude_title_types text[] NOT NULL DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN public.subdivision_zoning_rules.parent_min_area_sqm IS 'Surface minimale de la parcelle-mère pour autoriser un lotissement (m²)';
COMMENT ON COLUMN public.subdivision_zoning_rules.parent_max_area_sqm IS 'Surface maximale de la parcelle-mère (m²) — null = illimité';
COMMENT ON COLUMN public.subdivision_zoning_rules.allow_if_active_dispute IS 'Autoriser le lotissement même si un litige foncier actif existe';
COMMENT ON COLUMN public.subdivision_zoning_rules.allow_if_active_mortgage IS 'Autoriser le lotissement même si une hypothèque active existe';
COMMENT ON COLUMN public.subdivision_zoning_rules.require_registered_title IS 'Exiger un titre foncier enregistré (Certificat d''enregistrement)';
COMMENT ON COLUMN public.subdivision_zoning_rules.min_title_age_years IS 'Âge minimum du titre foncier en années';
COMMENT ON COLUMN public.subdivision_zoning_rules.allow_if_pending_mutation IS 'Autoriser le lotissement si une mutation est en cours';
COMMENT ON COLUMN public.subdivision_zoning_rules.require_gps_coordinates IS 'Exiger des coordonnées GPS sur la parcelle';
COMMENT ON COLUMN public.subdivision_zoning_rules.min_gps_points IS 'Nombre minimal de points GPS (sommets) requis';
COMMENT ON COLUMN public.subdivision_zoning_rules.allow_if_pending_subdivision IS 'Autoriser une nouvelle demande si une demande de lotissement est déjà en cours';
COMMENT ON COLUMN public.subdivision_zoning_rules.exclude_title_types IS 'Types de titres exclus du lotissement (ex: contrat de location)';
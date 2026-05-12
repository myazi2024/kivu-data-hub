-- Drainage canal constraints (per road)
ALTER TABLE public.subdivision_zoning_rules
  ADD COLUMN IF NOT EXISTS require_drainage_canal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS drainage_canal_min_width_m numeric,
  ADD COLUMN IF NOT EXISTS drainage_canal_min_depth_m numeric,
  ADD COLUMN IF NOT EXISTS drainage_canal_allowed_materials text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS drainage_canal_allowed_types text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS drainage_canal_min_slope_pct numeric,
  ADD COLUMN IF NOT EXISTS drainage_canal_required_sides text NOT NULL DEFAULT 'any';

-- Solar public lighting constraints (per road)
ALTER TABLE public.subdivision_zoning_rules
  ADD COLUMN IF NOT EXISTS require_solar_lighting boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS solar_lighting_min_pole_height_m numeric,
  ADD COLUMN IF NOT EXISTS solar_lighting_min_lumens integer,
  ADD COLUMN IF NOT EXISTS solar_lighting_beam_angle_deg integer,
  ADD COLUMN IF NOT EXISTS solar_lighting_max_spacing_m numeric,
  ADD COLUMN IF NOT EXISTS solar_lighting_min_battery_hours integer,
  ADD COLUMN IF NOT EXISTS solar_lighting_required_sides text NOT NULL DEFAULT 'any';

-- Sanity checks (validation triggers, not CHECK constraints, to allow flexibility)
CREATE OR REPLACE FUNCTION public.validate_zoning_rule_infra_constraints()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.drainage_canal_required_sides IS NOT NULL
     AND NEW.drainage_canal_required_sides NOT IN ('left','right','both','any') THEN
    RAISE EXCEPTION 'drainage_canal_required_sides must be one of: left, right, both, any';
  END IF;
  IF NEW.solar_lighting_required_sides IS NOT NULL
     AND NEW.solar_lighting_required_sides NOT IN ('left','right','both','alternating','any') THEN
    RAISE EXCEPTION 'solar_lighting_required_sides must be one of: left, right, both, alternating, any';
  END IF;
  IF NEW.drainage_canal_min_width_m IS NOT NULL AND NEW.drainage_canal_min_width_m < 0 THEN
    RAISE EXCEPTION 'drainage_canal_min_width_m must be >= 0';
  END IF;
  IF NEW.drainage_canal_min_depth_m IS NOT NULL AND NEW.drainage_canal_min_depth_m < 0 THEN
    RAISE EXCEPTION 'drainage_canal_min_depth_m must be >= 0';
  END IF;
  IF NEW.solar_lighting_min_pole_height_m IS NOT NULL AND NEW.solar_lighting_min_pole_height_m < 0 THEN
    RAISE EXCEPTION 'solar_lighting_min_pole_height_m must be >= 0';
  END IF;
  IF NEW.solar_lighting_min_lumens IS NOT NULL AND NEW.solar_lighting_min_lumens < 0 THEN
    RAISE EXCEPTION 'solar_lighting_min_lumens must be >= 0';
  END IF;
  IF NEW.solar_lighting_max_spacing_m IS NOT NULL AND NEW.solar_lighting_max_spacing_m < 0 THEN
    RAISE EXCEPTION 'solar_lighting_max_spacing_m must be >= 0';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_zoning_rule_infra ON public.subdivision_zoning_rules;
CREATE TRIGGER trg_validate_zoning_rule_infra
  BEFORE INSERT OR UPDATE ON public.subdivision_zoning_rules
  FOR EACH ROW EXECUTE FUNCTION public.validate_zoning_rule_infra_constraints();

-- Mirror per-road attributes on subdivision_roads (materialized table)
ALTER TABLE public.subdivision_roads
  ADD COLUMN IF NOT EXISTS drainage_canal_data jsonb,
  ADD COLUMN IF NOT EXISTS solar_lighting_data jsonb;

CREATE OR REPLACE FUNCTION public.enforce_road_sides_boundary_rules()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE s jsonb;
BEGIN
  IF NEW.road_sides IS NULL OR jsonb_typeof(NEW.road_sides) <> 'array' THEN RETURN NEW; END IF;
  FOR s IN SELECT * FROM jsonb_array_elements(NEW.road_sides) LOOP
    IF jsonb_typeof(s) <> 'object' THEN CONTINUE; END IF;
    IF s->>'boundaryKind' = 'mur_mitoyen'
       AND (COALESCE((s->>'hasRoad')::boolean, false) OR s->>'borderType' = 'route') THEN
      RAISE EXCEPTION 'Un côté déclaré « Mur mitoyen » ne peut pas border une route.' USING ERRCODE = '22023';
    END IF;
    IF s->>'boundaryKind' IN ('mur','mur_mitoyen')
       AND COALESCE((s->>'isConfirmed')::boolean, false)
       AND COALESCE(NULLIF(s->>'wallMaterial',''), '') = '' THEN
      RAISE EXCEPTION 'Le matériau du mur est obligatoire pour un côté « Mur » ou « Mur mitoyen ».' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.enforce_road_sides_boundary_rules() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_enforce_road_sides_boundary_rules ON public.cadastral_contributions;
CREATE TRIGGER trg_enforce_road_sides_boundary_rules
BEFORE INSERT OR UPDATE OF road_sides ON public.cadastral_contributions
FOR EACH ROW EXECUTE FUNCTION public.enforce_road_sides_boundary_rules();

-- Table des règles de zonage
CREATE TABLE public.subdivision_zoning_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_type TEXT NOT NULL CHECK (section_type IN ('urban', 'rural')),
  location_name TEXT NOT NULL DEFAULT '*',
  min_lot_area_sqm NUMERIC NOT NULL DEFAULT 100 CHECK (min_lot_area_sqm > 0),
  max_lot_area_sqm NUMERIC CHECK (max_lot_area_sqm IS NULL OR max_lot_area_sqm >= min_lot_area_sqm),
  min_road_width_m NUMERIC NOT NULL DEFAULT 3 CHECK (min_road_width_m > 0),
  recommended_road_width_m NUMERIC NOT NULL DEFAULT 6 CHECK (recommended_road_width_m >= min_road_width_m),
  min_common_space_pct NUMERIC NOT NULL DEFAULT 0 CHECK (min_common_space_pct >= 0 AND min_common_space_pct <= 100),
  min_front_road_m NUMERIC NOT NULL DEFAULT 0 CHECK (min_front_road_m >= 0),
  max_lots_per_request INTEGER CHECK (max_lots_per_request IS NULL OR max_lots_per_request > 0),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (section_type, location_name)
);

ALTER TABLE public.subdivision_zoning_rules ENABLE ROW LEVEL SECURITY;

-- Lecture publique des règles actives
CREATE POLICY "Anyone can view active zoning rules"
ON public.subdivision_zoning_rules FOR SELECT
USING (is_active = true);

-- Admins voient tout
CREATE POLICY "Admins view all zoning rules"
ON public.subdivision_zoning_rules FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins insert zoning rules"
ON public.subdivision_zoning_rules FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins update zoning rules"
ON public.subdivision_zoning_rules FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins delete zoning rules"
ON public.subdivision_zoning_rules FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER update_subdivision_zoning_rules_updated_at
BEFORE UPDATE ON public.subdivision_zoning_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger d'audit (vers system_config_audit)
CREATE OR REPLACE FUNCTION public.audit_subdivision_zoning_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_name TEXT;
BEGIN
  SELECT COALESCE(raw_user_meta_data->>'full_name', email)
    INTO v_admin_name
  FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.system_config_audit (
    table_name, record_id, config_key, action,
    old_values, new_values, admin_id, admin_name
  ) VALUES (
    'subdivision_zoning_rules',
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.section_type, OLD.section_type) || '/' || COALESCE(NEW.location_name, OLD.location_name),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    v_admin_name
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_subdivision_zoning_rules
AFTER INSERT OR UPDATE OR DELETE ON public.subdivision_zoning_rules
FOR EACH ROW EXECUTE FUNCTION public.audit_subdivision_zoning_rules();

-- Seed : règles par défaut urbain et rural
INSERT INTO public.subdivision_zoning_rules
  (section_type, location_name, min_lot_area_sqm, max_lot_area_sqm, min_road_width_m, recommended_road_width_m, min_common_space_pct, min_front_road_m, max_lots_per_request, notes)
VALUES
  ('urban', '*', 200, 5000, 6, 8, 5, 10, 50, 'Règle par défaut zone urbaine'),
  ('rural', '*', 500, 50000, 4, 6, 0, 8, 30, 'Règle par défaut zone rurale');

-- RPC de validation d'une demande contre les règles applicables
CREATE OR REPLACE FUNCTION public.validate_subdivision_against_rules(_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_rule RECORD;
  v_violations JSONB := '[]'::JSONB;
  v_lot RECORD;
  v_road RECORD;
  v_lot_count INTEGER := 0;
  v_road_count INTEGER := 0;
  v_total_lot_area NUMERIC := 0;
  v_section TEXT;
BEGIN
  SELECT * INTO v_request FROM public.subdivision_requests WHERE id = _request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'violations', jsonb_build_array(jsonb_build_object('code','REQUEST_NOT_FOUND','message','Demande introuvable')));
  END IF;

  -- Détermine la section (urban/rural) depuis la demande ou fallback urban
  v_section := COALESCE(LOWER(v_request.section_type), 'urban');
  IF v_section NOT IN ('urban','rural') THEN v_section := 'urban'; END IF;

  -- Cherche la règle la plus spécifique (ville exacte) puis fallback '*'
  SELECT * INTO v_rule FROM public.subdivision_zoning_rules
  WHERE is_active = true
    AND section_type = v_section
    AND (location_name = COALESCE(v_request.ville, v_request.commune, '*') OR location_name = '*')
  ORDER BY (location_name <> '*') DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'violations', jsonb_build_array(jsonb_build_object('code','NO_RULE','message','Aucune règle de zonage active pour ' || v_section)));
  END IF;

  -- Itère sur les lots
  FOR v_lot IN
    SELECT * FROM public.subdivision_lots WHERE request_id = _request_id
  LOOP
    v_lot_count := v_lot_count + 1;
    v_total_lot_area := v_total_lot_area + COALESCE(v_lot.area_sqm, 0);

    IF v_lot.area_sqm < v_rule.min_lot_area_sqm THEN
      v_violations := v_violations || jsonb_build_object(
        'code','LOT_TOO_SMALL','severity','error',
        'target', v_lot.lot_number,
        'message', 'Lot ' || v_lot.lot_number || ' : ' || v_lot.area_sqm || ' m² < min ' || v_rule.min_lot_area_sqm || ' m²'
      );
    END IF;

    IF v_rule.max_lot_area_sqm IS NOT NULL AND v_lot.area_sqm > v_rule.max_lot_area_sqm THEN
      v_violations := v_violations || jsonb_build_object(
        'code','LOT_TOO_LARGE','severity','warning',
        'target', v_lot.lot_number,
        'message', 'Lot ' || v_lot.lot_number || ' : ' || v_lot.area_sqm || ' m² > max ' || v_rule.max_lot_area_sqm || ' m²'
      );
    END IF;
  END LOOP;

  -- Itère sur les voies
  FOR v_road IN
    SELECT * FROM public.subdivision_roads WHERE request_id = _request_id
  LOOP
    v_road_count := v_road_count + 1;
    IF COALESCE(v_road.width_m, 0) < v_rule.min_road_width_m THEN
      v_violations := v_violations || jsonb_build_object(
        'code','ROAD_TOO_NARROW','severity','error',
        'target', v_road.road_name,
        'message', 'Voie ' || COALESCE(v_road.road_name,'?') || ' : ' || COALESCE(v_road.width_m,0) || ' m < min ' || v_rule.min_road_width_m || ' m'
      );
    END IF;
  END LOOP;

  -- Nombre max de lots
  IF v_rule.max_lots_per_request IS NOT NULL AND v_lot_count > v_rule.max_lots_per_request THEN
    v_violations := v_violations || jsonb_build_object(
      'code','TOO_MANY_LOTS','severity','error',
      'message', v_lot_count || ' lots > max ' || v_rule.max_lots_per_request
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_violations) = 0,
    'rule_id', v_rule.id,
    'section_type', v_section,
    'lot_count', v_lot_count,
    'road_count', v_road_count,
    'total_lot_area_sqm', v_total_lot_area,
    'violations', v_violations
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_subdivision_against_rules(UUID) TO authenticated, anon;

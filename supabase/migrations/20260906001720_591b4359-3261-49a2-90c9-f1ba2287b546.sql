-- 1. Fees config extension
ALTER TABLE public.expertise_fees_config
  ADD COLUMN IF NOT EXISTS applies_to_market_value boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS applies_to_rental_value boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS partial_multiplier numeric NOT NULL DEFAULT 1.0;

-- 2. Request columns
ALTER TABLE public.real_estate_expertise_requests
  ADD COLUMN IF NOT EXISTS expertise_scope text NOT NULL DEFAULT 'total',
  ADD COLUMN IF NOT EXISTS valuation_targets text[] NOT NULL DEFAULT ARRAY['market']::text[],
  ADD COLUMN IF NOT EXISTS target_building_refs text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS target_area_geojson jsonb,
  ADD COLUMN IF NOT EXISTS computed_fee_items jsonb,
  ADD COLUMN IF NOT EXISTS total_amount_usd numeric;

-- 3. Server-side fee calculation
CREATE OR REPLACE FUNCTION public.calculate_expertise_fees(
  p_scope text DEFAULT 'total',
  p_valuations text[] DEFAULT ARRAY['market']::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items jsonb := '[]'::jsonb;
  v_total numeric := 0;
  v_scope text := COALESCE(NULLIF(p_scope, ''), 'total');
  v_vals text[] := COALESCE(p_valuations, ARRAY['market']::text[]);
  r record;
  v_amount numeric;
BEGIN
  IF v_scope NOT IN ('partial','total') THEN
    v_scope := 'total';
  END IF;
  IF array_length(v_vals, 1) IS NULL THEN
    v_vals := ARRAY['market']::text[];
  END IF;

  FOR r IN
    SELECT fee_name, amount_usd, description, is_mandatory,
           applies_to_market_value, applies_to_rental_value, partial_multiplier
    FROM public.expertise_fees_config
    WHERE is_active = true
    ORDER BY display_order
  LOOP
    -- keep the fee only if it matches at least one requested valuation
    IF NOT (
      (r.applies_to_market_value AND 'market' = ANY(v_vals))
      OR (r.applies_to_rental_value AND 'rental' = ANY(v_vals))
    ) THEN
      CONTINUE;
    END IF;

    v_amount := r.amount_usd;
    IF v_scope = 'partial' THEN
      v_amount := ROUND(v_amount * COALESCE(r.partial_multiplier, 1.0), 2);
    END IF;

    v_total := v_total + v_amount;
    v_items := v_items || jsonb_build_object(
      'fee_name', r.fee_name,
      'amount_usd', v_amount,
      'base_amount_usd', r.amount_usd,
      'description', r.description,
      'is_mandatory', r.is_mandatory
    );
  END LOOP;

  RETURN jsonb_build_object('fee_items', v_items, 'total_amount_usd', ROUND(v_total, 2), 'scope', v_scope, 'valuations', to_jsonb(v_vals));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.calculate_expertise_fees(text, text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.calculate_expertise_fees(text, text[]) TO authenticated, service_role;

-- 4. Insert trigger enforcing server-computed amount
CREATE OR REPLACE FUNCTION public.enforce_expertise_request_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_calc jsonb;
BEGIN
  IF NEW.expertise_scope IS NULL OR NEW.expertise_scope NOT IN ('partial','total') THEN
    NEW.expertise_scope := 'total';
  END IF;

  IF NEW.valuation_targets IS NULL OR array_length(NEW.valuation_targets, 1) IS NULL THEN
    RAISE EXCEPTION 'Au moins une valeur à déterminer est requise (market ou rental)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(NEW.valuation_targets) AS t WHERE t NOT IN ('market','rental')
  ) THEN
    RAISE EXCEPTION 'Valeur à déterminer invalide';
  END IF;

  IF NEW.expertise_scope = 'partial'
     AND (NEW.target_building_refs IS NULL OR array_length(NEW.target_building_refs, 1) IS NULL)
     AND NEW.target_area_geojson IS NULL THEN
    RAISE EXCEPTION 'Une expertise partielle doit cibler au moins une construction ou une zone';
  END IF;

  v_calc := public.calculate_expertise_fees(NEW.expertise_scope, NEW.valuation_targets);
  NEW.computed_fee_items := v_calc->'fee_items';
  NEW.total_amount_usd := (v_calc->>'total_amount_usd')::numeric;
  NEW.payment_status := 'pending';
  NEW.status := 'pending';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_expertise_request_insert ON public.real_estate_expertise_requests;
CREATE TRIGGER trg_expertise_request_insert
  BEFORE INSERT ON public.real_estate_expertise_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_expertise_request_insert();

-- 5. Prefill RPC: add geometry without measurements
CREATE OR REPLACE FUNCTION public.get_parcel_expertise_prefill(p_parcel_number text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_json jsonb;
  v_sides jsonb := '[]'::jsonb;
  v_shapes jsonb := '[]'::jsonb;
  v_coords jsonb := '[]'::jsonb;
  e jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT
    p.id, p.parcel_number, p.area_sqm, p.province, p.ville, p.commune, p.quartier,
    p.property_category, p.property_title_type, p.construction_type, p.construction_nature,
    p.construction_materials, p.construction_year, p.declared_usage, p.standing,
    p.floor_number, p.building_height, p.additional_constructions,
    p.sound_environment, p.is_rented, p.is_occupied, p.monthly_rent_usd,
    p.rental_configuration, p.rental_units, p.rental_units_count, p.rental_start_date,
    p.hosting_capacity, p.occupant_count,
    p.apartment_number, p.apartment_height, p.apartment_width, p.apartment_length, p.apartment_orientation,
    p.gps_coordinates, p.parcel_sides, p.building_shapes
  INTO v_row
  FROM public.cadastral_parcels p
  WHERE p.parcel_number = p_parcel_number
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_json := to_jsonb(v_row);

  -- Strip measurements from geometry (paid data): keep shape only
  IF jsonb_typeof(v_json->'gps_coordinates') = 'array' THEN
    FOR e IN SELECT * FROM jsonb_array_elements(v_json->'gps_coordinates') LOOP
      v_coords := v_coords || jsonb_build_object('lat', e->'lat', 'lng', e->'lng', 'borne', e->'borne');
    END LOOP;
  END IF;

  IF jsonb_typeof(v_json->'parcel_sides') = 'array' THEN
    FOR e IN SELECT * FROM jsonb_array_elements(v_json->'parcel_sides') LOOP
      v_sides := v_sides || jsonb_build_object('name', e->'name', 'orientation', e->'orientation');
    END LOOP;
  END IF;

  IF jsonb_typeof(v_json->'building_shapes') = 'array' THEN
    FOR e IN SELECT * FROM jsonb_array_elements(v_json->'building_shapes') LOOP
      v_shapes := v_shapes || (
        (e - 'areaSqm' - 'perimeterM' - 'sides')
        || jsonb_build_object('sides', '[]'::jsonb)
      );
    END LOOP;
  END IF;

  v_json := v_json
    || jsonb_build_object('gps_coordinates', v_coords)
    || jsonb_build_object('parcel_sides', v_sides)
    || jsonb_build_object('building_shapes', v_shapes);

  RETURN v_json;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_parcel_expertise_prefill(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_parcel_expertise_prefill(text) TO authenticated, service_role;
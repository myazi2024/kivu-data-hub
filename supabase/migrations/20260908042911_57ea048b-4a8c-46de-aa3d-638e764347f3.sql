CREATE OR REPLACE FUNCTION public.get_parcel_expertise_prefill(p_parcel_number text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row record;
  v_json jsonb;
  v_sides jsonb := '[]'::jsonb;
  v_shapes jsonb := '[]'::jsonb;
  v_coords jsonb := '[]'::jsonb;
  v_contrib record;
  v_src_coords jsonb;
  v_src_sides jsonb;
  v_src_shapes jsonb;
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

  v_src_coords := v_json->'gps_coordinates';
  v_src_sides := v_json->'parcel_sides';
  v_src_shapes := v_json->'building_shapes';

  -- Fallback: reuse geometry from the latest approved CCC contribution
  IF COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(v_src_coords) = 'array' THEN v_src_coords ELSE '[]'::jsonb END), 0) = 0
     OR COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(v_src_shapes) = 'array' THEN v_src_shapes ELSE '[]'::jsonb END), 0) = 0
  THEN
    SELECT c.gps_coordinates::jsonb AS gps, c.parcel_sides::jsonb AS sides, c.building_shapes::jsonb AS shapes
    INTO v_contrib
    FROM public.cadastral_contributions c
    WHERE c.parcel_number = p_parcel_number
      AND c.status = 'approved'
    ORDER BY c.created_at DESC
    LIMIT 1;

    IF FOUND THEN
      IF COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(v_src_coords) = 'array' THEN v_src_coords ELSE '[]'::jsonb END), 0) = 0
         AND jsonb_typeof(v_contrib.gps) = 'array' THEN
        v_src_coords := v_contrib.gps;
      END IF;
      IF COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(v_src_sides) = 'array' THEN v_src_sides ELSE '[]'::jsonb END), 0) = 0
         AND jsonb_typeof(v_contrib.sides) = 'array' THEN
        v_src_sides := v_contrib.sides;
      END IF;
      IF COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(v_src_shapes) = 'array' THEN v_src_shapes ELSE '[]'::jsonb END), 0) = 0
         AND jsonb_typeof(v_contrib.shapes) = 'array' THEN
        v_src_shapes := v_contrib.shapes;
      END IF;
    END IF;
  END IF;

  -- Strip measurements from geometry (paid data): keep shape only
  IF jsonb_typeof(v_src_coords) = 'array' THEN
    FOR e IN SELECT * FROM jsonb_array_elements(v_src_coords) LOOP
      v_coords := v_coords || jsonb_build_object('lat', e->'lat', 'lng', e->'lng', 'borne', e->'borne');
    END LOOP;
  END IF;

  IF jsonb_typeof(v_src_sides) = 'array' THEN
    FOR e IN SELECT * FROM jsonb_array_elements(v_src_sides) LOOP
      v_sides := v_sides || jsonb_build_object('name', e->'name', 'orientation', e->'orientation');
    END LOOP;
  END IF;

  IF jsonb_typeof(v_src_shapes) = 'array' THEN
    FOR e IN SELECT * FROM jsonb_array_elements(v_src_shapes) LOOP
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
$function$;
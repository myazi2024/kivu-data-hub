CREATE OR REPLACE FUNCTION public.get_parcel_expertise_prefill(p_parcel_number text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
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
    p.apartment_number, p.apartment_height, p.apartment_width, p.apartment_length, p.apartment_orientation
  INTO v_row
  FROM public.cadastral_parcels p
  WHERE p.parcel_number = p_parcel_number
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_parcel_expertise_prefill(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_parcel_expertise_prefill(text) TO authenticated;
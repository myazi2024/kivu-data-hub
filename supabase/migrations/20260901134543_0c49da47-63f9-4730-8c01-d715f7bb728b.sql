ALTER TABLE public.cadastral_contributions ADD COLUMN IF NOT EXISTS building_height numeric;
ALTER TABLE public.cadastral_parcels ADD COLUMN IF NOT EXISTS building_height numeric;

DO $mig$
DECLARE
  d text;
  d2 text;
BEGIN
  SELECT pg_get_functiondef('public.sync_approved_contribution_to_parcel'::regproc) INTO d;

  IF position('building_height' in d) > 0 THEN
    RAISE NOTICE 'building_height déjà présent dans le trigger';
    RETURN;
  END IF;

  d2 := replace(
    d,
    'apartment_orientation = COALESCE(NEW.apartment_orientation, apartment_orientation),',
    'apartment_orientation = COALESCE(NEW.apartment_orientation, apartment_orientation),'
    || E'\n        building_height = COALESCE(NEW.building_height, building_height),'
  );
  IF d2 = d THEN RAISE EXCEPTION 'Patch UPDATE non appliqué'; END IF;
  d := d2;

  d2 := replace(
    d,
    'apartment_length, apartment_width, apartment_height, apartment_orientation,',
    'apartment_length, apartment_width, apartment_height, apartment_orientation, building_height,'
  );
  IF d2 = d THEN RAISE EXCEPTION 'Patch colonnes INSERT non appliqué'; END IF;
  d := d2;

  d2 := replace(
    d,
    'NEW.apartment_length, NEW.apartment_width, NEW.apartment_height, NEW.apartment_orientation,',
    'NEW.apartment_length, NEW.apartment_width, NEW.apartment_height, NEW.apartment_orientation, NEW.building_height,'
  );
  IF d2 = d THEN RAISE EXCEPTION 'Patch valeurs INSERT non appliqué'; END IF;
  d := d2;

  EXECUTE d;
END
$mig$;
CREATE OR REPLACE FUNCTION public.get_home_district_parcel_counts()
RETURNS TABLE(land_district text, parcels_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.land_district, count(*)
  FROM public.cadastral_parcels p
  WHERE p.deleted_at IS NULL AND p.parcel_number NOT ILIKE 'TEST-%'
    AND coalesce(p.land_district, '') <> ''
  GROUP BY p.land_district;
$$;
REVOKE ALL ON FUNCTION public.get_home_district_parcel_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_home_district_parcel_counts() TO service_role;
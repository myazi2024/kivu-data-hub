CREATE OR REPLACE VIEW public.cadastral_parcels_public AS
SELECT
  id,
  parcel_number,
  parcel_type,
  location,
  property_title_type,
  area_sqm,
  area_hectares,
  province,
  ville,
  commune,
  quartier,
  territoire,
  collectivite,
  groupement,
  village,
  has_dispute,
  is_subdivided,
  created_at,
  updated_at,
  title_reference_number,
  gps_coordinates,
  parcel_sides,
  latitude,
  longitude
FROM public.cadastral_parcels
WHERE deleted_at IS NULL;

GRANT SELECT ON public.cadastral_parcels_public TO anon;
GRANT SELECT ON public.cadastral_parcels_public TO authenticated;
GRANT SELECT ON public.cadastral_parcels_public TO service_role;
-- Supprimer la vue qui pose problème de sécurité
DROP VIEW IF EXISTS public.cadastral_parcels_with_calculated_data;

-- Créer une fonction RPC publique pour obtenir les données cadastrales avec calculs
CREATE OR REPLACE FUNCTION public.get_cadastral_parcel_with_calculations(parcel_number_param TEXT)
RETURNS TABLE(
  id UUID,
  parcel_number TEXT,
  parcel_type TEXT,
  location TEXT,
  property_title_type TEXT,
  area_sqm NUMERIC,
  area_hectares NUMERIC,
  gps_coordinates JSONB,
  latitude NUMERIC,
  longitude NUMERIC,
  current_owner_name TEXT,
  current_owner_legal_status TEXT,
  current_owner_since DATE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  province TEXT,
  ville TEXT,
  commune TEXT,
  quartier TEXT,
  avenue TEXT,
  territoire TEXT,
  collectivite TEXT,
  groupement TEXT,
  village TEXT,
  nombre_bornes INTEGER,
  surface_calculee_bornes NUMERIC,
  circonscription_fonciere TEXT,
  calculated_surface_sqm NUMERIC,
  calculated_area_hectares NUMERIC
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id,
    cp.parcel_number,
    cp.parcel_type,
    cp.location,
    cp.property_title_type,
    cp.area_sqm,
    cp.area_hectares,
    cp.gps_coordinates,
    cp.latitude,
    cp.longitude,
    cp.current_owner_name,
    cp.current_owner_legal_status,
    cp.current_owner_since,
    cp.created_at,
    cp.updated_at,
    cp.province,
    cp.ville,
    cp.commune,
    cp.quartier,
    cp.avenue,
    cp.territoire,
    cp.collectivite,
    cp.groupement,
    cp.village,
    cp.nombre_bornes,
    cp.surface_calculee_bornes,
    cp.circonscription_fonciere,
    public.calculate_surface_from_coordinates(cp.gps_coordinates) as calculated_surface_sqm,
    CASE 
      WHEN cp.gps_coordinates IS NOT NULL 
      THEN public.calculate_surface_from_coordinates(cp.gps_coordinates) / 10000.0 
      ELSE cp.area_hectares 
    END as calculated_area_hectares
  FROM public.cadastral_parcels cp
  WHERE cp.parcel_number ILIKE parcel_number_param;
END;
$$;
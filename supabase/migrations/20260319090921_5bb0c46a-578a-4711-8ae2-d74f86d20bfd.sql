
-- 1. Drop the function first (return type changed)
DROP FUNCTION IF EXISTS public.get_cadastral_parcel_with_calculations(text);

-- 2. Drop circonscription_fonciere from all tables
ALTER TABLE public.cadastral_parcels DROP COLUMN IF EXISTS circonscription_fonciere;
ALTER TABLE public.cadastral_contributions DROP COLUMN IF EXISTS circonscription_fonciere;
ALTER TABLE public.land_title_requests DROP COLUMN IF EXISTS circonscription_fonciere;

-- 3. Recreate function without circonscription_fonciere
CREATE OR REPLACE FUNCTION public.get_cadastral_parcel_with_calculations(parcel_number_param text)
 RETURNS TABLE(id uuid, parcel_number text, parcel_type text, location text, property_title_type text, area_sqm numeric, area_hectares numeric, gps_coordinates jsonb, latitude numeric, longitude numeric, current_owner_name text, current_owner_legal_status text, current_owner_since date, created_at timestamp with time zone, updated_at timestamp with time zone, province text, ville text, commune text, quartier text, avenue text, territoire text, collectivite text, groupement text, village text, nombre_bornes integer, surface_calculee_bornes numeric, calculated_surface_sqm numeric, calculated_area_hectares numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id, cp.parcel_number, cp.parcel_type, cp.location, cp.property_title_type,
    cp.area_sqm, cp.area_hectares, cp.gps_coordinates, cp.latitude, cp.longitude,
    cp.current_owner_name, cp.current_owner_legal_status, cp.current_owner_since,
    cp.created_at, cp.updated_at, cp.province, cp.ville, cp.commune, cp.quartier,
    cp.avenue, cp.territoire, cp.collectivite, cp.groupement, cp.village,
    cp.nombre_bornes, cp.surface_calculee_bornes,
    public.calculate_surface_from_coordinates(cp.gps_coordinates) as calculated_surface_sqm,
    CASE 
      WHEN cp.gps_coordinates IS NOT NULL 
      THEN public.calculate_surface_from_coordinates(cp.gps_coordinates) / 10000.0 
      ELSE cp.area_hectares 
    END as calculated_area_hectares
  FROM public.cadastral_parcels cp
  WHERE cp.parcel_number ILIKE parcel_number_param;
END;
$function$;

-- 4. Update calculate_ccc_value (11 location fields instead of 12)
CREATE OR REPLACE FUNCTION public.calculate_ccc_value(contribution_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_fields INTEGER := 0;
  filled_fields INTEGER := 0;
  completion_rate NUMERIC;
  ccc_value NUMERIC;
  contrib RECORD;
  permit_count INTEGER := 0;
BEGIN
  SELECT * INTO contrib FROM public.cadastral_contributions WHERE id = contribution_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  
  total_fields := total_fields + 1;
  filled_fields := filled_fields + 1;
  
  total_fields := total_fields + 12;
  IF contrib.property_title_type IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.lease_type IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.title_reference_number IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.current_owners_details IS NOT NULL AND jsonb_array_length(contrib.current_owners_details) > 0 THEN 
    filled_fields := filled_fields + 3;
  ELSIF contrib.current_owner_name IS NOT NULL THEN 
    filled_fields := filled_fields + 1;
  END IF;
  IF contrib.current_owner_since IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.area_sqm IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.construction_type IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.construction_nature IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.declared_usage IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  
  total_fields := total_fields + 3;
  IF contrib.building_permits IS NOT NULL AND jsonb_array_length(contrib.building_permits) > 0 THEN 
    filled_fields := filled_fields + 1;
    SELECT COUNT(*) INTO permit_count
    FROM jsonb_array_elements(contrib.building_permits) AS permit
    WHERE permit->>'attachmentUrl' IS NOT NULL AND permit->>'attachmentUrl' != '';
    IF permit_count > 0 THEN filled_fields := filled_fields + 1; END IF;
  END IF;
  IF contrib.permit_request_data IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.previous_permit_number IS NOT NULL THEN
    total_fields := total_fields + 1;
    filled_fields := filled_fields + 1;
  END IF;
  
  total_fields := total_fields + 11;
  IF contrib.province IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.ville IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.commune IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.quartier IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.avenue IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.territoire IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.collectivite IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.groupement IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.village IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.gps_coordinates IS NOT NULL AND jsonb_array_length(contrib.gps_coordinates) >= 3 THEN 
    filled_fields := filled_fields + 2;
  ELSIF contrib.gps_coordinates IS NOT NULL AND jsonb_array_length(contrib.gps_coordinates) > 0 THEN
    filled_fields := filled_fields + 1;
  END IF;
  
  total_fields := total_fields + 3;
  IF contrib.ownership_history IS NOT NULL AND jsonb_array_length(contrib.ownership_history) > 0 THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.boundary_history IS NOT NULL AND jsonb_array_length(contrib.boundary_history) > 0 THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.tax_history IS NOT NULL AND jsonb_array_length(contrib.tax_history) > 0 THEN filled_fields := filled_fields + 1; END IF;
  
  total_fields := total_fields + 1;
  IF contrib.mortgage_history IS NOT NULL AND jsonb_array_length(contrib.mortgage_history) > 0 THEN filled_fields := filled_fields + 1; END IF;
  
  total_fields := total_fields + 2;
  IF contrib.owner_document_url IS NOT NULL AND contrib.owner_document_url != '' THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.property_title_document_url IS NOT NULL AND contrib.property_title_document_url != '' THEN filled_fields := filled_fields + 1; END IF;
  
  total_fields := total_fields + 1;
  IF contrib.whatsapp_number IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  
  completion_rate := (filled_fields::NUMERIC / total_fields::NUMERIC);
  ccc_value := ROUND(5.00 * completion_rate, 2);
  IF ccc_value < 0.50 THEN ccc_value := 0.50; END IF;
  RETURN ccc_value;
END;
$function$;

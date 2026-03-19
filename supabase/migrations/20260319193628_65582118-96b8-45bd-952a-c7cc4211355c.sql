-- FIX: Align calculate_ccc_value with frontend - exclude boundary_history from scoring
-- since there is no UI input for it, counting it penalizes all users unfairly.
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
  is_urban BOOLEAN := false;
BEGIN
  SELECT * INTO contrib FROM public.cadastral_contributions WHERE id = contribution_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  
  is_urban := (contrib.parcel_type = 'SU' OR contrib.parcel_type = 'urbain');
  
  total_fields := total_fields + 1;
  filled_fields := filled_fields + 1;
  
  total_fields := total_fields + 14;
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
  IF contrib.construction_materials IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.standing IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  
  total_fields := total_fields + 3;
  IF contrib.building_permits IS NOT NULL AND jsonb_array_length(contrib.building_permits) > 0 THEN 
    filled_fields := filled_fields + 1;
    SELECT COUNT(*) INTO permit_count
    FROM jsonb_array_elements(contrib.building_permits) AS permit
    WHERE (permit->>'permit_document_url' IS NOT NULL AND permit->>'permit_document_url' != '')
       OR (permit->>'attachmentUrl' IS NOT NULL AND permit->>'attachmentUrl' != '');
    IF permit_count > 0 THEN filled_fields := filled_fields + 1; END IF;
  END IF;
  IF contrib.permit_request_data IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.previous_permit_number IS NOT NULL THEN
    total_fields := total_fields + 1;
    filled_fields := filled_fields + 1;
  END IF;
  
  IF is_urban THEN
    total_fields := total_fields + 7;
    IF contrib.province IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF contrib.ville IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF contrib.commune IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF contrib.quartier IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF contrib.avenue IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  ELSE
    total_fields := total_fields + 7;
    IF contrib.province IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF contrib.territoire IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF contrib.collectivite IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF contrib.groupement IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF contrib.village IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  END IF;
  IF contrib.gps_coordinates IS NOT NULL AND jsonb_array_length(contrib.gps_coordinates) >= 3 THEN 
    filled_fields := filled_fields + 2;
  ELSIF contrib.gps_coordinates IS NOT NULL AND jsonb_array_length(contrib.gps_coordinates) > 0 THEN
    filled_fields := filled_fields + 1;
  END IF;
  
  -- SECTION 5: History - 2 fields (boundary_history excluded: no UI input)
  total_fields := total_fields + 2;
  IF contrib.ownership_history IS NOT NULL AND jsonb_array_length(contrib.ownership_history) > 0 THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.tax_history IS NOT NULL AND jsonb_array_length(contrib.tax_history) > 0 THEN filled_fields := filled_fields + 1; END IF;
  
  total_fields := total_fields + 1;
  IF contrib.mortgage_history IS NOT NULL AND jsonb_array_length(contrib.mortgage_history) > 0 THEN filled_fields := filled_fields + 1; END IF;
  
  total_fields := total_fields + 2;
  IF contrib.owner_document_url IS NOT NULL AND contrib.owner_document_url != '' THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.property_title_document_url IS NOT NULL AND contrib.property_title_document_url != '' THEN filled_fields := filled_fields + 1; END IF;
  
  total_fields := total_fields + 1;
  IF contrib.whatsapp_number IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  
  IF filled_fields > total_fields THEN
    filled_fields := total_fields;
  END IF;
  
  completion_rate := (filled_fields::NUMERIC / total_fields::NUMERIC);
  ccc_value := ROUND(5.00 * completion_rate, 2);
  IF ccc_value < 0.50 THEN ccc_value := 0.50; END IF;
  IF ccc_value > 5.00 THEN ccc_value := 5.00; END IF;
  RETURN ccc_value;
END;
$function$;
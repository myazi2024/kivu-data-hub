-- Fix calculate_ccc_value: add standing and construction_materials to completion calculation
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

-- Fix auto_generate_ccc_code: also trigger on returned -> approved
CREATE OR REPLACE FUNCTION public.auto_generate_ccc_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_code TEXT;
  v_value_usd NUMERIC;
  v_existing_code TEXT;
BEGIN
  IF (OLD.status = 'pending' OR OLD.status = 'returned') AND NEW.status = 'approved' THEN
    
    SELECT code INTO v_existing_code
    FROM cadastral_contributor_codes
    WHERE contribution_id = NEW.id
    LIMIT 1;
    
    IF v_existing_code IS NOT NULL THEN
      RAISE NOTICE 'Code CCC déjà existant pour la contribution %: %', NEW.id, v_existing_code;
      RETURN NEW;
    END IF;
    
    IF NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'Impossible de générer un code CCC: user_id est NULL pour la contribution %', NEW.id;
    END IF;
    
    BEGIN
      v_code := generate_ccc_code();
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Erreur lors de la génération du code CCC: %', SQLERRM;
    END;
    
    BEGIN
      v_value_usd := calculate_ccc_value(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Erreur lors du calcul de la valeur CCC: %', SQLERRM;
    END;
    
    IF v_value_usd IS NULL OR v_value_usd < 0 OR v_value_usd > 5 THEN
      RAISE EXCEPTION 'Valeur CCC invalide calculée: %', v_value_usd;
    END IF;
    
    BEGIN
      INSERT INTO cadastral_contributor_codes (
        code, parcel_number, user_id, contribution_id,
        value_usd, is_used, is_valid, expires_at
      ) VALUES (
        v_code, NEW.parcel_number, NEW.user_id, NEW.id,
        v_value_usd, false, true, NOW() + INTERVAL '90 days'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Erreur lors de l''insertion du code CCC: %', SQLERRM;
    END;
    
    BEGIN
      INSERT INTO notifications (
        user_id, type, title, message, action_url
      ) VALUES (
        NEW.user_id, 'success', 'Code CCC généré',
        format('Félicitations ! Votre code CCC %s d''une valeur de %s USD a été généré pour la parcelle %s. Il est valable pendant 90 jours.', v_code, v_value_usd::TEXT, NEW.parcel_number),
        '/user-dashboard?tab=ccc-codes'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Impossible de créer la notification: %', SQLERRM;
    END;
    
    RAISE NOTICE 'Code CCC % généré avec succès pour la contribution % (valeur: % USD)', v_code, NEW.id, v_value_usd;
  END IF;
  
  RETURN NEW;
END;
$function$;
-- Mise à jour de la fonction calculate_ccc_value pour inclure les pièces jointes
CREATE OR REPLACE FUNCTION public.calculate_ccc_value(contribution_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_fields INTEGER := 0;
  filled_fields INTEGER := 0;
  completion_rate NUMERIC;
  ccc_value NUMERIC;
  contrib RECORD;
BEGIN
  -- Récupérer la contribution
  SELECT * INTO contrib FROM public.cadastral_contributions WHERE id = contribution_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Compter les champs totaux et remplis
  
  -- Champs obligatoires (toujours comptés comme remplis s'ils existent)
  total_fields := total_fields + 1; -- parcel_number (obligatoire)
  filled_fields := filled_fields + 1;
  
  -- Informations générales (9 champs)
  total_fields := total_fields + 9;
  IF contrib.property_title_type IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.title_reference_number IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.current_owner_name IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.current_owner_legal_status IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.current_owner_since IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.area_sqm IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.construction_type IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.construction_nature IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.declared_usage IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  
  -- Permis de construire (1 champ array)
  total_fields := total_fields + 1;
  IF contrib.building_permits IS NOT NULL AND jsonb_array_length(contrib.building_permits) > 0 THEN 
    filled_fields := filled_fields + 1; 
  END IF;
  
  -- Localisation (11 champs)
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
  IF contrib.circonscription_fonciere IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.gps_coordinates IS NOT NULL AND jsonb_array_length(contrib.gps_coordinates) > 0 THEN 
    filled_fields := filled_fields + 1; 
  END IF;
  
  -- Historiques (3 champs array)
  total_fields := total_fields + 3;
  IF contrib.ownership_history IS NOT NULL AND jsonb_array_length(contrib.ownership_history) > 0 THEN 
    filled_fields := filled_fields + 1; 
  END IF;
  IF contrib.boundary_history IS NOT NULL AND jsonb_array_length(contrib.boundary_history) > 0 THEN 
    filled_fields := filled_fields + 1; 
  END IF;
  IF contrib.tax_history IS NOT NULL AND jsonb_array_length(contrib.tax_history) > 0 THEN 
    filled_fields := filled_fields + 1; 
  END IF;
  
  -- Obligations (1 champ)
  total_fields := total_fields + 1;
  IF contrib.mortgage_history IS NOT NULL AND jsonb_array_length(contrib.mortgage_history) > 0 THEN 
    filled_fields := filled_fields + 1; 
  END IF;
  
  -- Pièces jointes (2 champs) - AJOUTÉS
  total_fields := total_fields + 2;
  IF contrib.owner_document_url IS NOT NULL AND contrib.owner_document_url != '' THEN 
    filled_fields := filled_fields + 1; 
  END IF;
  IF contrib.property_title_document_url IS NOT NULL AND contrib.property_title_document_url != '' THEN 
    filled_fields := filled_fields + 1; 
  END IF;
  
  -- Métadonnées (1 champ)
  total_fields := total_fields + 1;
  IF contrib.whatsapp_number IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  
  -- Calculer le taux de complétion
  completion_rate := (filled_fields::NUMERIC / total_fields::NUMERIC);
  
  -- Calculer la valeur du code CCC (max 5$)
  ccc_value := ROUND(5.00 * completion_rate, 2);
  
  -- Valeur minimum de 0.50$ si au moins le numéro de parcelle est fourni
  IF ccc_value < 0.50 THEN
    ccc_value := 0.50;
  END IF;
  
  RETURN ccc_value;
END;
$$;
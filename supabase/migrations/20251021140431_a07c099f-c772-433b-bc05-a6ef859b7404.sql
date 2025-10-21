-- ========================================
-- MIGRATION: Correction formulaire CCC
-- ========================================

-- 1. Ajouter les colonnes manquantes pour copropriété
ALTER TABLE public.cadastral_contributions
ADD COLUMN IF NOT EXISTS current_owners_details JSONB DEFAULT NULL;

COMMENT ON COLUMN public.cadastral_contributions.current_owners_details IS 
'Détails complets des propriétaires actuels (copropriété supportée): 
[{lastName, middleName, firstName, legalStatus, since}]';

-- 2. Ajouter le champ previousPermitNumber pour régularisation
ALTER TABLE public.cadastral_contributions
ADD COLUMN IF NOT EXISTS previous_permit_number TEXT DEFAULT NULL;

COMMENT ON COLUMN public.cadastral_contributions.previous_permit_number IS 
'Numéro de permis précédent (utilisé pour régularisation "changement d''usage sans autorisation")';

-- 3. Créer un index sur permit_request_data pour performances
CREATE INDEX IF NOT EXISTS idx_contributions_permit_request 
ON public.cadastral_contributions USING gin(permit_request_data);

-- ========================================
-- MISE À JOUR DE LA FONCTION calculate_ccc_value
-- ========================================

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
  permit_attachments_count INTEGER := 0;
BEGIN
  -- Récupérer la contribution
  SELECT * INTO contrib FROM public.cadastral_contributions WHERE id = contribution_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- ============================================
  -- SECTION 1: Champ obligatoire (1 champ)
  -- ============================================
  total_fields := total_fields + 1; -- parcel_number
  filled_fields := filled_fields + 1; -- toujours rempli
  
  -- ============================================
  -- SECTION 2: Informations générales (12 champs)
  -- ============================================
  total_fields := total_fields + 12;
  
  IF contrib.property_title_type IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.lease_type IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.title_reference_number IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  
  -- Propriétaires (utiliser current_owners_details si disponible, sinon fallback)
  IF contrib.current_owners_details IS NOT NULL AND jsonb_array_length(contrib.current_owners_details) > 0 THEN 
    filled_fields := filled_fields + 3; -- lastName, firstName, legalStatus
  ELSIF contrib.current_owner_name IS NOT NULL THEN 
    filled_fields := filled_fields + 1;
  END IF;
  
  IF contrib.current_owner_since IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.area_sqm IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.construction_type IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.construction_nature IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.declared_usage IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  
  -- ============================================
  -- SECTION 3: Permis de construire (3 champs)
  -- ============================================
  total_fields := total_fields + 3;
  
  -- Permis existants
  IF contrib.building_permits IS NOT NULL AND jsonb_array_length(contrib.building_permits) > 0 THEN 
    filled_fields := filled_fields + 1;
    
    -- Compter les pièces jointes de permis
    SELECT COUNT(*) INTO permit_count
    FROM jsonb_array_elements(contrib.building_permits) AS permit
    WHERE permit->>'attachmentUrl' IS NOT NULL AND permit->>'attachmentUrl' != '';
    
    IF permit_count > 0 THEN
      filled_fields := filled_fields + 1;
    END IF;
  END IF;
  
  -- Demande de permis
  IF contrib.permit_request_data IS NOT NULL THEN 
    filled_fields := filled_fields + 1;
  END IF;
  
  -- Previous permit number (régularisation)
  IF contrib.previous_permit_number IS NOT NULL THEN
    total_fields := total_fields + 1;
    filled_fields := filled_fields + 1;
  END IF;
  
  -- ============================================
  -- SECTION 4: Localisation (12 champs)
  -- ============================================
  total_fields := total_fields + 12;
  
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
  
  IF contrib.gps_coordinates IS NOT NULL AND jsonb_array_length(contrib.gps_coordinates) >= 3 THEN 
    filled_fields := filled_fields + 2; -- coordonnées + validation >= 3 bornes
  ELSIF contrib.gps_coordinates IS NOT NULL AND jsonb_array_length(contrib.gps_coordinates) > 0 THEN
    filled_fields := filled_fields + 1; -- coordonnées partielles
  END IF;
  
  -- ============================================
  -- SECTION 5: Historiques (3 champs)
  -- ============================================
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
  
  -- ============================================
  -- SECTION 6: Obligations (1 champ)
  -- ============================================
  total_fields := total_fields + 1;
  
  IF contrib.mortgage_history IS NOT NULL AND jsonb_array_length(contrib.mortgage_history) > 0 THEN 
    filled_fields := filled_fields + 1;
  END IF;
  
  -- ============================================
  -- SECTION 7: Pièces jointes (2 champs)
  -- ============================================
  total_fields := total_fields + 2;
  
  IF contrib.owner_document_url IS NOT NULL AND contrib.owner_document_url != '' THEN 
    filled_fields := filled_fields + 1;
  END IF;
  
  IF contrib.property_title_document_url IS NOT NULL AND contrib.property_title_document_url != '' THEN 
    filled_fields := filled_fields + 1;
  END IF;
  
  -- ============================================
  -- SECTION 8: Métadonnées (1 champ)
  -- ============================================
  total_fields := total_fields + 1;
  
  IF contrib.whatsapp_number IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  
  -- ============================================
  -- CALCUL FINAL
  -- ============================================
  
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
$function$;

COMMENT ON FUNCTION public.calculate_ccc_value IS 
'Calcule la valeur du code CCC basée sur le taux de complétion des données (35 champs au total, max 5 USD)';

-- ========================================
-- MISE À JOUR DU HOOK DE SOUMISSION
-- ========================================

-- Créer une fonction helper pour extraire les détails des propriétaires
CREATE OR REPLACE FUNCTION public.extract_owner_names_from_details(owners_details JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result TEXT := '';
  owner JSONB;
BEGIN
  IF owners_details IS NULL OR jsonb_array_length(owners_details) = 0 THEN
    RETURN NULL;
  END IF;
  
  FOR owner IN SELECT * FROM jsonb_array_elements(owners_details)
  LOOP
    IF result != '' THEN
      result := result || '; ';
    END IF;
    
    result := result || COALESCE(owner->>'lastName', '') || 
              CASE WHEN owner->>'middleName' IS NOT NULL AND owner->>'middleName' != '' 
                   THEN ' ' || (owner->>'middleName') 
                   ELSE '' 
              END ||
              ' ' || COALESCE(owner->>'firstName', '');
  END LOOP;
  
  RETURN TRIM(result);
END;
$$;

COMMENT ON FUNCTION public.extract_owner_names_from_details IS 
'Extrait les noms complets des propriétaires depuis le JSONB current_owners_details';

-- ========================================
-- TRIGGER pour synchroniser current_owner_name
-- ========================================

CREATE OR REPLACE FUNCTION public.sync_current_owner_name()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Synchroniser current_owner_name depuis current_owners_details si disponible
  IF NEW.current_owners_details IS NOT NULL AND jsonb_array_length(NEW.current_owners_details) > 0 THEN
    NEW.current_owner_name := public.extract_owner_names_from_details(NEW.current_owners_details);
    
    -- Extraire aussi les autres infos du premier propriétaire
    NEW.current_owner_legal_status := NEW.current_owners_details->0->>'legalStatus';
    NEW.current_owner_since := (NEW.current_owners_details->0->>'since')::DATE;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_owner_name ON public.cadastral_contributions;

CREATE TRIGGER trigger_sync_owner_name
BEFORE INSERT OR UPDATE ON public.cadastral_contributions
FOR EACH ROW
EXECUTE FUNCTION public.sync_current_owner_name();

COMMENT ON TRIGGER trigger_sync_owner_name ON public.cadastral_contributions IS 
'Synchronise automatiquement current_owner_name depuis current_owners_details pour rétrocompatibilité';

CREATE OR REPLACE FUNCTION public.create_parcel_from_approved_contribution()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IN ('pending', 'returned') AND NEW.contribution_type IN ('new', 'nouveau') THEN
    IF NOT EXISTS (
      SELECT 1 FROM cadastral_parcels 
      WHERE parcel_number = NEW.parcel_number
      AND deleted_at IS NULL
    ) THEN
      INSERT INTO cadastral_parcels (
        parcel_number, parcel_type, location, property_title_type,
        title_reference_number, area_sqm, gps_coordinates,
        latitude, longitude, current_owner_name, current_owner_legal_status,
        current_owner_since, province, ville, commune, quartier, avenue,
        territoire, collectivite, groupement, village,
        nombre_bornes, surface_calculee_bornes, construction_type,
        construction_nature, declared_usage, lease_type, owner_document_url,
        property_title_document_url, whatsapp_number, parcel_sides
      ) VALUES (
        NEW.parcel_number, NEW.parcel_type,
        COALESCE(NEW.ville, NEW.territoire, NEW.province),
        NEW.property_title_type, NEW.title_reference_number,
        NEW.area_sqm, NEW.gps_coordinates,
        CASE WHEN NEW.gps_coordinates IS NOT NULL AND jsonb_array_length(NEW.gps_coordinates) > 0
          THEN (NEW.gps_coordinates->0->>'lat')::NUMERIC ELSE NULL END,
        CASE WHEN NEW.gps_coordinates IS NOT NULL AND jsonb_array_length(NEW.gps_coordinates) > 0
          THEN (NEW.gps_coordinates->0->>'lng')::NUMERIC ELSE NULL END,
        NEW.current_owner_name, NEW.current_owner_legal_status,
        NEW.current_owner_since, NEW.province, NEW.ville, NEW.commune,
        NEW.quartier, NEW.avenue, NEW.territoire, NEW.collectivite,
        NEW.groupement, NEW.village,
        CASE WHEN NEW.gps_coordinates IS NOT NULL 
          THEN jsonb_array_length(NEW.gps_coordinates) ELSE NULL END,
        CASE WHEN NEW.gps_coordinates IS NOT NULL
          THEN calculate_surface_from_coordinates(NEW.gps_coordinates) ELSE NULL END,
        NEW.construction_type, NEW.construction_nature, NEW.declared_usage,
        NEW.lease_type, NEW.owner_document_url, NEW.property_title_document_url,
        NEW.whatsapp_number, NEW.parcel_sides
      );
      
      NEW.original_parcel_id := (
        SELECT id FROM cadastral_parcels 
        WHERE parcel_number = NEW.parcel_number
        ORDER BY created_at DESC LIMIT 1
      );
      
      IF NEW.ownership_history IS NOT NULL AND jsonb_array_length(NEW.ownership_history) > 0 THEN
        INSERT INTO cadastral_ownership_history (
          parcel_id, owner_name, legal_status, ownership_start_date,
          ownership_end_date, mutation_type, ownership_document_url
        )
        SELECT 
          NEW.original_parcel_id,
          (owner->>'owner_name')::TEXT,
          (owner->>'legal_status')::TEXT,
          (owner->>'ownership_start_date')::DATE,
          (owner->>'ownership_end_date')::DATE,
          (owner->>'mutation_type')::TEXT,
          (owner->>'ownership_document_url')::TEXT
        FROM jsonb_array_elements(NEW.ownership_history) AS owner;
      END IF;
      
      IF NEW.boundary_history IS NOT NULL AND jsonb_array_length(NEW.boundary_history) > 0 THEN
        INSERT INTO cadastral_boundary_history (
          parcel_id, pv_reference_number, boundary_purpose,
          surveyor_name, survey_date, boundary_document_url
        )
        SELECT 
          NEW.original_parcel_id,
          (boundary->>'pv_reference_number')::TEXT,
          (boundary->>'boundary_purpose')::TEXT,
          (boundary->>'surveyor_name')::TEXT,
          (boundary->>'survey_date')::DATE,
          (boundary->>'boundary_document_url')::TEXT
        FROM jsonb_array_elements(NEW.boundary_history) AS boundary;
      END IF;
      
      IF NEW.tax_history IS NOT NULL AND jsonb_array_length(NEW.tax_history) > 0 THEN
        INSERT INTO cadastral_tax_history (
          parcel_id, tax_year, amount_usd, payment_status,
          payment_date, receipt_document_url
        )
        SELECT 
          NEW.original_parcel_id,
          (tax->>'tax_year')::INTEGER,
          (tax->>'amount_usd')::NUMERIC,
          (tax->>'payment_status')::TEXT,
          (tax->>'payment_date')::DATE,
          (tax->>'receipt_document_url')::TEXT
        FROM jsonb_array_elements(NEW.tax_history) AS tax;
      END IF;
      
      IF NEW.mortgage_history IS NOT NULL AND jsonb_array_length(NEW.mortgage_history) > 0 THEN
        INSERT INTO cadastral_mortgages (
          parcel_id, mortgage_amount_usd, duration_months,
          creditor_name, creditor_type, contract_date, mortgage_status
        )
        SELECT 
          NEW.original_parcel_id,
          (mortgage->>'mortgage_amount_usd')::NUMERIC,
          (mortgage->>'duration_months')::INTEGER,
          (mortgage->>'creditor_name')::TEXT,
          (mortgage->>'creditor_type')::TEXT,
          (mortgage->>'contract_date')::DATE,
          (mortgage->>'mortgage_status')::TEXT
        FROM jsonb_array_elements(NEW.mortgage_history) AS mortgage;
      END IF;
      
      IF NEW.building_permits IS NOT NULL AND jsonb_array_length(NEW.building_permits) > 0 THEN
        INSERT INTO cadastral_building_permits (
          parcel_id, permit_number, issue_date, validity_period_months,
          issuing_service, administrative_status, issuing_service_contact,
          permit_document_url, is_current
        )
        SELECT 
          NEW.original_parcel_id,
          (permit->>'permit_number')::TEXT,
          (permit->>'issue_date')::DATE,
          (permit->>'validity_period_months')::INTEGER,
          (permit->>'issuing_service')::TEXT,
          (permit->>'administrative_status')::TEXT,
          (permit->>'issuing_service_contact')::TEXT,
          (permit->>'permit_document_url')::TEXT,
          COALESCE((permit->>'is_current')::BOOLEAN, true)
        FROM jsonb_array_elements(NEW.building_permits) AS permit;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_approved_contribution_to_parcel()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_parcel_id UUID;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    IF NEW.original_parcel_id IS NOT NULL THEN
      UPDATE cadastral_parcels
      SET
        parcel_number = NEW.parcel_number,
        parcel_type = COALESCE(
          CASE 
            WHEN NEW.province IS NOT NULL AND NEW.ville IS NOT NULL THEN 'urbain'
            WHEN NEW.province IS NOT NULL AND NEW.territoire IS NOT NULL THEN 'rural'
            ELSE parcel_type
          END,
          parcel_type
        ),
        location = COALESCE(
          CASE 
            WHEN NEW.ville IS NOT NULL THEN NEW.ville
            WHEN NEW.territoire IS NOT NULL THEN NEW.territoire
            ELSE location
          END,
          location
        ),
        area_sqm = COALESCE(NEW.area_sqm, area_sqm),
        current_owner_name = COALESCE(NEW.current_owner_name, current_owner_name),
        current_owner_since = COALESCE(NEW.current_owner_since, current_owner_since),
        current_owner_legal_status = COALESCE(NEW.current_owner_legal_status, current_owner_legal_status),
        property_title_type = COALESCE(NEW.property_title_type, property_title_type),
        property_title_document_url = COALESCE(NEW.property_title_document_url, property_title_document_url),
        title_reference_number = COALESCE(NEW.title_reference_number, title_reference_number),
        owner_document_url = COALESCE(NEW.owner_document_url, owner_document_url),
        construction_type = COALESCE(NEW.construction_type, construction_type),
        construction_nature = COALESCE(NEW.construction_nature, construction_nature),
        declared_usage = COALESCE(NEW.declared_usage, declared_usage),
        lease_type = COALESCE(NEW.lease_type, lease_type),
        province = COALESCE(NEW.province, province),
        ville = COALESCE(NEW.ville, ville),
        commune = COALESCE(NEW.commune, commune),
        quartier = COALESCE(NEW.quartier, quartier),
        avenue = COALESCE(NEW.avenue, avenue),
        territoire = COALESCE(NEW.territoire, territoire),
        collectivite = COALESCE(NEW.collectivite, collectivite),
        groupement = COALESCE(NEW.groupement, groupement),
        village = COALESCE(NEW.village, village),
        gps_coordinates = COALESCE(NEW.gps_coordinates, gps_coordinates),
        parcel_sides = COALESCE(NEW.parcel_sides, parcel_sides),
        whatsapp_number = COALESCE(NEW.whatsapp_number, whatsapp_number),
        updated_at = NOW()
      WHERE id = NEW.original_parcel_id;
    ELSE
      INSERT INTO cadastral_parcels (
        parcel_number,
        parcel_type,
        location,
        area_sqm,
        current_owner_name,
        current_owner_since,
        current_owner_legal_status,
        property_title_type,
        property_title_document_url,
        title_reference_number,
        owner_document_url,
        construction_type,
        construction_nature,
        declared_usage,
        lease_type,
        province,
        ville,
        commune,
        quartier,
        avenue,
        territoire,
        collectivite,
        groupement,
        village,
        gps_coordinates,
        parcel_sides,
        whatsapp_number
      ) VALUES (
        NEW.parcel_number,
        CASE 
          WHEN NEW.ville IS NOT NULL THEN 'urbain'
          WHEN NEW.territoire IS NOT NULL THEN 'rural'
          ELSE 'urbain'
        END,
        COALESCE(NEW.ville, NEW.territoire, 'Non spécifié'),
        COALESCE(NEW.area_sqm, 0),
        COALESCE(NEW.current_owner_name, 'Propriétaire non spécifié'),
        COALESCE(NEW.current_owner_since, CURRENT_DATE),
        COALESCE(NEW.current_owner_legal_status, 'Personne physique'),
        COALESCE(NEW.property_title_type, 'Certificat d''enregistrement'),
        NEW.property_title_document_url,
        NEW.title_reference_number,
        NEW.owner_document_url,
        NEW.construction_type,
        NEW.construction_nature,
        NEW.declared_usage,
        NEW.lease_type,
        NEW.province,
        NEW.ville,
        NEW.commune,
        NEW.quartier,
        NEW.avenue,
        NEW.territoire,
        NEW.collectivite,
        NEW.groupement,
        NEW.village,
        NEW.gps_coordinates,
        NEW.parcel_sides,
        NEW.whatsapp_number
      )
      RETURNING id INTO v_parcel_id;
      
      UPDATE cadastral_contributions
      SET original_parcel_id = v_parcel_id
      WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

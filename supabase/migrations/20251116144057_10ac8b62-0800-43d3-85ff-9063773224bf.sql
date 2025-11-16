-- Fonction pour créer automatiquement une parcelle cadastrale lors de l'approbation d'une contribution
CREATE OR REPLACE FUNCTION create_parcel_from_approved_contribution()
RETURNS TRIGGER AS $$
DECLARE
  v_parcel_id uuid;
  v_location text;
BEGIN
  -- Ne rien faire si le statut n'est pas "approved" ou si ce n'est pas un changement de statut vers "approved"
  IF NEW.status != 'approved' OR (OLD.status = 'approved' AND NEW.status = 'approved') THEN
    RETURN NEW;
  END IF;

  -- Construire la localisation à partir des données géographiques
  v_location := COALESCE(NEW.province, '') || 
                CASE WHEN NEW.ville IS NOT NULL THEN ', ' || NEW.ville ELSE '' END ||
                CASE WHEN NEW.commune IS NOT NULL THEN ', ' || NEW.commune ELSE '' END ||
                CASE WHEN NEW.quartier IS NOT NULL THEN ', ' || NEW.quartier ELSE '' END ||
                CASE WHEN NEW.avenue IS NOT NULL THEN ', ' || NEW.avenue ELSE '' END;

  -- Si contribution de type "new", créer une nouvelle parcelle
  IF NEW.contribution_type = 'new' THEN
    -- Vérifier si la parcelle existe déjà
    SELECT id INTO v_parcel_id 
    FROM cadastral_parcels 
    WHERE parcel_number = NEW.parcel_number AND deleted_at IS NULL;

    -- Si la parcelle n'existe pas, la créer
    IF v_parcel_id IS NULL THEN
      INSERT INTO cadastral_parcels (
        parcel_number,
        parcel_type,
        property_title_type,
        title_reference_number,
        current_owner_name,
        current_owner_legal_status,
        current_owner_since,
        area_sqm,
        area_hectares,
        location,
        province,
        ville,
        commune,
        quartier,
        avenue,
        territoire,
        collectivite,
        groupement,
        village,
        circonscription_fonciere,
        gps_coordinates,
        latitude,
        longitude,
        nombre_bornes,
        parcel_sides,
        surface_calculee_bornes,
        construction_type,
        construction_nature,
        declared_usage,
        lease_type,
        whatsapp_number,
        owner_document_url,
        property_title_document_url
      ) VALUES (
        NEW.parcel_number,
        'urbain', -- Type par défaut
        COALESCE(NEW.property_title_type, 'Certificat d''enregistrement'),
        NEW.title_reference_number,
        COALESCE(NEW.current_owner_name, 'Non spécifié'),
        COALESCE(NEW.current_owner_legal_status, 'Personne physique'),
        COALESCE(NEW.current_owner_since, CURRENT_DATE),
        COALESCE(NEW.area_sqm, 0),
        CASE WHEN NEW.area_sqm IS NOT NULL THEN NEW.area_sqm / 10000.0 ELSE NULL END,
        v_location,
        NEW.province,
        NEW.ville,
        NEW.commune,
        NEW.quartier,
        NEW.avenue,
        NEW.territoire,
        NEW.collectivite,
        NEW.groupement,
        NEW.village,
        COALESCE(NEW.circonscription_fonciere, 'Circonscription Foncière de Goma'),
        NEW.gps_coordinates,
        -- Extraire latitude du premier point GPS si disponible
        CASE 
          WHEN NEW.gps_coordinates IS NOT NULL AND jsonb_array_length(NEW.gps_coordinates) > 0 
          THEN (NEW.gps_coordinates->0->>'lat')::numeric 
          ELSE NULL 
        END,
        -- Extraire longitude du premier point GPS si disponible
        CASE 
          WHEN NEW.gps_coordinates IS NOT NULL AND jsonb_array_length(NEW.gps_coordinates) > 0 
          THEN (NEW.gps_coordinates->0->>'lng')::numeric 
          ELSE NULL 
        END,
        CASE 
          WHEN NEW.gps_coordinates IS NOT NULL 
          THEN jsonb_array_length(NEW.gps_coordinates) 
          ELSE 3 
        END,
        NEW.parcel_sides,
        NEW.area_sqm, -- Surface calculée
        NEW.construction_type,
        NEW.construction_nature,
        NEW.declared_usage,
        NEW.lease_type,
        NEW.whatsapp_number,
        NEW.owner_document_url,
        NEW.property_title_document_url
      )
      RETURNING id INTO v_parcel_id;

      -- Créer l'historique de propriété si disponible
      IF NEW.ownership_history IS NOT NULL THEN
        INSERT INTO cadastral_ownership_history (
          parcel_id,
          owner_name,
          legal_status,
          ownership_start_date,
          ownership_end_date,
          mutation_type,
          ownership_document_url
        )
        SELECT 
          v_parcel_id,
          (elem->>'owner_name')::text,
          (elem->>'legal_status')::text,
          (elem->>'ownership_start_date')::date,
          (elem->>'ownership_end_date')::date,
          (elem->>'mutation_type')::text,
          (elem->>'ownership_document_url')::text
        FROM jsonb_array_elements(NEW.ownership_history) AS elem;
      END IF;

      -- Créer l'historique fiscal si disponible
      IF NEW.tax_history IS NOT NULL THEN
        INSERT INTO cadastral_tax_history (
          parcel_id,
          tax_year,
          amount_usd,
          payment_status,
          payment_date,
          receipt_document_url
        )
        SELECT 
          v_parcel_id,
          (elem->>'tax_year')::integer,
          COALESCE((elem->>'amount_usd')::numeric, 0),
          COALESCE((elem->>'payment_status')::text, 'pending'),
          (elem->>'payment_date')::date,
          (elem->>'receipt_document_url')::text
        FROM jsonb_array_elements(NEW.tax_history) AS elem;
      END IF;

      -- Créer l'historique des hypothèques si disponible
      IF NEW.mortgage_history IS NOT NULL THEN
        INSERT INTO cadastral_mortgages (
          parcel_id,
          creditor_name,
          creditor_type,
          mortgage_amount_usd,
          contract_date,
          duration_months,
          mortgage_status
        )
        SELECT 
          v_parcel_id,
          (elem->>'creditor_name')::text,
          COALESCE((elem->>'creditor_type')::text, 'Banque'),
          COALESCE((elem->>'mortgage_amount_usd')::numeric, 0),
          COALESCE((elem->>'contract_date')::date, CURRENT_DATE),
          COALESCE((elem->>'duration_months')::integer, 12),
          COALESCE((elem->>'mortgage_status')::text, 'active')
        FROM jsonb_array_elements(NEW.mortgage_history) AS elem;
      END IF;

      -- Créer l'historique des bornages si disponible
      IF NEW.boundary_history IS NOT NULL THEN
        INSERT INTO cadastral_boundary_history (
          parcel_id,
          survey_date,
          surveyor_name,
          boundary_purpose,
          pv_reference_number,
          boundary_document_url
        )
        SELECT 
          v_parcel_id,
          COALESCE((elem->>'survey_date')::date, CURRENT_DATE),
          (elem->>'surveyor_name')::text,
          (elem->>'boundary_purpose')::text,
          (elem->>'pv_reference_number')::text,
          (elem->>'boundary_document_url')::text
        FROM jsonb_array_elements(NEW.boundary_history) AS elem;
      END IF;

      -- Créer les permis de construire si disponibles
      IF NEW.building_permits IS NOT NULL THEN
        INSERT INTO cadastral_building_permits (
          parcel_id,
          permit_number,
          issue_date,
          issuing_service,
          issuing_service_contact,
          validity_period_months,
          administrative_status,
          is_current,
          permit_document_url
        )
        SELECT 
          v_parcel_id,
          (elem->>'permit_number')::text,
          COALESCE((elem->>'issue_date')::date, CURRENT_DATE),
          (elem->>'issuing_service')::text,
          (elem->>'issuing_service_contact')::text,
          COALESCE((elem->>'validity_period_months')::integer, 36),
          COALESCE((elem->>'administrative_status')::text, 'En attente'),
          COALESCE((elem->>'is_current')::boolean, true),
          (elem->>'permit_document_url')::text
        FROM jsonb_array_elements(NEW.building_permits) AS elem;
      END IF;

      -- Mettre à jour la contribution avec l'ID de la parcelle créée
      NEW.original_parcel_id = v_parcel_id;
    END IF;
  
  -- Si contribution de type "update", mettre à jour la parcelle existante
  ELSIF NEW.contribution_type = 'update' AND NEW.original_parcel_id IS NOT NULL THEN
    UPDATE cadastral_parcels SET
      property_title_type = COALESCE(NEW.property_title_type, property_title_type),
      title_reference_number = COALESCE(NEW.title_reference_number, title_reference_number),
      current_owner_name = COALESCE(NEW.current_owner_name, current_owner_name),
      current_owner_legal_status = COALESCE(NEW.current_owner_legal_status, current_owner_legal_status),
      current_owner_since = COALESCE(NEW.current_owner_since, current_owner_since),
      area_sqm = COALESCE(NEW.area_sqm, area_sqm),
      area_hectares = CASE WHEN NEW.area_sqm IS NOT NULL THEN NEW.area_sqm / 10000.0 ELSE area_hectares END,
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
      latitude = CASE 
        WHEN NEW.gps_coordinates IS NOT NULL AND jsonb_array_length(NEW.gps_coordinates) > 0 
        THEN (NEW.gps_coordinates->0->>'lat')::numeric 
        ELSE latitude 
      END,
      longitude = CASE 
        WHEN NEW.gps_coordinates IS NOT NULL AND jsonb_array_length(NEW.gps_coordinates) > 0 
        THEN (NEW.gps_coordinates->0->>'lng')::numeric 
        ELSE longitude 
      END,
      parcel_sides = COALESCE(NEW.parcel_sides, parcel_sides),
      construction_type = COALESCE(NEW.construction_type, construction_type),
      construction_nature = COALESCE(NEW.construction_nature, construction_nature),
      declared_usage = COALESCE(NEW.declared_usage, declared_usage),
      lease_type = COALESCE(NEW.lease_type, lease_type),
      whatsapp_number = COALESCE(NEW.whatsapp_number, whatsapp_number),
      owner_document_url = COALESCE(NEW.owner_document_url, owner_document_url),
      property_title_document_url = COALESCE(NEW.property_title_document_url, property_title_document_url),
      updated_at = now()
    WHERE id = NEW.original_parcel_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger sur la table cadastral_contributions
DROP TRIGGER IF EXISTS trigger_create_parcel_on_approval ON cadastral_contributions;
CREATE TRIGGER trigger_create_parcel_on_approval
  BEFORE UPDATE ON cadastral_contributions
  FOR EACH ROW
  EXECUTE FUNCTION create_parcel_from_approved_contribution();
-- Fonction pour migrer manuellement une contribution approuvée vers une parcelle
CREATE OR REPLACE FUNCTION migrate_approved_contribution(contribution_id uuid)
RETURNS uuid AS $$
DECLARE
  v_parcel_id uuid;
  v_location text;
  v_contrib RECORD;
BEGIN
  -- Récupérer la contribution
  SELECT * INTO v_contrib FROM cadastral_contributions WHERE id = contribution_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contribution non trouvée';
  END IF;
  
  IF v_contrib.status != 'approved' THEN
    RAISE EXCEPTION 'La contribution doit être approuvée';
  END IF;

  -- Vérifier si la parcelle existe déjà
  SELECT id INTO v_parcel_id 
  FROM cadastral_parcels 
  WHERE parcel_number = v_contrib.parcel_number AND deleted_at IS NULL;

  IF v_parcel_id IS NOT NULL THEN
    RETURN v_parcel_id; -- Parcelle déjà existante
  END IF;

  -- Construire la localisation
  v_location := COALESCE(v_contrib.province, '') || 
                CASE WHEN v_contrib.ville IS NOT NULL THEN ', ' || v_contrib.ville ELSE '' END ||
                CASE WHEN v_contrib.commune IS NOT NULL THEN ', ' || v_contrib.commune ELSE '' END ||
                CASE WHEN v_contrib.quartier IS NOT NULL THEN ', ' || v_contrib.quartier ELSE '' END ||
                CASE WHEN v_contrib.avenue IS NOT NULL THEN ', ' || v_contrib.avenue ELSE '' END;

  -- Créer la parcelle
  INSERT INTO cadastral_parcels (
    parcel_number, parcel_type, property_title_type, title_reference_number,
    current_owner_name, current_owner_legal_status, current_owner_since,
    area_sqm, location, province, ville, commune, quartier, avenue,
    territoire, collectivite, groupement, village, circonscription_fonciere,
    gps_coordinates, latitude, longitude, nombre_bornes, parcel_sides,
    surface_calculee_bornes, construction_type, construction_nature,
    declared_usage, lease_type, whatsapp_number, owner_document_url,
    property_title_document_url
  ) VALUES (
    v_contrib.parcel_number, 'urbain',
    COALESCE(v_contrib.property_title_type, 'Certificat d''enregistrement'),
    v_contrib.title_reference_number,
    COALESCE(v_contrib.current_owner_name, 'Non spécifié'),
    COALESCE(v_contrib.current_owner_legal_status, 'Personne physique'),
    COALESCE(v_contrib.current_owner_since, CURRENT_DATE),
    COALESCE(v_contrib.area_sqm, 0), v_location,
    v_contrib.province, v_contrib.ville, v_contrib.commune,
    v_contrib.quartier, v_contrib.avenue, v_contrib.territoire,
    v_contrib.collectivite, v_contrib.groupement, v_contrib.village,
    COALESCE(v_contrib.circonscription_fonciere, 'Circonscription Foncière de Goma'),
    v_contrib.gps_coordinates,
    CASE 
      WHEN v_contrib.gps_coordinates IS NOT NULL AND jsonb_array_length(v_contrib.gps_coordinates) > 0 
      THEN (v_contrib.gps_coordinates->0->>'lat')::numeric 
      ELSE NULL 
    END,
    CASE 
      WHEN v_contrib.gps_coordinates IS NOT NULL AND jsonb_array_length(v_contrib.gps_coordinates) > 0 
      THEN (v_contrib.gps_coordinates->0->>'lng')::numeric 
      ELSE NULL 
    END,
    CASE 
      WHEN v_contrib.gps_coordinates IS NOT NULL 
      THEN jsonb_array_length(v_contrib.gps_coordinates) 
      ELSE 3 
    END,
    v_contrib.parcel_sides, v_contrib.area_sqm,
    v_contrib.construction_type, v_contrib.construction_nature,
    v_contrib.declared_usage, v_contrib.lease_type,
    v_contrib.whatsapp_number, v_contrib.owner_document_url,
    v_contrib.property_title_document_url
  )
  RETURNING id INTO v_parcel_id;

  -- Créer l'historique de propriété
  IF v_contrib.ownership_history IS NOT NULL THEN
    INSERT INTO cadastral_ownership_history (
      parcel_id, owner_name, legal_status, ownership_start_date, 
      ownership_end_date, mutation_type, ownership_document_url
    )
    SELECT 
      v_parcel_id,
      (elem->>'ownerName')::text,
      (elem->>'legalStatus')::text,
      (elem->>'startDate')::date,
      (elem->>'endDate')::date,
      (elem->>'mutationType')::text,
      (elem->>'documentUrl')::text
    FROM jsonb_array_elements(v_contrib.ownership_history) AS elem;
  END IF;

  -- Créer l'historique fiscal
  IF v_contrib.tax_history IS NOT NULL THEN
    INSERT INTO cadastral_tax_history (
      parcel_id, tax_year, amount_usd, payment_status, 
      payment_date, receipt_document_url
    )
    SELECT 
      v_parcel_id,
      (elem->>'taxYear')::integer,
      COALESCE((elem->>'amountUsd')::numeric, 0),
      COALESCE((elem->>'paymentStatus')::text, 'pending'),
      (elem->>'paymentDate')::date,
      (elem->>'receiptUrl')::text
    FROM jsonb_array_elements(v_contrib.tax_history) AS elem;
  END IF;

  -- Créer l'historique des hypothèques
  IF v_contrib.mortgage_history IS NOT NULL THEN
    INSERT INTO cadastral_mortgages (
      parcel_id, creditor_name, creditor_type, mortgage_amount_usd,
      contract_date, duration_months, mortgage_status
    )
    SELECT 
      v_parcel_id,
      (elem->>'creditorName')::text,
      COALESCE((elem->>'creditorType')::text, 'Banque'),
      COALESCE((elem->>'mortgageAmountUsd')::numeric, 0),
      COALESCE((elem->>'contractDate')::date, CURRENT_DATE),
      COALESCE((elem->>'durationMonths')::integer, 12),
      COALESCE((elem->>'mortgageStatus')::text, 'Active')
    FROM jsonb_array_elements(v_contrib.mortgage_history) AS elem;
  END IF;

  -- Créer l'historique des bornages
  IF v_contrib.boundary_history IS NOT NULL THEN
    INSERT INTO cadastral_boundary_history (
      parcel_id, survey_date, surveyor_name, boundary_purpose,
      pv_reference_number, boundary_document_url
    )
    SELECT 
      v_parcel_id,
      COALESCE((elem->>'surveyDate')::date, CURRENT_DATE),
      (elem->>'surveyorName')::text,
      (elem->>'boundaryPurpose')::text,
      (elem->>'pvReferenceNumber')::text,
      (elem->>'documentUrl')::text
    FROM jsonb_array_elements(v_contrib.boundary_history) AS elem;
  END IF;

  -- Créer les permis de construire
  IF v_contrib.building_permits IS NOT NULL THEN
    INSERT INTO cadastral_building_permits (
      parcel_id, permit_number, issue_date, issuing_service,
      issuing_service_contact, validity_period_months, 
      administrative_status, is_current, permit_document_url
    )
    SELECT 
      v_parcel_id,
      (elem->>'permitNumber')::text,
      COALESCE((elem->>'issueDate')::date, CURRENT_DATE),
      (elem->>'issuingService')::text,
      (elem->>'issuingServiceContact')::text,
      COALESCE((elem->>'validityMonths')::integer, 36),
      COALESCE((elem->>'administrativeStatus')::text, 'En attente'),
      COALESCE((elem->>'isCurrent')::boolean, true),
      (elem->>'attachmentUrl')::text
    FROM jsonb_array_elements(v_contrib.building_permits) AS elem;
  END IF;

  -- Mettre à jour la contribution avec l'ID de la parcelle
  UPDATE cadastral_contributions SET original_parcel_id = v_parcel_id WHERE id = contribution_id;

  RETURN v_parcel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migrer toutes les contributions approuvées
DO $$
DECLARE
  contrib_rec RECORD;
  parcel_id uuid;
BEGIN
  FOR contrib_rec IN 
    SELECT id, parcel_number FROM cadastral_contributions 
    WHERE status = 'approved' 
    AND contribution_type = 'new'
    AND NOT EXISTS (
      SELECT 1 FROM cadastral_parcels 
      WHERE parcel_number = cadastral_contributions.parcel_number 
      AND deleted_at IS NULL
    )
  LOOP
    BEGIN
      SELECT migrate_approved_contribution(contrib_rec.id) INTO parcel_id;
      RAISE NOTICE 'Parcelle créée pour contribution % : %', contrib_rec.id, contrib_rec.parcel_number;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erreur lors de la migration de % : %', contrib_rec.parcel_number, SQLERRM;
    END;
  END LOOP;
END $$;
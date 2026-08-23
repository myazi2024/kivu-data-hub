
ALTER TABLE public.cadastral_parcels
  ADD COLUMN IF NOT EXISTS is_rented BOOLEAN,
  ADD COLUMN IF NOT EXISTS market_listings JSONB,
  ADD COLUMN IF NOT EXISTS resale_price_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS resale_price_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS resale_price_currency TEXT,
  ADD COLUMN IF NOT EXISTS would_sell_if_offered BOOLEAN,
  ADD COLUMN IF NOT EXISTS has_recent_appraisal BOOLEAN,
  ADD COLUMN IF NOT EXISTS appraisal_date DATE,
  ADD COLUMN IF NOT EXISTS appraiser_name TEXT,
  ADD COLUMN IF NOT EXISTS appraised_value_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS appraised_value_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS appraised_value_currency TEXT,
  ADD COLUMN IF NOT EXISTS appraisal_report_url TEXT;

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
        property_title_document_url, whatsapp_number, parcel_sides,
        construction_year, floor_number, sound_environment,
        is_rented, rental_configuration, rental_units_count, rental_units,
        monthly_rent_usd, rental_start_date, is_occupied, occupant_count, hosting_capacity,
        market_listings, would_sell_if_offered, resale_price_usd, resale_price_amount, resale_price_currency,
        has_recent_appraisal, appraisal_date, appraiser_name,
        appraised_value_usd, appraised_value_amount, appraised_value_currency, appraisal_report_url
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
        NEW.whatsapp_number, NEW.parcel_sides,
        NEW.construction_year, NEW.floor_number, NEW.sound_environment,
        COALESCE(NEW.is_rented, NEW.declared_usage = 'location'),
        NEW.rental_configuration, NEW.rental_units_count, NEW.rental_units,
        NEW.monthly_rent_usd, NEW.rental_start_date, NEW.is_occupied, NEW.occupant_count, NEW.hosting_capacity,
        NEW.market_listings, NEW.would_sell_if_offered, NEW.resale_price_usd, NEW.resale_price_amount, NEW.resale_price_currency,
        NEW.has_recent_appraisal, NEW.appraisal_date, NEW.appraiser_name,
        NEW.appraised_value_usd, NEW.appraised_value_amount, NEW.appraised_value_currency, NEW.appraisal_report_url
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
        construction_year = COALESCE(NEW.construction_year, construction_year),
        floor_number = COALESCE(NEW.floor_number, floor_number),
        sound_environment = COALESCE(NEW.sound_environment, sound_environment),
        is_rented = COALESCE(NEW.is_rented, NEW.declared_usage = 'location', is_rented),
        rental_configuration = COALESCE(NEW.rental_configuration, rental_configuration),
        rental_units_count = COALESCE(NEW.rental_units_count, rental_units_count),
        rental_units = COALESCE(NEW.rental_units, rental_units),
        monthly_rent_usd = COALESCE(NEW.monthly_rent_usd, monthly_rent_usd),
        rental_start_date = COALESCE(NEW.rental_start_date, rental_start_date),
        is_occupied = COALESCE(NEW.is_occupied, is_occupied),
        occupant_count = COALESCE(NEW.occupant_count, occupant_count),
        hosting_capacity = COALESCE(NEW.hosting_capacity, hosting_capacity),
        market_listings = COALESCE(NEW.market_listings, market_listings),
        would_sell_if_offered = COALESCE(NEW.would_sell_if_offered, would_sell_if_offered),
        resale_price_usd = COALESCE(NEW.resale_price_usd, resale_price_usd),
        resale_price_amount = COALESCE(NEW.resale_price_amount, resale_price_amount),
        resale_price_currency = COALESCE(NEW.resale_price_currency, resale_price_currency),
        has_recent_appraisal = COALESCE(NEW.has_recent_appraisal, has_recent_appraisal),
        appraisal_date = COALESCE(NEW.appraisal_date, appraisal_date),
        appraiser_name = COALESCE(NEW.appraiser_name, appraiser_name),
        appraised_value_usd = COALESCE(NEW.appraised_value_usd, appraised_value_usd),
        appraised_value_amount = COALESCE(NEW.appraised_value_amount, appraised_value_amount),
        appraised_value_currency = COALESCE(NEW.appraised_value_currency, appraised_value_currency),
        appraisal_report_url = COALESCE(NEW.appraisal_report_url, appraisal_report_url),
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
    ELSIF NOT EXISTS (
      SELECT 1 FROM cadastral_parcels
      WHERE parcel_number = NEW.parcel_number AND deleted_at IS NULL
    ) THEN
      INSERT INTO cadastral_parcels (
        parcel_number, parcel_type, location, area_sqm,
        current_owner_name, current_owner_since, current_owner_legal_status,
        property_title_type, property_title_document_url, title_reference_number,
        owner_document_url, construction_type, construction_nature, declared_usage, lease_type,
        province, ville, commune, quartier, avenue,
        territoire, collectivite, groupement, village,
        gps_coordinates, parcel_sides, whatsapp_number,
        construction_year, floor_number, sound_environment,
        is_rented, rental_configuration, rental_units_count, rental_units,
        monthly_rent_usd, rental_start_date, is_occupied, occupant_count, hosting_capacity,
        market_listings, would_sell_if_offered, resale_price_usd, resale_price_amount, resale_price_currency,
        has_recent_appraisal, appraisal_date, appraiser_name,
        appraised_value_usd, appraised_value_amount, appraised_value_currency, appraisal_report_url
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
        NEW.province, NEW.ville, NEW.commune, NEW.quartier, NEW.avenue,
        NEW.territoire, NEW.collectivite, NEW.groupement, NEW.village,
        NEW.gps_coordinates, NEW.parcel_sides, NEW.whatsapp_number,
        NEW.construction_year, NEW.floor_number, NEW.sound_environment,
        COALESCE(NEW.is_rented, NEW.declared_usage = 'location'),
        NEW.rental_configuration, NEW.rental_units_count, NEW.rental_units,
        NEW.monthly_rent_usd, NEW.rental_start_date, NEW.is_occupied, NEW.occupant_count, NEW.hosting_capacity,
        NEW.market_listings, NEW.would_sell_if_offered, NEW.resale_price_usd, NEW.resale_price_amount, NEW.resale_price_currency,
        NEW.has_recent_appraisal, NEW.appraisal_date, NEW.appraiser_name,
        NEW.appraised_value_usd, NEW.appraised_value_amount, NEW.appraised_value_currency, NEW.appraisal_report_url
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

CREATE OR REPLACE FUNCTION public.validate_contribution_completeness(contribution_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contribution RECORD;
  v_errors JSONB := '[]'::JSONB;
  v_warnings JSONB := '[]'::JSONB;
  v_units JSONB;
  v_units_len INT := 0;
  v_units_total NUMERIC := 0;
  v_listing JSONB;
  v_idx INT := 0;
  v_score INT;
  v_is_rented BOOLEAN;
BEGIN
  SELECT * INTO v_contribution FROM cadastral_contributions WHERE id = contribution_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'errors', jsonb_build_array('Contribution non trouvée'), 'warnings', '[]'::JSONB, 'completeness_score', 0);
  END IF;

  v_is_rented := COALESCE(v_contribution.is_rented, v_contribution.declared_usage = 'location', false);

  IF v_contribution.parcel_number IS NULL OR v_contribution.parcel_number = '' THEN v_errors := v_errors || jsonb_build_array('Numéro de parcelle requis'); END IF;
  IF v_contribution.property_title_type IS NULL THEN v_errors := v_errors || jsonb_build_array('Type de titre foncier requis'); END IF;
  IF v_contribution.current_owner_name IS NULL OR v_contribution.current_owner_name = '' THEN v_errors := v_errors || jsonb_build_array('Nom du propriétaire actuel requis'); END IF;
  IF v_contribution.area_sqm IS NULL OR v_contribution.area_sqm <= 0 THEN v_errors := v_errors || jsonb_build_array('Superficie requise et doit être positive'); END IF;
  IF v_contribution.province IS NULL OR v_contribution.province = '' THEN v_errors := v_errors || jsonb_build_array('Province requise'); END IF;

  IF v_contribution.property_title_document_url IS NULL THEN v_warnings := v_warnings || jsonb_build_array('Document de titre foncier non fourni'); END IF;
  IF v_contribution.owner_document_url IS NULL THEN v_warnings := v_warnings || jsonb_build_array('Document d''identité du propriétaire non fourni'); END IF;
  IF v_contribution.gps_coordinates IS NULL THEN v_warnings := v_warnings || jsonb_build_array('Coordonnées GPS non fournies'); END IF;
  IF v_contribution.ownership_history IS NULL THEN v_warnings := v_warnings || jsonb_build_array('Historique de propriété non fourni'); END IF;
  IF v_contribution.boundary_history IS NULL THEN v_warnings := v_warnings || jsonb_build_array('Historique des bornages non fourni'); END IF;
  IF v_contribution.tax_history IS NULL THEN v_warnings := v_warnings || jsonb_build_array('Historique des taxes non fourni'); END IF;

  IF v_is_rented AND v_contribution.rental_configuration IS NULL THEN
    v_warnings := v_warnings || jsonb_build_array('Bien déclaré en location sans mode de mise en location renseigné');
  END IF;

  IF NOT v_is_rented AND v_contribution.rental_configuration IS NOT NULL THEN
    v_warnings := v_warnings || jsonb_build_array('Mode de mise en location renseigné alors que le bien n''est pas déclaré en location');
  END IF;

  IF v_is_rented AND v_contribution.rental_configuration = 'multi' THEN
    v_units := CASE WHEN jsonb_typeof(v_contribution.rental_units) = 'array' THEN v_contribution.rental_units ELSE '[]'::JSONB END;
    v_units_len := jsonb_array_length(v_units);

    IF v_units_len = 0 THEN
      v_warnings := v_warnings || jsonb_build_array('Mode « plusieurs locaux » sans aucun local détaillé');
    ELSE
      IF v_contribution.rental_units_count IS NOT NULL AND v_contribution.rental_units_count <> v_units_len THEN
        v_warnings := v_warnings || jsonb_build_array('Nombre de locaux déclaré différent du nombre de locaux détaillés');
      END IF;

      SELECT COALESCE(SUM(COALESCE((u->>'monthly_rent_usd')::NUMERIC, 0)), 0)
        INTO v_units_total
        FROM jsonb_array_elements(v_units) AS u;

      IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_units) AS u
        WHERE COALESCE((u->>'monthly_rent_usd')::NUMERIC, 0) <= 0
      ) THEN
        v_warnings := v_warnings || jsonb_build_array('Au moins un local est déclaré sans loyer mensuel valide');
      END IF;

      IF COALESCE(v_contribution.monthly_rent_usd, 0) > 0
         AND ABS(COALESCE(v_contribution.monthly_rent_usd, 0) - v_units_total) > 0.5 THEN
        v_warnings := v_warnings || jsonb_build_array('Loyer global déclaré différent de la somme des loyers des locaux');
      END IF;
    END IF;
  END IF;

  IF v_is_rented AND COALESCE(v_contribution.rental_configuration, 'single') = 'single'
     AND COALESCE(v_contribution.monthly_rent_usd, 0) <= 0 THEN
    v_warnings := v_warnings || jsonb_build_array('Bien en location (un seul local) sans loyer mensuel renseigné');
  END IF;

  IF v_contribution.has_recent_appraisal IS TRUE AND v_contribution.appraisal_date IS NULL THEN
    v_warnings := v_warnings || jsonb_build_array('Expertise récente déclarée sans date d''expertise');
  END IF;
  IF v_contribution.appraisal_date IS NOT NULL AND v_contribution.appraisal_date > CURRENT_DATE THEN
    v_warnings := v_warnings || jsonb_build_array('La date d''expertise est postérieure à aujourd''hui');
  END IF;
  IF v_contribution.would_sell_if_offered IS TRUE AND COALESCE(v_contribution.resale_price_usd, 0) <= 0 THEN
    v_warnings := v_warnings || jsonb_build_array('Disposition à vendre déclarée sans prix de revente estimé');
  END IF;

  IF jsonb_typeof(v_contribution.market_listings) = 'array' THEN
    FOR v_listing IN SELECT * FROM jsonb_array_elements(v_contribution.market_listings) LOOP
      v_idx := v_idx + 1;
      IF COALESCE((v_listing->>'listForRent')::BOOLEAN, false) THEN
        IF jsonb_typeof(v_listing->'coverImageUrls') <> 'array'
           OR jsonb_array_length(COALESCE(v_listing->'coverImageUrls', '[]'::JSONB)) = 0 THEN
          v_warnings := v_warnings || jsonb_build_array('Annonce #' || v_idx || ' sans photo de couverture');
        END IF;
        IF COALESCE(v_listing->>'contactValue', '') = '' THEN
          v_warnings := v_warnings || jsonb_build_array('Annonce #' || v_idx || ' sans coordonnée de contact');
        END IF;
      END IF;
    END LOOP;
  END IF;

  v_score := GREATEST(0, 100 - (jsonb_array_length(v_warnings) * 8));

  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_errors) = 0,
    'errors', v_errors,
    'warnings', v_warnings,
    'completeness_score', v_score
  );
END;
$function$;

-- 1. Colonne manquante côté parcelles
ALTER TABLE public.cadastral_parcels
  ADD COLUMN IF NOT EXISTS current_owners_details jsonb;

-- 2. Normalisation de l'usage déclaré (migration des anciennes valeurs « location »)
CREATE OR REPLACE FUNCTION public.normalize_declared_usage(p_usage text, p_construction_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_usage IS NULL THEN NULL
    WHEN lower(p_usage) <> 'location' THEN p_usage
    WHEN p_construction_type = 'Commerciale' THEN 'Commerce'
    WHEN p_construction_type = 'Industrielle' THEN 'Industrie'
    WHEN p_construction_type = 'Agricole' THEN 'Agriculture'
    ELSE 'Habitation'
  END
$$;

-- 3. Chemin d'écriture unique : suppression du trigger BEFORE concurrent
DROP TRIGGER IF EXISTS trigger_create_parcel_on_approval ON public.cadastral_contributions;
DROP FUNCTION IF EXISTS public.create_parcel_from_approved_contribution();

-- 4. Fonction de synchronisation unique (création + mise à jour), complétée
CREATE OR REPLACE FUNCTION public.sync_approved_contribution_to_parcel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_parcel_id UUID;
  v_usage TEXT;
  v_is_rented BOOLEAN;
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    v_usage := public.normalize_declared_usage(NEW.declared_usage, NEW.construction_type);
    v_is_rented := COALESCE(NEW.is_rented, lower(COALESCE(NEW.declared_usage, '')) = 'location');

    IF NEW.original_parcel_id IS NOT NULL THEN
      UPDATE cadastral_parcels
      SET
        parcel_number = NEW.parcel_number,
        parcel_type = COALESCE(
          CASE
            WHEN NEW.province IS NOT NULL AND NEW.ville IS NOT NULL THEN 'urbain'
            WHEN NEW.province IS NOT NULL AND NEW.territoire IS NOT NULL THEN 'rural'
            ELSE parcel_type
          END, parcel_type),
        location = COALESCE(NEW.ville, NEW.territoire, location),
        area_sqm = COALESCE(NEW.area_sqm, area_sqm),
        current_owner_name = COALESCE(NEW.current_owner_name, current_owner_name),
        current_owner_since = COALESCE(NEW.current_owner_since, current_owner_since),
        current_owner_legal_status = COALESCE(NEW.current_owner_legal_status, current_owner_legal_status),
        current_owners_details = COALESCE(NEW.current_owners_details, current_owners_details),
        property_title_type = COALESCE(NEW.property_title_type, property_title_type),
        property_title_document_url = COALESCE(NEW.property_title_document_url, property_title_document_url),
        title_reference_number = COALESCE(NEW.title_reference_number, title_reference_number),
        title_issue_date = COALESCE(NEW.title_issue_date, title_issue_date),
        is_title_in_current_owner_name = COALESCE(NEW.is_title_in_current_owner_name, is_title_in_current_owner_name),
        owner_document_url = COALESCE(NEW.owner_document_url, owner_document_url),
        construction_type = COALESCE(NEW.construction_type, construction_type),
        construction_nature = COALESCE(NEW.construction_nature, construction_nature),
        construction_materials = COALESCE(NEW.construction_materials, construction_materials),
        property_category = COALESCE(NEW.property_category, property_category),
        standing = COALESCE(NEW.standing, standing),
        house_number = COALESCE(NEW.house_number, house_number),
        apartment_number = COALESCE(NEW.apartment_number, apartment_number),
        declared_usage = COALESCE(v_usage, declared_usage),
        lease_type = COALESCE(NEW.lease_type, lease_type),
        lease_years = COALESCE(NEW.lease_years, lease_years),
        construction_year = COALESCE(NEW.construction_year, construction_year),
        floor_number = COALESCE(NEW.floor_number, floor_number),
        sound_environment = COALESCE(NEW.sound_environment, sound_environment),
        nearby_noise_sources = COALESCE(NEW.nearby_noise_sources, nearby_noise_sources),
        additional_constructions = COALESCE(NEW.additional_constructions, additional_constructions),
        building_shapes = COALESCE(NEW.building_shapes, building_shapes),
        road_sides = COALESCE(NEW.road_sides, road_sides),
        servitude_data = COALESCE(NEW.servitude_data, servitude_data),
        has_dispute = COALESCE(NEW.has_dispute, has_dispute),
        dispute_data = COALESCE(NEW.dispute_data, dispute_data),
        is_rented = COALESCE(v_is_rented, is_rented),
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
        current_owner_name, current_owner_since, current_owner_legal_status, current_owners_details,
        property_title_type, property_title_document_url, title_reference_number, title_issue_date,
        is_title_in_current_owner_name, owner_document_url,
        construction_type, construction_nature, construction_materials,
        property_category, standing, house_number, apartment_number,
        declared_usage, lease_type, lease_years,
        province, ville, commune, quartier, avenue,
        territoire, collectivite, groupement, village,
        gps_coordinates, parcel_sides, road_sides, whatsapp_number,
        nombre_bornes, surface_calculee_bornes,
        construction_year, floor_number, sound_environment, nearby_noise_sources,
        additional_constructions, building_shapes, servitude_data, has_dispute, dispute_data,
        is_rented, rental_configuration, rental_units_count, rental_units,
        monthly_rent_usd, rental_start_date, is_occupied, occupant_count, hosting_capacity,
        market_listings, would_sell_if_offered, resale_price_usd, resale_price_amount, resale_price_currency,
        has_recent_appraisal, appraisal_date, appraiser_name,
        appraised_value_usd, appraised_value_amount, appraised_value_currency, appraisal_report_url
      ) VALUES (
        NEW.parcel_number,
        COALESCE(NEW.parcel_type, CASE WHEN NEW.ville IS NOT NULL THEN 'urbain'
                                       WHEN NEW.territoire IS NOT NULL THEN 'rural'
                                       ELSE 'urbain' END),
        COALESCE(NEW.ville, NEW.territoire, NEW.province, 'Non spécifié'),
        COALESCE(NEW.area_sqm, 0),
        COALESCE(NEW.current_owner_name, 'Propriétaire non spécifié'),
        COALESCE(NEW.current_owner_since, CURRENT_DATE),
        COALESCE(NEW.current_owner_legal_status, 'Personne physique'),
        NEW.current_owners_details,
        COALESCE(NEW.property_title_type, 'Certificat d''enregistrement'),
        NEW.property_title_document_url, NEW.title_reference_number, NEW.title_issue_date,
        NEW.is_title_in_current_owner_name, NEW.owner_document_url,
        NEW.construction_type, NEW.construction_nature, NEW.construction_materials,
        NEW.property_category, NEW.standing, NEW.house_number, NEW.apartment_number,
        v_usage, NEW.lease_type, NEW.lease_years,
        NEW.province, NEW.ville, NEW.commune, NEW.quartier, NEW.avenue,
        NEW.territoire, NEW.collectivite, NEW.groupement, NEW.village,
        NEW.gps_coordinates, NEW.parcel_sides, NEW.road_sides, NEW.whatsapp_number,
        CASE WHEN NEW.gps_coordinates IS NOT NULL THEN jsonb_array_length(NEW.gps_coordinates) ELSE NULL END,
        CASE WHEN NEW.gps_coordinates IS NOT NULL THEN calculate_surface_from_coordinates(NEW.gps_coordinates) ELSE NULL END,
        NEW.construction_year, NEW.floor_number, NEW.sound_environment, NEW.nearby_noise_sources,
        NEW.additional_constructions, NEW.building_shapes, NEW.servitude_data, NEW.has_dispute, NEW.dispute_data,
        v_is_rented,
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

-- 5. Valeur CCC : prise en compte des blocs locatif, valeur marchande et qualification du bâti
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
  v_is_rented BOOLEAN := false;
BEGIN
  SELECT * INTO contrib FROM public.cadastral_contributions WHERE id = contribution_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  is_urban := (contrib.parcel_type = 'SU' OR contrib.parcel_type = 'urbain');
  v_is_rented := COALESCE(contrib.is_rented, lower(COALESCE(contrib.declared_usage, '')) = 'location');

  total_fields := total_fields + 1;
  filled_fields := filled_fields + 1;

  -- SECTION 2: General
  total_fields := total_fields + 14;
  IF contrib.property_title_type IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.property_title_type = 'Contrat de location (Contrat d''occupation provisoire)' THEN
    total_fields := total_fields + 1;
    IF contrib.lease_type IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  END IF;
  IF contrib.title_reference_number IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.current_owners_details IS NOT NULL AND jsonb_array_length(contrib.current_owners_details) > 0 THEN
    filled_fields := filled_fields + 3;
  ELSIF contrib.current_owner_name IS NOT NULL THEN
    filled_fields := filled_fields + 1;
  END IF;
  IF contrib.current_owner_since IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.area_sqm IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.property_category IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.construction_type IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.construction_nature IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.declared_usage IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.construction_materials IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.standing IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;

  -- Qualification du bâti (nouveaux champs)
  total_fields := total_fields + 4;
  IF contrib.construction_year IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.sound_environment IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.building_shapes IS NOT NULL AND jsonb_array_length(contrib.building_shapes) > 0 THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.additional_constructions IS NOT NULL AND jsonb_array_length(contrib.additional_constructions) > 0 THEN filled_fields := filled_fields + 1; END IF;

  -- Bloc locatif
  total_fields := total_fields + 1;
  IF contrib.is_rented IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF v_is_rented THEN
    total_fields := total_fields + 4;
    IF contrib.rental_configuration IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF COALESCE(contrib.monthly_rent_usd, 0) > 0 THEN filled_fields := filled_fields + 1; END IF;
    IF contrib.is_occupied IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF COALESCE(contrib.hosting_capacity, 0) > 0 OR COALESCE(contrib.occupant_count, 0) > 0 THEN filled_fields := filled_fields + 1; END IF;
    IF contrib.rental_configuration = 'multi' THEN
      total_fields := total_fields + 1;
      IF contrib.rental_units IS NOT NULL AND jsonb_typeof(contrib.rental_units) = 'array'
         AND jsonb_array_length(contrib.rental_units) > 0 THEN filled_fields := filled_fields + 1; END IF;
    END IF;
  END IF;

  -- Valeur marchande
  total_fields := total_fields + 2;
  IF contrib.would_sell_if_offered IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.has_recent_appraisal IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF contrib.would_sell_if_offered IS TRUE THEN
    total_fields := total_fields + 1;
    IF COALESCE(contrib.resale_price_usd, 0) > 0 THEN filled_fields := filled_fields + 1; END IF;
  END IF;
  IF contrib.has_recent_appraisal IS TRUE THEN
    total_fields := total_fields + 2;
    IF contrib.appraisal_date IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF COALESCE(contrib.appraised_value_usd, 0) > 0 THEN filled_fields := filled_fields + 1; END IF;
  END IF;
  IF contrib.market_listings IS NOT NULL AND jsonb_typeof(contrib.market_listings) = 'array'
     AND jsonb_array_length(contrib.market_listings) > 0 THEN
    total_fields := total_fields + 1;
    filled_fields := filled_fields + 1;
  END IF;

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
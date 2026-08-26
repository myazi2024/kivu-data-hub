ALTER TABLE public.cadastral_contributions ADD COLUMN IF NOT EXISTS sale_listing jsonb;
ALTER TABLE public.cadastral_parcels ADD COLUMN IF NOT EXISTS sale_listing jsonb;
ALTER TABLE public.cadastral_parcels ADD COLUMN IF NOT EXISTS permit_request_data jsonb;

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
  v_item JSONB;
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
        sale_listing = COALESCE(NEW.sale_listing, sale_listing),
        permit_request_data = COALESCE(NEW.permit_request_data, permit_request_data),
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

      v_parcel_id := NEW.original_parcel_id;

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
        market_listings, sale_listing, permit_request_data,
        would_sell_if_offered, resale_price_usd, resale_price_amount, resale_price_currency,
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
        NEW.market_listings, NEW.sale_listing, NEW.permit_request_data,
        NEW.would_sell_if_offered, NEW.resale_price_usd, NEW.resale_price_amount, NEW.resale_price_currency,
        NEW.has_recent_appraisal, NEW.appraisal_date, NEW.appraiser_name,
        NEW.appraised_value_usd, NEW.appraised_value_amount, NEW.appraised_value_currency, NEW.appraisal_report_url
      )
      RETURNING id INTO v_parcel_id;

      UPDATE cadastral_contributions
      SET original_parcel_id = v_parcel_id
      WHERE id = NEW.id;
    END IF;

    -- Alimentation des tables normalisées (anti-doublon par clé métier)
    IF v_parcel_id IS NOT NULL THEN

      IF jsonb_typeof(NEW.ownership_history) = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.ownership_history) LOOP
          IF COALESCE(v_item->>'owner_name', '') <> ''
             AND COALESCE(v_item->>'ownership_start_date', '') <> ''
             AND NOT EXISTS (
               SELECT 1 FROM cadastral_ownership_history h
               WHERE h.parcel_id = v_parcel_id
                 AND h.owner_name = v_item->>'owner_name'
                 AND h.ownership_start_date = (v_item->>'ownership_start_date')::date
             ) THEN
            INSERT INTO cadastral_ownership_history (
              parcel_id, owner_name, legal_status, ownership_start_date,
              ownership_end_date, mutation_type, ownership_document_url
            ) VALUES (
              v_parcel_id,
              v_item->>'owner_name',
              v_item->>'legal_status',
              (v_item->>'ownership_start_date')::date,
              NULLIF(v_item->>'ownership_end_date', '')::date,
              v_item->>'mutation_type',
              NULLIF(v_item->>'ownership_document_url', '')
            );
          END IF;
        END LOOP;
      END IF;

      IF jsonb_typeof(NEW.boundary_history) = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.boundary_history) LOOP
          IF COALESCE(v_item->>'pv_reference_number', '') <> ''
             AND COALESCE(v_item->>'survey_date', '') <> ''
             AND NOT EXISTS (
               SELECT 1 FROM cadastral_boundary_history b
               WHERE b.parcel_id = v_parcel_id
                 AND b.pv_reference_number = v_item->>'pv_reference_number'
             ) THEN
            INSERT INTO cadastral_boundary_history (
              parcel_id, pv_reference_number, boundary_purpose, surveyor_name,
              survey_date, boundary_document_url
            ) VALUES (
              v_parcel_id,
              v_item->>'pv_reference_number',
              COALESCE(NULLIF(v_item->>'boundary_purpose', ''), 'Non spécifié'),
              COALESCE(NULLIF(v_item->>'surveyor_name', ''), 'Non spécifié'),
              (v_item->>'survey_date')::date,
              NULLIF(v_item->>'boundary_document_url', '')
            );
          END IF;
        END LOOP;
      END IF;

      IF jsonb_typeof(NEW.tax_history) = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.tax_history) LOOP
          IF COALESCE(v_item->>'tax_year', '') <> ''
             AND NOT EXISTS (
               SELECT 1 FROM cadastral_tax_history t
               WHERE t.parcel_id = v_parcel_id
                 AND t.tax_year = (v_item->>'tax_year')::int
                 AND t.amount_usd = COALESCE((NULLIF(v_item->>'amount_usd', ''))::numeric, 0)
             ) THEN
            INSERT INTO cadastral_tax_history (
              parcel_id, tax_year, amount_usd, payment_status, payment_date, receipt_document_url
            ) VALUES (
              v_parcel_id,
              (v_item->>'tax_year')::int,
              COALESCE((NULLIF(v_item->>'amount_usd', ''))::numeric, 0),
              COALESCE(NULLIF(v_item->>'payment_status', ''), 'pending'),
              NULLIF(v_item->>'payment_date', '')::date,
              NULLIF(v_item->>'receipt_document_url', '')
            );
          END IF;
        END LOOP;
      END IF;

      IF jsonb_typeof(NEW.mortgage_history) = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.mortgage_history) LOOP
          IF COALESCE(v_item->>'creditor_name', '') <> ''
             AND COALESCE(v_item->>'contract_date', '') <> ''
             AND NOT EXISTS (
               SELECT 1 FROM cadastral_mortgages m
               WHERE m.parcel_id = v_parcel_id
                 AND m.creditor_name = v_item->>'creditor_name'
                 AND m.contract_date = (v_item->>'contract_date')::date
             ) THEN
            INSERT INTO cadastral_mortgages (
              parcel_id, mortgage_amount_usd, duration_months, creditor_name,
              creditor_type, contract_date, mortgage_status
            ) VALUES (
              v_parcel_id,
              COALESCE((NULLIF(v_item->>'mortgage_amount_usd', ''))::numeric, 0),
              COALESCE((NULLIF(v_item->>'duration_months', ''))::int, 0),
              v_item->>'creditor_name',
              COALESCE(NULLIF(v_item->>'creditor_type', ''), 'Non spécifié'),
              (v_item->>'contract_date')::date,
              COALESCE(NULLIF(v_item->>'mortgage_status', ''), 'active')
            );
          END IF;
        END LOOP;
      END IF;

      IF jsonb_typeof(NEW.building_permits) = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.building_permits) LOOP
          IF COALESCE(v_item->>'permit_number', '') <> ''
             AND COALESCE(v_item->>'issue_date', '') <> ''
             AND NOT EXISTS (
               SELECT 1 FROM cadastral_building_permits p
               WHERE p.parcel_id = v_parcel_id
                 AND p.permit_number = v_item->>'permit_number'
             ) THEN
            INSERT INTO cadastral_building_permits (
              parcel_id, permit_number, issue_date, validity_period_months,
              issuing_service, issuing_service_contact, administrative_status,
              permit_document_url, is_current
            ) VALUES (
              v_parcel_id,
              v_item->>'permit_number',
              (v_item->>'issue_date')::date,
              COALESCE((NULLIF(v_item->>'validity_period_months', ''))::int, 0),
              COALESCE(NULLIF(v_item->>'issuing_service', ''), NULLIF(v_item->>'permit_type', ''), 'Non spécifié'),
              NULLIF(v_item->>'issuing_service_contact', ''),
              COALESCE(NULLIF(v_item->>'administrative_status', ''), 'valide'),
              NULLIF(v_item->>'permit_document_url', ''),
              COALESCE((NULLIF(v_item->>'is_current', ''))::boolean, true)
            );
          END IF;
        END LOOP;
      END IF;

    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
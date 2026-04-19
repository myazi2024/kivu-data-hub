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
        area_hectares = COALESCE(NEW.area_sqm / 10000, area_hectares),
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
        area_hectares,
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
        COALESCE(NEW.area_sqm / 10000, 0),
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
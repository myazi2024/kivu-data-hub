-- 1) sync_current_owner_name : safe DATE cast
CREATE OR REPLACE FUNCTION public.sync_current_owner_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_obj jsonb;
  since_text text;
  since_date date;
BEGIN
  IF NEW.current_owners_details IS NOT NULL
     AND jsonb_typeof(NEW.current_owners_details) = 'array'
     AND jsonb_array_length(NEW.current_owners_details) > 0 THEN

    NEW.current_owner_name := public.extract_owner_names_from_details(NEW.current_owners_details);

    owner_obj := NEW.current_owners_details -> 0;

    IF owner_obj ? 'legalStatus' AND NULLIF(owner_obj->>'legalStatus','') IS NOT NULL THEN
      NEW.current_owner_legal_status := owner_obj->>'legalStatus';
    END IF;

    IF owner_obj ? 'since' THEN
      since_text := NULLIF(owner_obj->>'since','');
      IF since_text IS NOT NULL THEN
        BEGIN
          since_date := since_text::date;
          NEW.current_owner_since := since_date;
        EXCEPTION WHEN others THEN
          -- ignore invalid date silently to avoid blocking the insert
          NULL;
        END;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) auto_generate_ccc_code : guard against INSERT (OLD is NULL)
CREATE OR REPLACE FUNCTION public.auto_generate_ccc_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'approved'
     AND (OLD.status IS DISTINCT FROM 'approved') THEN
    PERFORM public.generate_cadastral_contributor_code(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Normalize empty strings to NULL on insert/update
CREATE OR REPLACE FUNCTION public.normalize_contribution_empty_strings()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.title_issue_date IS NOT NULL AND NEW.title_issue_date::text = '' THEN
    NEW.title_issue_date := NULL;
  END IF;
  IF NEW.current_owner_since IS NOT NULL AND NEW.current_owner_since::text = '' THEN
    NEW.current_owner_since := NULL;
  END IF;
  IF NEW.rental_start_date IS NOT NULL AND NEW.rental_start_date::text = '' THEN
    NEW.rental_start_date := NULL;
  END IF;

  -- Trim text columns that drive cascading picklists
  NEW.property_title_type     := NULLIF(btrim(coalesce(NEW.property_title_type,'')), '');
  NEW.lease_type              := NULLIF(btrim(coalesce(NEW.lease_type,'')), '');
  NEW.property_category       := NULLIF(btrim(coalesce(NEW.property_category,'')), '');
  NEW.construction_type       := NULLIF(btrim(coalesce(NEW.construction_type,'')), '');
  NEW.construction_nature     := NULLIF(btrim(coalesce(NEW.construction_nature,'')), '');
  NEW.construction_materials  := NULLIF(btrim(coalesce(NEW.construction_materials,'')), '');
  NEW.declared_usage          := NULLIF(btrim(coalesce(NEW.declared_usage,'')), '');
  NEW.standing                := NULLIF(btrim(coalesce(NEW.standing,'')), '');
  NEW.apartment_number        := NULLIF(btrim(coalesce(NEW.apartment_number,'')), '');
  NEW.floor_number            := NULLIF(btrim(coalesce(NEW.floor_number,'')), '');
  NEW.house_number            := NULLIF(btrim(coalesce(NEW.house_number,'')), '');
  NEW.title_reference_number  := NULLIF(btrim(coalesce(NEW.title_reference_number,'')), '');
  NEW.sound_environment       := NULLIF(btrim(coalesce(NEW.sound_environment,'')), '');
  NEW.nearby_noise_sources    := NULLIF(btrim(coalesce(NEW.nearby_noise_sources,'')), '');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_normalize_contribution_empty_strings ON public.cadastral_contributions;
CREATE TRIGGER trigger_normalize_contribution_empty_strings
BEFORE INSERT OR UPDATE ON public.cadastral_contributions
FOR EACH ROW
EXECUTE FUNCTION public.normalize_contribution_empty_strings();
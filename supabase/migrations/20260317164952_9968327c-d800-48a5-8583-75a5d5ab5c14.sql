
-- Fix Bug 9: Skip TEST- prefixed parcel numbers in the format trigger
-- This prevents TEST-001-xxx from becoming SU/TEST-001-xxx
CREATE OR REPLACE FUNCTION public.format_parcel_number_with_prefix()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Skip TEST- prefixed parcels (test mode data)
  IF NEW.parcel_number LIKE 'TEST-%' OR NEW.parcel_number LIKE 'test-%' THEN
    RETURN NEW;
  END IF;

  -- Déterminer le préfixe basé sur parcel_type
  DECLARE
    prefix TEXT;
  BEGIN
    -- Si parcel_type est défini, l'utiliser
    IF NEW.parcel_type IS NOT NULL THEN
      IF NEW.parcel_type = 'SU' OR NEW.parcel_type = 'urbaine' THEN
        prefix := 'SU/';
        NEW.parcel_type := 'SU';
      ELSIF NEW.parcel_type = 'SR' OR NEW.parcel_type = 'rurale' THEN
        prefix := 'SR/';
        NEW.parcel_type := 'SR';
      ELSE
        -- Par défaut, utiliser SU
        prefix := 'SU/';
        NEW.parcel_type := 'SU';
      END IF;
    ELSE
      -- Si parcel_type n'est pas défini, essayer de le détecter depuis le parcel_number
      IF NEW.parcel_number LIKE 'SR/%' OR NEW.parcel_number LIKE 'SR%' THEN
        prefix := 'SR/';
        NEW.parcel_type := 'SR';
      ELSE
        prefix := 'SU/';
        NEW.parcel_type := 'SU';
      END IF;
    END IF;
    
    -- Nettoyer et formater le numéro parcellaire
    -- Supprimer les préfixes existants et les espaces
    NEW.parcel_number := TRIM(REGEXP_REPLACE(NEW.parcel_number, '^(SU/|SR/|SU|SR)', '', 'i'));
    
    -- Ajouter le préfixe approprié s'il n'est pas déjà présent
    IF NOT (NEW.parcel_number LIKE 'SU/%' OR NEW.parcel_number LIKE 'SR/%') THEN
      NEW.parcel_number := prefix || NEW.parcel_number;
    END IF;
    
    RETURN NEW;
  END;
END;
$function$;

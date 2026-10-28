CREATE OR REPLACE FUNCTION public._derive_rental_units_occupant(_units jsonb, _snake boolean)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  k_off text := CASE WHEN _snake THEN 'is_offered_for_rent' ELSE 'isOfferedForRent' END;
  k_occ text := CASE WHEN _snake THEN 'is_occupied' ELSE 'isOccupied' END;
  k_by  text := CASE WHEN _snake THEN 'occupied_by' ELSE 'occupiedBy' END;
  k_rent text := CASE WHEN _snake THEN 'monthly_rent_usd' ELSE 'monthlyRentUsd' END;
  k_date text := CASE WHEN _snake THEN 'rental_start_date' ELSE 'rentalStartDate' END;
  k_lease text := CASE WHEN _snake THEN 'lease_contract_url' ELSE 'leaseContractUrl' END;
  u jsonb; res jsonb := '[]'::jsonb; off jsonb; occ jsonb;
BEGIN
  IF _units IS NULL OR jsonb_typeof(_units) <> 'array' THEN RETURN _units; END IF;
  FOR u IN SELECT * FROM jsonb_array_elements(_units) LOOP
    IF jsonb_typeof(u) = 'object' THEN
      off := u -> k_off; occ := u -> k_occ;
      IF jsonb_typeof(off) = 'boolean' THEN
        IF occ = 'true'::jsonb THEN
          u := jsonb_set(u, ARRAY[k_by], to_jsonb(CASE WHEN off = 'true'::jsonb THEN 'tenant' ELSE 'owner' END));
        ELSE
          u := jsonb_set(u, ARRAY[k_by], 'null'::jsonb);
        END IF;
        IF off = 'false'::jsonb THEN
          u := u || jsonb_build_object(k_rent, NULL, k_date, NULL, k_lease, NULL);
        END IF;
      END IF;
    END IF;
    res := res || jsonb_build_array(u);
  END LOOP;
  RETURN res;
END $$;

REVOKE ALL ON FUNCTION public._derive_rental_units_occupant(jsonb, boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_rental_unit_occupant()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE c jsonb; arr jsonb := '[]'::jsonb;
BEGIN
  NEW.rental_units := public._derive_rental_units_occupant(NEW.rental_units, true);
  IF NEW.additional_constructions IS NOT NULL AND jsonb_typeof(NEW.additional_constructions) = 'array' THEN
    FOR c IN SELECT * FROM jsonb_array_elements(NEW.additional_constructions) LOOP
      IF jsonb_typeof(c) = 'object' AND c ? 'rentalUnits' THEN
        c := jsonb_set(c, '{rentalUnits}', public._derive_rental_units_occupant(c -> 'rentalUnits', false));
      END IF;
      arr := arr || jsonb_build_array(c);
    END LOOP;
    NEW.additional_constructions := arr;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_rental_unit_occupant ON public.cadastral_contributions;
CREATE TRIGGER trg_enforce_rental_unit_occupant
BEFORE INSERT OR UPDATE OF rental_units, additional_constructions ON public.cadastral_contributions
FOR EACH ROW EXECUTE FUNCTION public.enforce_rental_unit_occupant();
ALTER TABLE public.cadastral_contributions ADD COLUMN IF NOT EXISTS is_lakeside boolean;
ALTER TABLE public.cadastral_parcels ADD COLUMN IF NOT EXISTS is_lakeside boolean;

-- Recopie « au bord du lac » sur la parcelle à l'approbation.
CREATE OR REPLACE FUNCTION public.sync_contribution_lakeside()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pid uuid;
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' AND NEW.is_lakeside IS NOT NULL THEN
    v_pid := COALESCE(NEW.original_parcel_id,
      (SELECT id FROM cadastral_parcels WHERE parcel_number = NEW.parcel_number AND deleted_at IS NULL LIMIT 1));
    IF v_pid IS NOT NULL THEN
      UPDATE cadastral_parcels SET is_lakeside = NEW.is_lakeside WHERE id = v_pid;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.sync_contribution_lakeside() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS zzz_sync_contribution_lakeside ON public.cadastral_contributions;
CREATE TRIGGER zzz_sync_contribution_lakeside AFTER UPDATE ON public.cadastral_contributions
FOR EACH ROW EXECUTE FUNCTION public.sync_contribution_lakeside();

-- Refuse la taxe des 10 m de rive pour une parcelle qui n'est pas au bord du lac.
CREATE OR REPLACE FUNCTION public.enforce_lakeside_tax()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.is_lakeside, false) = false
     AND jsonb_typeof(NEW.tax_history) = 'array'
     AND EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.tax_history) e
                 WHERE e->>'tax_type' = 'Taxe compensatoire des 10 mètres de rive'
                    OR e->>'taxType' = 'Taxe compensatoire des 10 mètres de rive') THEN
    RAISE EXCEPTION 'La taxe compensatoire des 10 mètres de rive est réservée aux parcelles au bord du lac';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.enforce_lakeside_tax() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_enforce_lakeside_tax ON public.cadastral_contributions;
CREATE TRIGGER trg_enforce_lakeside_tax BEFORE INSERT OR UPDATE OF is_lakeside, tax_history ON public.cadastral_contributions
FOR EACH ROW EXECUTE FUNCTION public.enforce_lakeside_tax();
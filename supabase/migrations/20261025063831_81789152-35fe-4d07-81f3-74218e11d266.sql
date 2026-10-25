ALTER TABLE public.cadastral_ownership_history ADD COLUMN IF NOT EXISTS cession_document_url text;

CREATE OR REPLACE FUNCTION public.sync_ownership_cession_docs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pid uuid; v_item jsonb;
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved'
     AND jsonb_typeof(NEW.ownership_history) = 'array' THEN
    v_pid := COALESCE(NEW.original_parcel_id,
      (SELECT id FROM cadastral_parcels WHERE parcel_number = NEW.parcel_number AND deleted_at IS NULL LIMIT 1));
    IF v_pid IS NULL THEN RETURN NEW; END IF;
    FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.ownership_history) LOOP
      IF NULLIF(v_item->>'cession_document_url','') IS NOT NULL THEN
        UPDATE cadastral_ownership_history
          SET cession_document_url = v_item->>'cession_document_url'
          WHERE parcel_id = v_pid
            AND owner_name = v_item->>'owner_name'
            AND ownership_start_date IS NOT DISTINCT FROM NULLIF(v_item->>'ownership_start_date','')::date
            AND cession_document_url IS NULL;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.sync_ownership_cession_docs() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS zzz_sync_ownership_cession_docs ON public.cadastral_contributions;
CREATE TRIGGER zzz_sync_ownership_cession_docs AFTER UPDATE ON public.cadastral_contributions
FOR EACH ROW EXECUTE FUNCTION public.sync_ownership_cession_docs();
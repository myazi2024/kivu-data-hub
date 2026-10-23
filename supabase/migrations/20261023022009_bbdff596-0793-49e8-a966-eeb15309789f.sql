ALTER TABLE public.cadastral_ownership_history ADD COLUMN IF NOT EXISTS identity_document_url text;

DO $$
DECLARE v_def text;
BEGIN
  SELECT pg_get_functiondef('public.sync_approved_contribution_to_parcel()'::regprocedure) INTO v_def;
  v_def := replace(v_def,
    'ownership_end_date, mutation_type, ownership_document_url
            ) VALUES (',
    'ownership_end_date, mutation_type, ownership_document_url, identity_document_url
            ) VALUES (');
  v_def := replace(v_def,
    'NULLIF(v_item->>''ownership_document_url'', '''')
            );',
    'NULLIF(v_item->>''ownership_document_url'', ''''),
              NULLIF(v_item->>''identity_document_url'', '''')
            );');
  IF position('identity_document_url' in v_def) = 0 THEN
    RAISE EXCEPTION 'sync_approved_contribution_to_parcel: motif introuvable';
  END IF;
  EXECUTE v_def;
END $$;

CREATE OR REPLACE FUNCTION public.get_parcel_paid_history(p_parcel_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_num text; v_admin boolean; v_own boolean; v_tax boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  SELECT parcel_number INTO v_num FROM cadastral_parcels WHERE id = p_parcel_id;
  IF v_num IS NULL THEN RETURN jsonb_build_object('ownership_history','[]'::jsonb,'tax_history','[]'::jsonb); END IF;
  v_admin := has_any_role(v_uid, ARRAY['admin'::app_role,'super_admin'::app_role]);
  v_own := v_admin OR EXISTS (SELECT 1 FROM cadastral_service_access
    WHERE user_id = v_uid AND parcel_number = v_num AND service_type = 'history'
      AND (expires_at IS NULL OR expires_at > now()));
  v_tax := v_admin OR EXISTS (SELECT 1 FROM cadastral_service_access
    WHERE user_id = v_uid AND parcel_number = v_num AND service_type = 'obligations'
      AND (expires_at IS NULL OR expires_at > now()));
  RETURN jsonb_build_object(
    'ownership_history', CASE WHEN v_own THEN COALESCE((SELECT jsonb_agg(
        CASE WHEN v_admin THEN to_jsonb(o) ELSE to_jsonb(o) - 'identity_document_url' END
        ORDER BY o.ownership_start_date) FROM cadastral_ownership_history o WHERE o.parcel_id = p_parcel_id), '[]'::jsonb) ELSE '[]'::jsonb END,
    'tax_history', CASE WHEN v_tax THEN COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.tax_year) FROM cadastral_tax_history t WHERE t.parcel_id = p_parcel_id), '[]'::jsonb) ELSE '[]'::jsonb END
  );
END $function$;

CREATE OR REPLACE FUNCTION public.strip_contributor_owner_document()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.submitter_role, 'contributor') <> 'owner' THEN
    NEW.owner_document_url := NULL;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.strip_contributor_owner_document() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_strip_contributor_owner_document ON public.cadastral_contributions;
CREATE TRIGGER trg_strip_contributor_owner_document
BEFORE INSERT OR UPDATE OF owner_document_url, submitter_role ON public.cadastral_contributions
FOR EACH ROW EXECUTE FUNCTION public.strip_contributor_owner_document();
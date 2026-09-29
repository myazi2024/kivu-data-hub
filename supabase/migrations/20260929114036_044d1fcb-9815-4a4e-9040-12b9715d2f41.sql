CREATE TABLE public.ccc_correction_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id uuid NOT NULL REFERENCES public.cadastral_contributions(id) ON DELETE CASCADE,
  parcel_number text NOT NULL,
  user_id uuid NOT NULL,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ccc_corr_status ON public.ccc_correction_requests(status, created_at DESC);
CREATE INDEX idx_ccc_corr_user ON public.ccc_correction_requests(user_id);
GRANT SELECT, INSERT, UPDATE ON public.ccc_correction_requests TO authenticated;
GRANT ALL ON public.ccc_correction_requests TO service_role;
ALTER TABLE public.ccc_correction_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own correction requests readable" ON public.ccc_correction_requests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Owners create requests on approved contributions" ON public.ccc_correction_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND status = 'pending' AND reviewed_at IS NULL
  AND length(trim(reason)) >= 5 AND jsonb_typeof(changes) = 'array' AND jsonb_array_length(changes) BETWEEN 1 AND 30
  AND EXISTS (SELECT 1 FROM public.cadastral_contributions c WHERE c.id = contribution_id AND c.user_id = auth.uid() AND c.status = 'approved'));

CREATE POLICY "Owners cancel pending requests" ON public.ccc_correction_requests FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status = 'pending')
WITH CHECK (user_id = auth.uid() AND status = 'cancelled');

CREATE OR REPLACE FUNCTION public.ccc_corr_protect() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND current_setting('app.ccc_corr_rpc', true) IS DISTINCT FROM 'on' THEN
    IF NEW.changes IS DISTINCT FROM OLD.changes OR NEW.reason IS DISTINCT FROM OLD.reason
       OR NEW.contribution_id IS DISTINCT FROM OLD.contribution_id OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
       OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
      RAISE EXCEPTION 'Modification non autorisée';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_ccc_corr_protect BEFORE UPDATE ON public.ccc_correction_requests FOR EACH ROW EXECUTE FUNCTION public.ccc_corr_protect();

CREATE OR REPLACE FUNCTION public.ccc_correctable_columns() RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
SELECT ARRAY['property_title_type','title_reference_number','title_issue_date','lease_type','lease_years','current_owner_name',
'current_owner_legal_status','current_owner_since','is_title_in_current_owner_name','whatsapp_number','area_sqm','province',
'land_district','ville','commune','quartier','avenue','house_number','territoire','collectivite','groupement','village',
'construction_type','construction_nature','construction_materials','standing','declared_usage','actual_usage','actual_usage_other',
'construction_year','construction_status','building_height','floor_number','property_category','apartment_number',
'apartment_orientation','apartment_length','apartment_width','apartment_height','is_rented','is_occupied','rental_configuration',
'rental_units_count','monthly_rent_usd','rental_start_date','hosting_capacity','occupant_count','operational_capacity',
'operational_capacity_unit','sound_environment','nearby_noise_sources','resale_price_amount','resale_price_currency',
'would_sell_if_offered','has_recent_appraisal','appraisal_date','appraiser_name','appraised_value_amount',
'appraised_value_currency','previous_permit_number']::text[] $$;

CREATE OR REPLACE FUNCTION public.apply_ccc_correction_request(p_request_id uuid, p_decision text, p_rejection_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; ch jsonb; col text; val text; typ text; applied int := 0; tbl text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  IF p_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Décision invalide'; END IF;
  SELECT * INTO r FROM public.ccc_correction_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'Demande déjà traitée'; END IF;
  PERFORM set_config('app.ccc_corr_rpc','on', true);

  IF p_decision = 'rejected' THEN
    IF coalesce(length(trim(p_rejection_reason)),0) < 5 THEN RAISE EXCEPTION 'Motif de rejet requis (5 caractères min.)'; END IF;
    UPDATE public.ccc_correction_requests SET status='rejected', rejection_reason=trim(p_rejection_reason),
      reviewed_by=auth.uid(), reviewed_at=now() WHERE id=p_request_id;
  ELSE
    FOR ch IN SELECT * FROM jsonb_array_elements(r.changes) LOOP
      col := ch->>'field'; val := nullif(ch->>'new_value','');
      IF NOT (col = ANY(public.ccc_correctable_columns())) THEN RAISE EXCEPTION 'Champ non modifiable: %', col; END IF;
      FOREACH tbl IN ARRAY ARRAY['cadastral_contributions','cadastral_parcels'] LOOP
        SELECT format_type(a.atttypid, a.atttypmod) INTO typ FROM pg_attribute a
          WHERE a.attrelid = ('public.'||tbl)::regclass AND a.attname = col AND NOT a.attisdropped AND a.attnum > 0;
        IF typ IS NULL THEN CONTINUE; END IF;
        IF tbl = 'cadastral_contributions' THEN
          EXECUTE format('UPDATE public.cadastral_contributions SET %I = $1::%s WHERE id = $2', col, typ) USING val, r.contribution_id;
        ELSE
          EXECUTE format('UPDATE public.cadastral_parcels SET %I = $1::%s WHERE parcel_number = $2 AND deleted_at IS NULL', col, typ) USING val, r.parcel_number;
        END IF;
        typ := NULL;
      END LOOP;
      applied := applied + 1;
    END LOOP;
    UPDATE public.ccc_correction_requests SET status='approved', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=p_request_id;
  END IF;

  INSERT INTO public.notifications(user_id, type, title, message)
  VALUES (r.user_id, CASE WHEN p_decision='approved' THEN 'success' ELSE 'warning' END,
    CASE WHEN p_decision='approved' THEN 'Modification approuvée' ELSE 'Modification rejetée' END,
    'Parcelle '||r.parcel_number||CASE WHEN p_decision='approved' THEN ' : vos modifications ont été appliquées.' ELSE ' : '||trim(p_rejection_reason) END);
  RETURN jsonb_build_object('status', p_decision, 'applied', applied);
END $$;
REVOKE ALL ON FUNCTION public.apply_ccc_correction_request(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_ccc_correction_request(uuid,text,text) TO authenticated, service_role;
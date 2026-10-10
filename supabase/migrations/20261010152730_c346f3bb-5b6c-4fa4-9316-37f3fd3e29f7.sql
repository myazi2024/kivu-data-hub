
CREATE OR REPLACE FUNCTION public._dispute_notify_admins(_title text, _message text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, title, message, type, action_url)
  SELECT DISTINCT user_id, _title, _message, 'info', '/admin?tab=land-disputes'
  FROM public.user_roles WHERE role IN ('admin','super_admin');
$$;
REVOKE ALL ON FUNCTION public._dispute_notify_admins(text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._dispute_make_reference(_prefix text)
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT _prefix || '-' || to_char(now(),'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
$$;
REVOKE ALL ON FUNCTION public._dispute_make_reference(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._dispute_valid_docs(_docs jsonb, _uid uuid)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT jsonb_typeof(coalesce(_docs,'[]'::jsonb)) = 'array'
     AND jsonb_array_length(coalesce(_docs,'[]'::jsonb)) <= 10
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_array_elements(coalesce(_docs,'[]'::jsonb)) d
       WHERE jsonb_typeof(d) <> 'string'
          OR (d #>> '{}') NOT LIKE (_uid::text || '/land-disputes/%')
          OR (d #>> '{}') LIKE '%..%');
$$;
REVOKE ALL ON FUNCTION public._dispute_valid_docs(jsonb,uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_land_dispute_report(
  _parcel_number text, _dispute_nature text, _dispute_description text, _dispute_start_date date,
  _resolution_level text, _resolution_details text, _declarant_name text, _declarant_phone text,
  _declarant_email text, _declarant_quality text, _parties jsonb, _documents jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _pid uuid;
  _ref text;
  _id uuid;
  _clean_parties jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Vous devez être connecté'; END IF;
  _parcel_number := btrim(coalesce(_parcel_number,''));
  SELECT id INTO _pid FROM public.cadastral_parcels WHERE parcel_number = _parcel_number AND deleted_at IS NULL LIMIT 1;
  IF _pid IS NULL THEN RAISE EXCEPTION 'Parcelle introuvable'; END IF;
  IF _dispute_nature NOT IN ('succession','delimitation','construction_anarchique','expropriation','double_vente','occupation_illegale','contestation_titre','servitude','autre') THEN
    RAISE EXCEPTION 'Nature du litige invalide'; END IF;
  IF _dispute_start_date IS NULL OR _dispute_start_date > current_date THEN
    RAISE EXCEPTION 'La date de début est obligatoire et ne peut pas être dans le futur'; END IF;
  IF _resolution_level IS NOT NULL AND _resolution_level <> '' AND _resolution_level NOT IN ('familial','conciliation_amiable','autorite_locale','arbitrage','tribunal','appel') THEN
    RAISE EXCEPTION 'Niveau de résolution invalide'; END IF;
  IF _declarant_quality NOT IN ('proprietaire','coproprietaire','heritier','mandataire','occupant','voisin','autre') THEN
    RAISE EXCEPTION 'Qualité du déclarant invalide'; END IF;
  IF length(btrim(coalesce(_declarant_name,''))) < 3 OR length(_declarant_name) > 150 THEN
    RAISE EXCEPTION 'Le nom du déclarant doit contenir entre 3 et 150 caractères'; END IF;
  IF length(coalesce(_dispute_description,'')) > 2000 OR length(coalesce(_resolution_details,'')) > 2000 THEN
    RAISE EXCEPTION 'Texte trop long (2000 caractères maximum)'; END IF;
  IF coalesce(_declarant_email,'') <> '' AND _declarant_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'Adresse e-mail invalide'; END IF;
  IF coalesce(_declarant_phone,'') <> '' AND _declarant_phone !~ '^\+?[0-9\s\-()]{6,20}$' THEN
    RAISE EXCEPTION 'Numéro de téléphone invalide'; END IF;
  IF jsonb_typeof(coalesce(_parties,'[]'::jsonb)) <> 'array' THEN RAISE EXCEPTION 'Parties invalides'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'name', left(btrim(p->>'name'),150), 'phone', left(coalesce(p->>'phone',''),20),
      'role', p->>'role', 'relationship', left(coalesce(p->>'relationship',''),150))), '[]'::jsonb)
    INTO _clean_parties
  FROM jsonb_array_elements(coalesce(_parties,'[]'::jsonb)) p
  WHERE btrim(coalesce(p->>'name','')) <> '';
  IF jsonb_array_length(_clean_parties) = 0 THEN RAISE EXCEPTION 'Veuillez renseigner au moins une partie concernée'; END IF;
  IF jsonb_array_length(_clean_parties) > 10 THEN RAISE EXCEPTION 'Maximum 10 parties'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(_clean_parties) p WHERE p->>'role' NOT IN ('demandeur','defendeur','tiers','temoin')) THEN
    RAISE EXCEPTION 'Rôle de partie invalide'; END IF;
  IF NOT public._dispute_valid_docs(_documents, _uid) THEN RAISE EXCEPTION 'Documents invalides'; END IF;
  IF EXISTS (SELECT 1 FROM public.cadastral_land_disputes
             WHERE parcel_number = _parcel_number AND dispute_type = 'report' AND dispute_nature = _dispute_nature
               AND current_status NOT IN ('resolu','leve')) THEN
    RAISE EXCEPTION 'Un litige de même nature est déjà en cours sur cette parcelle'; END IF;

  _ref := public._dispute_make_reference('LIT');
  INSERT INTO public.cadastral_land_disputes (parcel_id, parcel_number, reference_number, dispute_type, dispute_nature,
    dispute_description, parties_involved, current_status, resolution_level, resolution_details, declarant_name,
    declarant_phone, declarant_email, declarant_quality, supporting_documents, dispute_start_date, reported_by)
  VALUES (_pid, _parcel_number, _ref, 'report', _dispute_nature, nullif(btrim(coalesce(_dispute_description,'')),''),
    _clean_parties, 'en_cours', nullif(_resolution_level,''), nullif(btrim(coalesce(_resolution_details,'')),''),
    btrim(_declarant_name), nullif(btrim(coalesce(_declarant_phone,'')),''), nullif(btrim(coalesce(_declarant_email,'')),''),
    _declarant_quality, coalesce(_documents,'[]'::jsonb), _dispute_start_date, _uid)
  RETURNING id INTO _id;

  INSERT INTO public.notifications (user_id, title, message, type, action_url)
  VALUES (_uid, 'Litige foncier signalé', 'Votre signalement de litige foncier (' || _ref || ') pour la parcelle ' || _parcel_number || ' a été enregistré.', 'success', '/user-dashboard?tab=disputes');
  PERFORM public._dispute_notify_admins('Nouveau signalement de litige', 'Un nouveau litige foncier (' || _ref || ') a été signalé sur la parcelle ' || _parcel_number || '.');
  RETURN jsonb_build_object('id', _id, 'reference_number', _ref);
END $$;
REVOKE ALL ON FUNCTION public.submit_land_dispute_report(text,text,text,date,text,text,text,text,text,text,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_land_dispute_report(text,text,text,date,text,text,text,text,text,text,jsonb,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.check_land_dispute_reference(_parcel_number text, _reference text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Vous devez être connecté'; END IF;
  SELECT dispute_nature, current_status, dispute_start_date INTO r
  FROM public.cadastral_land_disputes
  WHERE parcel_number = btrim(_parcel_number) AND reference_number = upper(btrim(_reference)) AND dispute_type = 'report'
  LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
  RETURN jsonb_build_object('found', true, 'dispute_nature', r.dispute_nature, 'current_status', r.current_status,
    'dispute_start_date', r.dispute_start_date,
    'can_lift', r.current_status NOT IN ('resolu','leve','demande_levee'));
END $$;
REVOKE ALL ON FUNCTION public.check_land_dispute_reference(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_land_dispute_reference(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_land_dispute_lifting(
  _parcel_number text, _dispute_reference text, _lifting_reason text, _lifting_details text,
  _requester_name text, _requester_phone text, _requester_email text, _requester_quality text, _documents jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  o public.cadastral_land_disputes%ROWTYPE;
  _ref text; _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Vous devez être connecté'; END IF;
  SELECT * INTO o FROM public.cadastral_land_disputes
  WHERE parcel_number = btrim(_parcel_number) AND reference_number = upper(btrim(_dispute_reference)) AND dispute_type = 'report'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ce numéro de référence ne correspond à aucun litige enregistré sur cette parcelle'; END IF;
  IF o.current_status IN ('resolu','leve','demande_levee') THEN
    RAISE EXCEPTION 'Ce litige a déjà été résolu, levé, ou fait déjà l''objet d''une demande de levée'; END IF;
  IF _lifting_reason NOT IN ('jugement_definitif','conciliation_reussie','desistement','prescription','transaction','reconnaissance_droits','erreur_materielle','autre') THEN
    RAISE EXCEPTION 'Motif de levée invalide'; END IF;
  IF _requester_quality NOT IN ('proprietaire','coproprietaire','heritier','mandataire','avocat','notaire') THEN
    RAISE EXCEPTION 'Qualité du demandeur invalide'; END IF;
  IF length(btrim(coalesce(_requester_name,''))) < 3 OR length(_requester_name) > 150 THEN
    RAISE EXCEPTION 'Le nom doit contenir entre 3 et 150 caractères'; END IF;
  IF length(coalesce(_lifting_details,'')) > 2000 THEN RAISE EXCEPTION 'Texte trop long (2000 caractères maximum)'; END IF;
  IF coalesce(_requester_email,'') <> '' AND _requester_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN RAISE EXCEPTION 'Adresse e-mail invalide'; END IF;
  IF coalesce(_requester_phone,'') <> '' AND _requester_phone !~ '^\+?[0-9\s\-()]{6,20}$' THEN RAISE EXCEPTION 'Numéro de téléphone invalide'; END IF;
  IF NOT public._dispute_valid_docs(_documents, _uid) OR jsonb_array_length(coalesce(_documents,'[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Veuillez joindre au moins un document justificatif valide'; END IF;

  _ref := public._dispute_make_reference('LEV');
  INSERT INTO public.cadastral_land_disputes (parcel_id, parcel_number, reference_number, dispute_type, dispute_nature,
    dispute_description, current_status, declarant_name, declarant_phone, declarant_email, declarant_quality,
    lifting_request_reference, lifting_reason, lifting_documents, lifting_status, reported_by)
  VALUES (o.parcel_id, o.parcel_number, _ref, 'lifting', o.dispute_nature, nullif(btrim(coalesce(_lifting_details,'')),''),
    'demande_levee', btrim(_requester_name), nullif(btrim(coalesce(_requester_phone,'')),''), nullif(btrim(coalesce(_requester_email,'')),''),
    _requester_quality, o.reference_number, _lifting_reason, _documents, 'pending', _uid)
  RETURNING id INTO _id;

  UPDATE public.cadastral_land_disputes SET current_status = 'demande_levee', lifting_status = 'pending' WHERE id = o.id;

  INSERT INTO public.notifications (user_id, title, message, type, action_url)
  VALUES (_uid, 'Demande de levée de litige soumise', 'Votre demande de levée (' || _ref || ') pour la parcelle ' || o.parcel_number || ' a été enregistrée.', 'success', '/user-dashboard?tab=disputes');
  IF o.reported_by IS NOT NULL AND o.reported_by <> _uid THEN
    INSERT INTO public.notifications (user_id, title, message, type, action_url)
    VALUES (o.reported_by, 'Demande de levée sur votre litige', 'Une demande de levée a été déposée pour votre litige (' || o.reference_number || ').', 'info', '/user-dashboard?tab=disputes');
  END IF;
  PERFORM public._dispute_notify_admins('Nouvelle demande de levée de litige', 'Une demande de levée (' || _ref || ') a été soumise pour la parcelle ' || o.parcel_number || '.');
  RETURN jsonb_build_object('id', _id, 'reference_number', _ref);
END $$;
REVOKE ALL ON FUNCTION public.submit_land_dispute_lifting(text,text,text,text,text,text,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_land_dispute_lifting(text,text,text,text,text,text,text,text,jsonb) TO authenticated;

-- Synchronisation levée -> litige d'origine, et indicateur parcelle
CREATE OR REPLACE FUNCTION public.sync_land_dispute_state()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.dispute_type = 'lifting' AND NEW.current_status IS DISTINCT FROM OLD.current_status
     AND NEW.lifting_request_reference IS NOT NULL THEN
    IF NEW.current_status IN ('leve','resolu') THEN
      NEW.lifting_status := 'approved';
      UPDATE public.cadastral_land_disputes SET current_status = NEW.current_status, lifting_status = 'approved'
      WHERE dispute_type = 'report' AND parcel_number = NEW.parcel_number AND reference_number = NEW.lifting_request_reference;
    ELSIF OLD.current_status = 'demande_levee' THEN
      NEW.lifting_status := 'rejected';
      UPDATE public.cadastral_land_disputes SET current_status = 'en_cours', lifting_status = 'rejected'
      WHERE dispute_type = 'report' AND parcel_number = NEW.parcel_number AND reference_number = NEW.lifting_request_reference
        AND current_status = 'demande_levee';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_land_dispute_state() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_sync_land_dispute_state ON public.cadastral_land_disputes;
CREATE TRIGGER trg_sync_land_dispute_state BEFORE UPDATE ON public.cadastral_land_disputes
  FOR EACH ROW EXECUTE FUNCTION public.sync_land_dispute_state();

CREATE OR REPLACE FUNCTION public.refresh_parcel_dispute_flag()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.cadastral_parcels p SET has_dispute = EXISTS (
    SELECT 1 FROM public.cadastral_land_disputes d
    WHERE d.parcel_number = p.parcel_number AND d.dispute_type = 'report' AND d.current_status NOT IN ('resolu','leve'))
  WHERE p.parcel_number = NEW.parcel_number;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.refresh_parcel_dispute_flag() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_refresh_parcel_dispute_flag ON public.cadastral_land_disputes;
CREATE TRIGGER trg_refresh_parcel_dispute_flag AFTER INSERT OR UPDATE OF current_status ON public.cadastral_land_disputes
  FOR EACH ROW EXECUTE FUNCTION public.refresh_parcel_dispute_flag();

DROP POLICY IF EXISTS "Users can create their own dispute reports" ON public.cadastral_land_disputes;

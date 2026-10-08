
CREATE OR REPLACE FUNCTION public._mortgage_is_active(_status text, _lifecycle text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _lifecycle IS NOT NULL THEN _lifecycle IN ('active','defaulted','renegotiated')
    ELSE lower(coalesce(_status,'')) IN ('active','en_defaut','renegociee','defaulted','renegotiated')
  END
$$;

CREATE OR REPLACE FUNCTION public._mortgage_cancellation_due(_selected text[])
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb; f jsonb; total numeric := 0;
BEGIN
  SELECT config_value INTO v FROM cadastral_contribution_config
   WHERE config_key='mortgage_cancellation_fees' AND is_active = true LIMIT 1;
  IF v IS NULL OR jsonb_typeof(v) <> 'array' OR jsonb_array_length(v)=0 THEN
    v := '[{"id":"dossier","amount_usd":50,"is_mandatory":true},{"id":"radiation","amount_usd":100,"is_mandatory":true},{"id":"certificat","amount_usd":35,"is_mandatory":true},{"id":"timbre","amount_usd":15,"is_mandatory":true},{"id":"conservation","amount_usd":25,"is_mandatory":true},{"id":"verification","amount_usd":20,"is_mandatory":false}]'::jsonb;
  END IF;
  FOR f IN SELECT * FROM jsonb_array_elements(v) LOOP
    IF (f->>'is_mandatory')::boolean IS TRUE OR (f->>'id') = ANY(coalesce(_selected,'{}')) THEN
      total := total + coalesce((f->>'amount_usd')::numeric,0);
    END IF;
  END LOOP;
  RETURN round(total,2);
END $$;
REVOKE ALL ON FUNCTION public._mortgage_cancellation_due(text[]) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_parcel_active_mortgage(_parcel_id uuid, _reference text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE m record; has_active boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise' USING ERRCODE='42501'; END IF;
  SELECT EXISTS(SELECT 1 FROM cadastral_mortgages WHERE parcel_id=_parcel_id
    AND _mortgage_is_active(mortgage_status, lifecycle_state::text)) INTO has_active;
  IF _reference IS NULL OR length(trim(_reference)) < 5 THEN
    RETURN jsonb_build_object('has_active', has_active, 'reference_valid', null);
  END IF;
  SELECT id, reference_number, creditor_name, creditor_type, mortgage_amount_usd, contract_date, duration_months, mortgage_status
    INTO m FROM cadastral_mortgages
   WHERE parcel_id=_parcel_id AND upper(reference_number)=upper(trim(_reference))
     AND _mortgage_is_active(mortgage_status, lifecycle_state::text) LIMIT 1;
  IF m.id IS NULL THEN
    RETURN jsonb_build_object('has_active', has_active, 'reference_valid', false);
  END IF;
  RETURN jsonb_build_object('has_active', has_active, 'reference_valid', true, 'mortgage', to_jsonb(m));
END $$;
REVOKE ALL ON FUNCTION public.check_parcel_active_mortgage(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_parcel_active_mortgage(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_mortgage_cancellation_request(
  _parcel_id uuid, _mortgage_reference text, _request_reference text, _details jsonb, _selected_fee_ids text[], _comments text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); p record; m record; existing record; due numeric; new_id uuid; ref text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentification requise' USING ERRCODE='42501'; END IF;
  SELECT id, parcel_number FROM cadastral_parcels INTO p WHERE id=_parcel_id AND deleted_at IS NULL;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Parcelle introuvable'; END IF;
  SELECT id, reference_number, creditor_name, creditor_type, mortgage_amount_usd, contract_date, duration_months, mortgage_status
    INTO m FROM cadastral_mortgages
   WHERE parcel_id=_parcel_id AND upper(reference_number)=upper(trim(_mortgage_reference))
     AND _mortgage_is_active(mortgage_status, lifecycle_state::text) LIMIT 1;
  IF m.id IS NULL THEN RAISE EXCEPTION 'Référence d''hypothèque active invalide pour cette parcelle'; END IF;

  -- Demande en attente de paiement de cet utilisateur : réutilisée (pas de doublon).
  SELECT id, mortgage_history INTO existing FROM cadastral_contributions
   WHERE user_id=uid AND contribution_type='mortgage_cancellation' AND status='awaiting_payment'
     AND upper(mortgage_history->0->>'mortgage_reference_number') = upper(m.reference_number) LIMIT 1;
  IF existing.id IS NOT NULL THEN
    RETURN jsonb_build_object('id', existing.id, 'total_amount_due', (existing.mortgage_history->0->>'total_amount_due')::numeric,
      'request_reference_number', existing.mortgage_history->0->>'request_reference_number', 'reused', true);
  END IF;
  IF EXISTS (SELECT 1 FROM cadastral_contributions WHERE contribution_type='mortgage_cancellation'
     AND status IN ('pending','returned','in_review')
     AND upper(mortgage_history->0->>'mortgage_reference_number') = upper(m.reference_number)) THEN
    RAISE EXCEPTION 'Une demande de radiation est déjà en cours pour cette hypothèque';
  END IF;

  due := _mortgage_cancellation_due(_selected_fee_ids);
  ref := coalesce(nullif(trim(_request_reference),''), 'RAD-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)));

  INSERT INTO cadastral_contributions(parcel_number, original_parcel_id, user_id, contribution_type, status, payment_status, change_justification, mortgage_history)
  VALUES (p.parcel_number, p.id, uid, 'mortgage_cancellation', 'awaiting_payment', 'pending', nullif(_comments,''),
    jsonb_build_array(coalesce(_details,'{}'::jsonb) || jsonb_build_object(
      'type','cancellation_request',
      'request_reference_number', ref,
      'mortgage_reference_number', m.reference_number,
      'mortgage_data', to_jsonb(m),
      'fees_selected', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', x)), '[]'::jsonb) FROM unnest(coalesce(_selected_fee_ids,'{}')) x),
      'total_amount_due', due,
      'submitted_at', now())))
  RETURNING id INTO new_id;

  INSERT INTO notifications(user_id, title, message, type, action_url)
  VALUES (uid, 'Demande de radiation enregistrée',
    format('Votre demande de radiation (Réf: %s) pour la parcelle %s est enregistrée et attend le paiement.', ref, p.parcel_number),
    'mortgage', '/user-dashboard');
  INSERT INTO audit_logs(action, user_id, record_id, table_name, new_values)
  VALUES ('mortgage_cancellation_submitted', uid, new_id, 'cadastral_contributions',
    jsonb_build_object('request_reference', ref, 'parcel_number', p.parcel_number, 'total_amount_due', due));

  RETURN jsonb_build_object('id', new_id, 'total_amount_due', due, 'request_reference_number', ref, 'reused', false);
END $$;
REVOKE ALL ON FUNCTION public.submit_mortgage_cancellation_request(uuid,text,text,jsonb,text[],text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_mortgage_cancellation_request(uuid,text,text,jsonb,text[],text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_mortgage_cancellation_request(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise' USING ERRCODE='42501'; END IF;
  UPDATE cadastral_contributions SET status='cancelled', updated_at=now()
   WHERE id=_id AND user_id=auth.uid() AND contribution_type='mortgage_cancellation'
     AND status='awaiting_payment' AND coalesce(payment_status,'pending') <> 'paid';
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande non annulable'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.cancel_mortgage_cancellation_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_mortgage_cancellation_request(uuid) TO authenticated;

-- Insertion directe de radiation : interdite au navigateur (passe par la RPC).
CREATE OR REPLACE FUNCTION public.protect_mortgage_cancellation_payment()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_is_privileged BOOLEAN := auth.role() = 'service_role' OR current_user IN ('postgres','supabase_admin')
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role);
BEGIN
  IF NEW.contribution_type <> 'mortgage_cancellation' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NOT v_is_privileged THEN
      RAISE EXCEPTION 'Une demande de radiation doit être créée par le serveur.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF NOT v_is_privileged
     AND (NEW.status IS DISTINCT FROM OLD.status
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.payment_transaction_id IS DISTINCT FROM OLD.payment_transaction_id
       OR NEW.payment_confirmed_at IS DISTINCT FROM OLD.payment_confirmed_at) THEN
    RAISE EXCEPTION 'Le statut de paiement de la radiation est géré exclusivement par le serveur.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

-- normalize_contribution_insert ne doit pas écraser le statut posé par la RPC serveur.
CREATE OR REPLACE FUNCTION public.normalize_contribution_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('postgres','supabase_admin') AND NEW.contribution_type = 'mortgage_cancellation' THEN
    RETURN NEW;
  END IF;
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)) THEN
    NEW.status := 'pending';
    NEW.reviewed_by := NULL; NEW.verified_by := NULL; NEW.reviewed_at := NULL; NEW.verified_at := NULL;
    IF NEW.original_parcel_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.cadastral_parcels p WHERE p.id = NEW.original_parcel_id AND p.deleted_at IS NULL) THEN
      NEW.original_parcel_id := NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- Enregistrement d'hypothèque : contrôles serveur.
CREATE OR REPLACE FUNCTION public.enforce_mortgage_registration_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.contribution_type <> 'mortgage_registration' THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role) THEN RETURN NEW; END IF;
  IF NEW.original_parcel_id IS NULL THEN RAISE EXCEPTION 'Parcelle introuvable'; END IF;
  IF EXISTS (SELECT 1 FROM cadastral_mortgages WHERE parcel_id=NEW.original_parcel_id
       AND _mortgage_is_active(mortgage_status, lifecycle_state::text)) THEN
    RAISE EXCEPTION 'Cette parcelle porte déjà une hypothèque active.';
  END IF;
  IF EXISTS (SELECT 1 FROM cadastral_contributions WHERE original_parcel_id=NEW.original_parcel_id
       AND user_id=NEW.user_id AND contribution_type='mortgage_registration' AND status IN ('pending','returned','in_review')) THEN
    RAISE EXCEPTION 'Une demande d''hypothèque est déjà en cours pour cette parcelle.';
  END IF;
  IF jsonb_typeof(NEW.mortgage_history)='array' AND jsonb_array_length(NEW.mortgage_history)>0 THEN
    NEW.mortgage_history := jsonb_set(NEW.mortgage_history, '{0,mortgage_status}', '"active"');
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_mortgage_registration_insert() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS aac_enforce_mortgage_registration_insert ON public.cadastral_contributions;
CREATE TRIGGER aac_enforce_mortgage_registration_insert BEFORE INSERT ON public.cadastral_contributions
FOR EACH ROW EXECUTE FUNCTION public.enforce_mortgage_registration_insert();

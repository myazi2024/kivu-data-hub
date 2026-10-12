
CREATE OR REPLACE FUNCTION public._notify(_user_id uuid, _title text, _message text, _type text, _action_url text, _dedupe_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications(user_id, title, message, type, action_url, dedupe_key)
  VALUES (_user_id, left(_title,200), left(_message,2000), _type, _action_url, _dedupe_key)
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public._notify(uuid,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._notify(uuid,text,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public._require_admin() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid();
BEGIN
  IF v IS NULL OR NOT public.has_any_role(v, ARRAY['admin'::app_role,'super_admin'::app_role]) THEN
    RAISE EXCEPTION 'Accès refusé: rôle administrateur requis';
  END IF;
  RETURN v;
END $$;
REVOKE ALL ON FUNCTION public._require_admin() FROM PUBLIC, anon, authenticated;

-- Hypothèques
CREATE OR REPLACE FUNCTION public.process_mortgage_decision(p_id uuid, p_action text, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := public._require_admin(); c record; m jsonb; v_label text; v_ref text; v_status text; v_dur int;
BEGIN
  IF p_action NOT IN ('approve','reject','return') THEN RAISE EXCEPTION 'Action invalide'; END IF;
  IF p_action <> 'approve' AND coalesce(trim(p_reason),'') = '' THEN RAISE EXCEPTION 'Motif obligatoire'; END IF;
  SELECT * INTO c FROM public.cadastral_contributions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR c.contribution_type NOT IN ('mortgage_registration','mortgage_cancellation') THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF c.status NOT IN ('pending','returned','in_review') THEN RAISE EXCEPTION 'Cette demande a déjà été traitée.'; END IF;
  v_label := CASE WHEN c.contribution_type = 'mortgage_cancellation' THEN 'radiation' ELSE 'enregistrement' END;
  m := coalesce(c.mortgage_history->0, '{}'::jsonb);

  IF p_action = 'approve' THEN
    UPDATE public.cadastral_contributions SET status='approved', reviewed_by=v_admin, reviewed_at=now(), verified_by=v_admin, verified_at=now() WHERE id=p_id;
    IF c.contribution_type = 'mortgage_registration' THEN
      IF c.original_parcel_id IS NULL THEN RAISE EXCEPTION 'Parcelle introuvable pour cette demande'; END IF;
      v_ref := coalesce(nullif(m->>'request_reference_number',''), 'HYP-' || upper(to_hex(extract(epoch from now())::bigint)));
      IF EXISTS (SELECT 1 FROM public.cadastral_mortgages WHERE reference_number = v_ref) THEN
        v_ref := v_ref || '-' || upper(substr(md5(random()::text),1,4));
      END IF;
      v_status := CASE coalesce(m->>'mortgage_status', m->>'mortgageStatus')
        WHEN 'en_defaut' THEN 'defaulted' WHEN 'defaulted' THEN 'defaulted'
        WHEN 'renegociee' THEN 'renegotiated' WHEN 'renegotiated' THEN 'renegotiated' ELSE 'active' END;
      v_dur := nullif(coalesce(m->>'duration_months', m->>'durationMonths'),'')::numeric::int;
      INSERT INTO public.cadastral_mortgages(parcel_id, creditor_name, creditor_type, mortgage_amount_usd, contract_date, mortgage_status, reference_number, duration_months)
      VALUES (c.original_parcel_id,
        coalesce(m->>'creditor_name', m->>'creditorName', ''),
        coalesce(nullif(coalesce(m->>'creditor_type', m->>'creditorType'),''), 'Banque'),
        coalesce(nullif(coalesce(m->>'mortgage_amount_usd', m->>'mortgageAmountUsd'),'')::numeric, 0),
        coalesce(nullif(coalesce(m->>'contract_date', m->>'contractDate'),'')::date, current_date),
        v_status, v_ref, CASE WHEN v_dur > 0 THEN v_dur ELSE 12 END);
    ELSIF nullif(m->>'mortgage_reference_number','') IS NOT NULL THEN
      UPDATE public.cadastral_mortgages SET mortgage_status='paid' WHERE reference_number = upper(m->>'mortgage_reference_number');
    END IF;
    PERFORM public._notify(c.user_id, 'Demande d''hypothèque approuvée',
      format('Votre demande de %s d''hypothèque pour la parcelle %s a été approuvée.', v_label, c.parcel_number),
      'success', '/user-dashboard', 'mortgage:'||p_id||':approve');
  ELSIF p_action = 'reject' THEN
    UPDATE public.cadastral_contributions SET status='rejected', rejection_reason=trim(p_reason), reviewed_at=now(), reviewed_by=v_admin, rejected_by=v_admin, rejection_date=now() WHERE id=p_id;
    PERFORM public._notify(c.user_id, 'Demande d''hypothèque rejetée',
      format('Votre demande de %s pour la parcelle %s a été rejetée. Motif : %s', v_label, c.parcel_number, trim(p_reason)),
      'error', '/user-dashboard', 'mortgage:'||p_id||':reject');
  ELSE
    UPDATE public.cadastral_contributions SET status='returned', change_justification=trim(p_reason), reviewed_at=now(), reviewed_by=v_admin WHERE id=p_id;
    PERFORM public._notify(c.user_id, 'Demande renvoyée pour correction',
      format('Votre demande pour la parcelle %s nécessite des corrections : %s', c.parcel_number, trim(p_reason)),
      'warning', '/user-dashboard', 'mortgage:'||p_id||':return:'||extract(epoch from now())::bigint);
  END IF;

  INSERT INTO public.audit_logs(action, user_id, record_id, table_name, new_values)
  VALUES ('mortgage_request_'||p_action, v_admin, p_id, 'cadastral_contributions',
    jsonb_build_object('parcel_number', c.parcel_number, 'type', c.contribution_type, 'reason', p_reason));
  RETURN jsonb_build_object('id', p_id, 'action', p_action);
END $$;

-- Déclarations de taxe
CREATE OR REPLACE FUNCTION public.process_tax_declaration_decision(p_id uuid, p_action text, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := public._require_admin(); c record; e jsonb; v_type text; v_year text; v_ps text;
BEGIN
  IF p_action NOT IN ('approve','reject','return') THEN RAISE EXCEPTION 'Action invalide'; END IF;
  IF p_action <> 'approve' AND coalesce(trim(p_reason),'') = '' THEN RAISE EXCEPTION 'Motif obligatoire'; END IF;
  SELECT * INTO c FROM public.cadastral_contributions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Déclaration introuvable'; END IF;
  IF c.status NOT IN ('pending','returned','in_review') THEN RAISE EXCEPTION 'Cette demande a déjà été traitée.'; END IF;
  e := coalesce(c.tax_history->0, '{}'::jsonb);
  v_type := coalesce(e->>'tax_type', e->>'taxType', 'Taxe');
  v_year := coalesce(e->>'tax_year', e->>'taxYear', '');

  IF p_action = 'approve' THEN
    IF c.original_parcel_id IS NOT NULL THEN
      FOR e IN SELECT * FROM jsonb_array_elements(coalesce(c.tax_history,'[]'::jsonb)) LOOP
        v_ps := lower(coalesce(e->>'payment_status', e->>'paymentStatus', 'pending'));
        v_ps := CASE WHEN v_ps IN ('paid','payé','paye','completed') THEN 'paid' ELSE 'pending' END;
        INSERT INTO public.cadastral_tax_history(parcel_id, tax_year, amount_usd, payment_status, payment_date, receipt_document_url)
        VALUES (c.original_parcel_id,
          coalesce(e->>'tax_year', e->>'taxYear')::numeric::int,
          coalesce(nullif(coalesce(e->>'amount_usd', e->>'amountUsd', e->>'grand_total'),'')::numeric, 0),
          v_ps,
          nullif(coalesce(e->>'payment_date', e->>'paymentDate'),'')::date,
          coalesce(e->>'receipt_document_url', e->>'receiptDocumentUrl'));
      END LOOP;
    END IF;
    UPDATE public.cadastral_contributions SET status='approved', reviewed_by=v_admin, reviewed_at=now() WHERE id=p_id;
    PERFORM public._notify(c.user_id, 'Déclaration fiscale approuvée',
      format('Votre déclaration "%s" pour %s (exercice %s) a été approuvée.', v_type, c.parcel_number, v_year),
      'success', '/user-dashboard', 'tax:'||p_id||':approve');
  ELSIF p_action = 'reject' THEN
    UPDATE public.cadastral_contributions SET status='rejected', rejection_reason=trim(p_reason), rejected_by=v_admin, rejection_date=now(), reviewed_by=v_admin, reviewed_at=now() WHERE id=p_id;
    PERFORM public._notify(c.user_id, 'Déclaration fiscale rejetée',
      format('Votre déclaration "%s" pour %s a été rejetée. Motif : %s', v_type, c.parcel_number, trim(p_reason)),
      'error', '/user-dashboard', 'tax:'||p_id||':reject');
  ELSE
    UPDATE public.cadastral_contributions SET status='returned', change_justification=trim(p_reason), reviewed_by=v_admin, reviewed_at=now() WHERE id=p_id;
    PERFORM public._notify(c.user_id, 'Déclaration fiscale à corriger',
      format('Votre déclaration "%s" pour %s nécessite des corrections. Motif : %s', v_type, c.parcel_number, trim(p_reason)),
      'warning', '/user-dashboard', 'tax:'||p_id||':return:'||extract(epoch from now())::bigint);
  END IF;
  INSERT INTO public.audit_logs(action, user_id, record_id, table_name, new_values)
  VALUES ('tax_declaration_'||p_action, v_admin, p_id, 'cadastral_contributions', jsonb_build_object('parcel_number', c.parcel_number, 'reason', p_reason));
  RETURN jsonb_build_object('id', p_id, 'action', p_action);
END $$;

-- Titres fonciers
CREATE OR REPLACE FUNCTION public.process_land_title_decision(p_id uuid, p_action text, p_notes text DEFAULT NULL, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := public._require_admin(); r record; v_new text;
BEGIN
  v_new := CASE p_action WHEN 'approve' THEN 'approved' WHEN 'reject' THEN 'rejected' WHEN 'in_review' THEN 'in_review' END;
  IF v_new IS NULL THEN RAISE EXCEPTION 'Action invalide'; END IF;
  IF p_action = 'reject' AND coalesce(trim(p_reason),'') = '' THEN RAISE EXCEPTION 'Motif obligatoire'; END IF;
  SELECT * INTO r FROM public.land_title_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF r.status IN ('approved','rejected','cancelled','completed') THEN RAISE EXCEPTION 'Cette demande a déjà été traitée.'; END IF;
  UPDATE public.land_title_requests SET status=v_new, processing_notes=nullif(trim(p_notes),''),
    rejection_reason = CASE WHEN p_action='reject' THEN trim(p_reason) ELSE NULL END,
    reviewed_by=v_admin, reviewed_at=now(), updated_at=now() WHERE id=p_id;
  PERFORM public._notify(r.user_id,
    'Demande de titre foncier ' || CASE p_action WHEN 'approve' THEN 'approuvée' WHEN 'reject' THEN 'rejetée' ELSE 'en cours d''examen' END,
    CASE p_action WHEN 'approve' THEN format('Votre demande %s a été approuvée. Le certificat sera disponible dans votre espace.', r.reference_number)
      WHEN 'reject' THEN format('Votre demande %s a été rejetée. Motif : %s', r.reference_number, trim(p_reason))
      ELSE format('Votre demande %s est en cours d''examen.', r.reference_number) END,
    CASE p_action WHEN 'approve' THEN 'success' WHEN 'reject' THEN 'error' ELSE 'info' END,
    '/user-dashboard?tab=land-titles', 'land_title:'||p_id||':'||p_action);
  INSERT INTO public.audit_logs(action, user_id, record_id, table_name, new_values)
  VALUES ('land_title_'||p_action, v_admin, p_id, 'land_title_requests', jsonb_build_object('reference', r.reference_number, 'reason', p_reason));
  RETURN jsonb_build_object('id', p_id, 'status', v_new);
END $$;

-- Autorisations
CREATE OR REPLACE FUNCTION public.process_permit_decision(p_id uuid, p_action text, p_response text, p_permit_type text DEFAULT 'construction')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := public._require_admin(); c record; v_new text; v_parcel uuid; v_num text; v_data jsonb; v_t text; v_title text; v_msg text;
BEGIN
  v_new := CASE p_action WHEN 'approve' THEN 'approved' WHEN 'reject' THEN 'rejected' WHEN 'return' THEN 'returned' END;
  IF v_new IS NULL THEN RAISE EXCEPTION 'Action invalide'; END IF;
  SELECT * INTO c FROM public.cadastral_contributions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contribution non trouvée'; END IF;
  IF c.status NOT IN ('pending','returned','in_review') THEN RAISE EXCEPTION 'Cette demande a déjà été traitée.'; END IF;
  v_data := coalesce(c.permit_request_data, '{}'::jsonb) || jsonb_build_object('status', v_new, 'adminResponse', p_response, 'processedAt', now());
  IF p_action = 'approve' THEN
    SELECT id INTO v_parcel FROM public.cadastral_parcels WHERE parcel_number = c.parcel_number LIMIT 1;
    IF v_parcel IS NULL THEN RAISE EXCEPTION 'Parcelle non trouvée. Assurez-vous que la contribution a été approuvée.'; END IF;
    v_num := public.generate_permit_number(CASE WHEN p_permit_type='regularization' THEN 'regularization' ELSE 'construction' END, coalesce(c.province,'RDC'));
    INSERT INTO public.cadastral_building_permits(parcel_id, permit_number, issuing_service, issue_date, validity_period_months, administrative_status, is_current)
    VALUES (v_parcel, v_num, 'Service de l''Urbanisme', current_date, 36, 'Délivré', true);
    v_data := v_data || jsonb_build_object('permitNumber', v_num, 'parcelId', v_parcel);
  END IF;
  UPDATE public.cadastral_contributions SET permit_request_data=v_data, status=v_new, reviewed_by=v_admin, reviewed_at=now() WHERE id=p_id;
  INSERT INTO public.permit_admin_actions(contribution_id, admin_user_id, action_type, comment) VALUES (p_id, v_admin, v_new, p_response);
  IF p_action='approve' THEN v_t:='success'; v_title:='Autorisation délivrée !';
    v_msg := format('Votre autorisation %s a été délivrée pour la parcelle %s. Le certificat est disponible dans votre espace.', v_num, c.parcel_number);
  ELSIF p_action='reject' THEN v_t:='error'; v_title:='Demande rejetée';
    v_msg := format('Votre demande d''autorisation pour la parcelle %s a été rejetée. %s', c.parcel_number, coalesce(p_response,''));
  ELSE v_t:='warning'; v_title:='Demande renvoyée pour correction';
    v_msg := format('Votre demande d''autorisation pour la parcelle %s a été renvoyée pour correction. %s', c.parcel_number, coalesce(p_response,''));
  END IF;
  PERFORM public._notify(c.user_id, v_title, v_msg, v_t, '/user-dashboard?tab=building-permits',
    'permit:'||p_id||':'||p_action||CASE WHEN p_action='return' THEN ':'||extract(epoch from now())::bigint ELSE '' END);
  RETURN jsonb_build_object('id', p_id, 'status', v_new, 'permit_number', v_num, 'parcel_id', v_parcel);
END $$;

REVOKE ALL ON FUNCTION public.process_mortgage_decision(uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_tax_declaration_decision(uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_land_title_decision(uuid,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_permit_decision(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_mortgage_decision(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_tax_declaration_decision(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_land_title_decision(uuid,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_permit_decision(uuid,text,text,text) TO authenticated;

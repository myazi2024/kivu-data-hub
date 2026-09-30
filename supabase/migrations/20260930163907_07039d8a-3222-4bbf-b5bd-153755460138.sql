CREATE OR REPLACE FUNCTION public.process_ccc_appeal(p_id uuid, p_accept boolean, p_response text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_row record;
BEGIN
  IF NOT (public.has_role(v_uid,'admin'::app_role) OR public.has_role(v_uid,'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé: rôle administrateur requis';
  END IF;
  IF coalesce(btrim(p_response),'') = '' THEN RAISE EXCEPTION 'Réponse obligatoire'; END IF;

  SELECT id, user_id, parcel_number INTO v_row FROM public.cadastral_contributions
  WHERE id = p_id AND status = 'rejected' AND coalesce(appeal_status,'pending') = 'pending' AND appeal_submitted IS TRUE
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Appel introuvable ou déjà traité'; END IF;

  IF p_accept THEN
    UPDATE public.cadastral_contributions SET status='pending', appeal_status='accepted',
      rejection_reason=NULL, rejection_reasons=NULL, reviewed_by=NULL, reviewed_at=NULL WHERE id=p_id;
    INSERT INTO public.notifications(user_id,type,title,message,action_url) VALUES (v_row.user_id,'success','Appel accepté',
      'Votre appel pour la parcelle '||v_row.parcel_number||' a été accepté. La contribution est en cours de révision.','/user-dashboard?tab=contributions');
  ELSE
    UPDATE public.cadastral_contributions SET appeal_status='rejected' WHERE id=p_id;
    INSERT INTO public.notifications(user_id,type,title,message,action_url) VALUES (v_row.user_id,'error','Appel rejeté',
      'Votre appel pour la parcelle '||v_row.parcel_number||' a été rejeté. Motif: '||btrim(p_response),'/user-dashboard?tab=contributions');
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.withdraw_ccc_contribution(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF NOT (public.has_role(v_uid,'admin'::app_role) OR public.has_role(v_uid,'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé: rôle administrateur requis';
  END IF;
  UPDATE public.cadastral_contributions SET status='rejected', rejection_reason='Supprimée par l''administrateur',
    rejection_date=now(), rejected_by=v_uid, reviewed_by=v_uid, reviewed_at=now()
  WHERE id=p_id AND status <> 'rejected';
  IF NOT FOUND THEN RAISE EXCEPTION 'Contribution introuvable ou déjà retirée'; END IF;
END; $$;

REVOKE ALL ON FUNCTION public.process_ccc_appeal(uuid,boolean,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.withdraw_ccc_contribution(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_ccc_appeal(uuid,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_ccc_contribution(uuid) TO authenticated;
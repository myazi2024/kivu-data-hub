-- =========================================================================
-- AUDIT ADMIN MUTATIONS — P0 + P1
-- =========================================================================

-- 1) Colonnes manquantes pour stocker le certificat de mutation
ALTER TABLE public.mutation_requests
  ADD COLUMN IF NOT EXISTS certificate_url TEXT,
  ADD COLUMN IF NOT EXISTS certificate_issued_at TIMESTAMPTZ;

-- 2) Garde-fou serveur : invariants à l'approbation
CREATE OR REPLACE FUNCTION public.check_mutation_approval_invariants()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    IF COALESCE(NEW.payment_status, 'pending') <> 'paid' THEN
      RAISE EXCEPTION 'Impossible d''approuver une mutation non payée (payment_status=%).', NEW.payment_status;
    END IF;
    IF NEW.reviewed_by IS NULL THEN
      RAISE EXCEPTION 'L''identité du décideur (reviewed_by) est obligatoire pour approuver.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_mutation_approval ON public.mutation_requests;
CREATE TRIGGER trg_check_mutation_approval
  BEFORE UPDATE ON public.mutation_requests
  FOR EACH ROW EXECUTE FUNCTION public.check_mutation_approval_invariants();

-- 3) RPC : prendre en charge (pending -> in_review)
CREATE OR REPLACE FUNCTION public.take_charge_mutation_request(p_request_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner UUID; v_ref TEXT; v_status TEXT; v_pay TEXT;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT user_id, reference_number, status, payment_status
    INTO v_owner, v_ref, v_status, v_pay
  FROM public.mutation_requests WHERE id = p_request_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Demande introuvable';
  END IF;
  IF COALESCE(v_pay,'pending') <> 'paid' THEN
    RAISE EXCEPTION 'Le paiement doit être finalisé avant la prise en charge.';
  END IF;
  IF v_status NOT IN ('pending') THEN
    RAISE EXCEPTION 'Seules les demandes en attente peuvent être prises en charge (statut actuel: %).', v_status;
  END IF;

  UPDATE public.mutation_requests
     SET status = 'in_review',
         reviewed_by = auth.uid(),
         updated_at = now()
   WHERE id = p_request_id;

  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (v_owner, 'info',
          'Demande de mutation en cours d''examen',
          format('Votre demande %s est désormais en cours d''examen par nos services.', COALESCE(v_ref,'')),
          '/user-dashboard?tab=mutations');
END;
$$;

-- 4) RPC : escalader une mutation
CREATE OR REPLACE FUNCTION public.escalate_mutation_request(p_request_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.mutation_requests
     SET escalated = true,
         escalated_at = now(),
         processing_notes = COALESCE(processing_notes,'') || E'\n[Escalade ' || to_char(now(),'YYYY-MM-DD HH24:MI') || '] ' || COALESCE(p_reason,''),
         updated_at = now()
   WHERE id = p_request_id;

  INSERT INTO public.request_admin_audit (request_table, request_id, action, old_status, new_status, rejection_reason, admin_id)
  VALUES ('mutation_requests', p_request_id, 'escalated', NULL, NULL, p_reason, auth.uid());
END;
$$;

-- 5) RPC : décision atomique (approve / reject / hold / return)
CREATE OR REPLACE FUNCTION public.process_mutation_decision(
  p_request_id UUID,
  p_action TEXT,                -- 'approve' | 'reject' | 'hold' | 'return'
  p_notes TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL,
  p_certificate_url TEXT DEFAULT NULL  -- requis pour approve si on veut tracer l'URL signée privée
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new_status TEXT;
  v_owner UUID; v_ref TEXT; v_pay TEXT; v_status TEXT;
  v_notif_type TEXT; v_notif_title TEXT; v_notif_msg TEXT;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_action NOT IN ('approve','reject','hold','return') THEN
    RAISE EXCEPTION 'Action invalide: %', p_action;
  END IF;

  SELECT user_id, reference_number, payment_status, status
    INTO v_owner, v_ref, v_pay, v_status
  FROM public.mutation_requests WHERE id = p_request_id;

  IF v_status IS NULL THEN RAISE EXCEPTION 'Demande introuvable'; END IF;

  -- Invariants (le trigger valide aussi, on échoue tôt avec un message clair)
  IF p_action = 'approve' AND COALESCE(v_pay,'pending') <> 'paid' THEN
    RAISE EXCEPTION 'Impossible d''approuver une mutation non payée.';
  END IF;
  IF p_action = 'reject' AND (p_rejection_reason IS NULL OR length(trim(p_rejection_reason)) = 0) THEN
    RAISE EXCEPTION 'Un motif de rejet est requis.';
  END IF;

  v_new_status := CASE p_action
    WHEN 'approve' THEN 'approved'
    WHEN 'reject'  THEN 'rejected'
    WHEN 'hold'    THEN 'on_hold'
    WHEN 'return'  THEN 'returned'
  END;

  UPDATE public.mutation_requests
     SET status = v_new_status,
         processing_notes = COALESCE(NULLIF(trim(p_notes),''), processing_notes),
         rejection_reason = CASE WHEN p_action='reject' THEN trim(p_rejection_reason) ELSE NULL END,
         certificate_url = CASE WHEN p_action='approve' AND p_certificate_url IS NOT NULL THEN p_certificate_url ELSE certificate_url END,
         certificate_issued_at = CASE WHEN p_action='approve' AND p_certificate_url IS NOT NULL THEN now() ELSE certificate_issued_at END,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE id = p_request_id;

  -- Notification
  v_notif_type := CASE p_action
    WHEN 'approve' THEN 'success'
    WHEN 'reject'  THEN 'error'
    WHEN 'return'  THEN 'info'
    ELSE 'warning'
  END;
  v_notif_title := CASE p_action
    WHEN 'approve' THEN 'Demande de mutation approuvée'
    WHEN 'reject'  THEN 'Demande de mutation rejetée'
    WHEN 'return'  THEN 'Demande de mutation à corriger'
    ELSE 'Demande de mutation en attente'
  END;
  v_notif_msg := CASE p_action
    WHEN 'approve' THEN format('Votre demande %s a été approuvée. Le certificat est disponible dans votre espace.', COALESCE(v_ref,''))
    WHEN 'reject'  THEN format('Votre demande %s a été rejetée. Motif : %s', COALESCE(v_ref,''), p_rejection_reason)
    WHEN 'return'  THEN format('Votre demande %s a été renvoyée pour correction.%s', COALESCE(v_ref,''),
                               CASE WHEN p_notes IS NOT NULL AND length(trim(p_notes))>0 THEN ' Motif : '||trim(p_notes) ELSE '' END)
    ELSE format('Votre demande %s a été mise en attente.%s', COALESCE(v_ref,''),
                CASE WHEN p_notes IS NOT NULL AND length(trim(p_notes))>0 THEN ' Raison : '||trim(p_notes) ELSE '' END)
  END;

  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (v_owner, v_notif_type, v_notif_title, v_notif_msg, '/user-dashboard?tab=mutations');
END;
$$;

-- 6) RPC : URL signée du certificat de mutation (PII paid-access)
--    Le certificat est stocké dans le bucket privé 'expertise-certificates' (chemin relatif),
--    car ce bucket est déjà utilisé par certificateService.ts pour les autres types.
CREATE OR REPLACE FUNCTION public.get_signed_mutation_certificate(p_request_id UUID, p_ttl_seconds INT DEFAULT 600)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage AS $$
DECLARE
  v_url TEXT; v_path TEXT; v_owner UUID; v_pay TEXT; v_signed RECORD;
BEGIN
  SELECT user_id, certificate_url, payment_status
    INTO v_owner, v_url, v_pay
  FROM public.mutation_requests WHERE id = p_request_id;

  IF v_url IS NULL OR length(trim(v_url)) = 0 THEN RETURN NULL; END IF;
  IF auth.uid() <> v_owner AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() = v_owner AND COALESCE(v_pay,'pending') <> 'paid' THEN
    RAISE EXCEPTION 'Le paiement doit être finalisé pour télécharger le certificat.';
  END IF;

  -- Si c'est une URL absolue, on extrait le chemin objet à partir du marqueur du bucket
  v_path := regexp_replace(v_url, '^.*/expertise-certificates/', '');
  v_path := regexp_replace(v_path, '^.*/object/(public|sign)/expertise-certificates/', '');

  SELECT * INTO v_signed FROM storage.create_signed_url('expertise-certificates', v_path, p_ttl_seconds);
  RETURN v_signed.signed_url;
END;
$$;

-- 7) Audit des frais de mutation -> system_config_audit
CREATE OR REPLACE FUNCTION public.audit_mutation_fees_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.system_config_audit (config_key, action, new_value, changed_by)
    VALUES ('mutation_fees:'||NEW.id::text, 'INSERT', to_jsonb(NEW), auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.system_config_audit (config_key, action, old_value, new_value, changed_by)
    VALUES ('mutation_fees:'||NEW.id::text, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.system_config_audit (config_key, action, old_value, changed_by)
    VALUES ('mutation_fees:'||OLD.id::text, 'DELETE', to_jsonb(OLD), auth.uid());
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_mutation_fees ON public.mutation_fees_config;
CREATE TRIGGER trg_audit_mutation_fees
  AFTER INSERT OR UPDATE OR DELETE ON public.mutation_fees_config
  FOR EACH ROW EXECUTE FUNCTION public.audit_mutation_fees_change();

-- 8) Index utiles
CREATE INDEX IF NOT EXISTS idx_mutation_requests_status_created ON public.mutation_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mutation_requests_payment_status ON public.mutation_requests(payment_status);
CREATE INDEX IF NOT EXISTS idx_mutation_requests_user           ON public.mutation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_mutation_requests_search
  ON public.mutation_requests USING gin (to_tsvector('simple',
    coalesce(reference_number,'')||' '||coalesce(parcel_number,'')||' '||coalesce(requester_name,'')));

-- 9) Lockdown anon
REVOKE EXECUTE ON FUNCTION public.take_charge_mutation_request(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.escalate_mutation_request(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_mutation_decision(UUID, TEXT, TEXT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_signed_mutation_certificate(UUID, INT) FROM anon;
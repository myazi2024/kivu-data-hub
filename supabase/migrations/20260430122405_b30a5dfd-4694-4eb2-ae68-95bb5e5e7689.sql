-- =========================================================================
-- AUDIT EXPERTISES — P0 + P1 + P2
-- =========================================================================

-- 1) Garde-fou serveur : invariants à la complétion
CREATE OR REPLACE FUNCTION public.check_expertise_completion_invariants()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    IF COALESCE(NEW.payment_status, 'pending') <> 'paid' THEN
      RAISE EXCEPTION 'Impossible de finaliser une expertise non payée (payment_status=%).', NEW.payment_status;
    END IF;
    IF NEW.market_value_usd IS NULL OR NEW.market_value_usd <= 0 THEN
      RAISE EXCEPTION 'La valeur vénale doit être strictement positive pour finaliser.';
    END IF;
    IF NEW.certificate_url IS NULL OR length(trim(NEW.certificate_url)) = 0 THEN
      RAISE EXCEPTION 'Le certificat est obligatoire pour finaliser.';
    END IF;
    IF NEW.certificate_issue_date IS NULL OR NEW.certificate_expiry_date IS NULL THEN
      RAISE EXCEPTION 'Les dates d''émission et d''expiration du certificat sont obligatoires.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_expertise_completion ON public.real_estate_expertise_requests;
CREATE TRIGGER trg_check_expertise_completion
  BEFORE UPDATE ON public.real_estate_expertise_requests
  FOR EACH ROW EXECUTE FUNCTION public.check_expertise_completion_invariants();

-- 2) RPC stats agrégées (un appel)
CREATE OR REPLACE FUNCTION public.get_admin_expertise_stats(p_overdue_days INT DEFAULT 14)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.is_expert_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'total',       COUNT(*),
    'pending',     COUNT(*) FILTER (WHERE status='pending'),
    'assigned',    COUNT(*) FILTER (WHERE status='assigned'),
    'in_progress', COUNT(*) FILTER (WHERE status='in_progress'),
    'completed',   COUNT(*) FILTER (WHERE status='completed'),
    'rejected',    COUNT(*) FILTER (WHERE status='rejected'),
    'unpaid',      COUNT(*) FILTER (WHERE COALESCE(payment_status,'pending')<>'paid' AND status NOT IN ('rejected','completed')),
    'overdue',     COUNT(*) FILTER (WHERE status NOT IN ('completed','rejected') AND created_at < (now() - (p_overdue_days || ' days')::interval)),
    'escalated',   COUNT(*) FILTER (WHERE escalated_at IS NOT NULL AND status NOT IN ('completed','rejected'))
  ) INTO v
  FROM public.real_estate_expertise_requests;
  RETURN v;
END;
$$;

-- 3) RPC URL signée du certificat (PII paid-access)
CREATE OR REPLACE FUNCTION public.get_signed_expertise_certificate(p_request_id UUID, p_ttl_seconds INT DEFAULT 600)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage AS $$
DECLARE
  v_url TEXT; v_path TEXT; v_owner UUID; v_pay TEXT; v_signed RECORD;
BEGIN
  SELECT user_id, certificate_url, payment_status
    INTO v_owner, v_url, v_pay
  FROM public.real_estate_expertise_requests WHERE id = p_request_id;

  IF v_url IS NULL THEN RETURN NULL; END IF;
  IF auth.uid() <> v_owner AND NOT public.is_expert_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() = v_owner AND COALESCE(v_pay,'pending') <> 'paid' THEN
    RAISE EXCEPTION 'Le paiement doit être finalisé pour télécharger le certificat.';
  END IF;

  -- Extraire le chemin object dans le bucket
  v_path := regexp_replace(v_url, '^.*/expertise-certificates/', '');
  v_path := regexp_replace(v_path, '^.*/object/(public|sign)/expertise-certificates/', '');

  SELECT * INTO v_signed FROM storage.create_signed_url('expertise-certificates', v_path, p_ttl_seconds);
  RETURN v_signed.signed_url;
END;
$$;

-- 4) RPC : assigner un expert
CREATE OR REPLACE FUNCTION public.assign_expertise_request(p_request_id UUID, p_expert_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner UUID; v_parcel TEXT;
BEGIN
  IF NOT public.is_expert_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(p_expert_id, 'expert_immobilier') AND NOT public.has_role(p_expert_id, 'admin') THEN
    RAISE EXCEPTION 'L''utilisateur cible n''est pas un expert immobilier.';
  END IF;

  UPDATE public.real_estate_expertise_requests
     SET assigned_to = p_expert_id, assigned_at = now(),
         status = CASE WHEN status='pending' THEN 'assigned' ELSE status END,
         updated_at = now()
   WHERE id = p_request_id
   RETURNING user_id, parcel_number INTO v_owner, v_parcel;

  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (v_owner, 'info',
          'Votre demande d''expertise est assignée',
          format('Un expert a été assigné à votre demande pour la parcelle %s.', v_parcel),
          '/dashboard?tab=expertise');
END;
$$;

-- 5) RPC : escalader
CREATE OR REPLACE FUNCTION public.escalate_expertise_request(p_request_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_expert_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.real_estate_expertise_requests
     SET escalated_at = now(),
         processing_notes = COALESCE(processing_notes,'') || E'\n[Escalade ' || to_char(now(),'YYYY-MM-DD HH24:MI') || '] ' || COALESCE(p_reason,''),
         updated_at = now()
   WHERE id = p_request_id;

  INSERT INTO public.request_admin_audit (request_table, request_id, action, old_status, new_status, rejection_reason, admin_id)
  VALUES ('real_estate_expertise_requests', p_request_id, 'escalated', NULL, NULL, p_reason, auth.uid());
END;
$$;

-- 6) RPC : rejet atomique (motif obligatoire géré par trigger)
CREATE OR REPLACE FUNCTION public.reject_expertise_request(p_request_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner UUID; v_parcel TEXT;
BEGIN
  IF NOT public.is_expert_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Un motif de rejet est requis.';
  END IF;

  UPDATE public.real_estate_expertise_requests
     SET status='rejected', rejection_reason=p_reason, updated_at = now()
   WHERE id = p_request_id
   RETURNING user_id, parcel_number INTO v_owner, v_parcel;

  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (v_owner, 'error',
          'Demande d''expertise rejetée',
          format('Votre demande pour la parcelle %s a été rejetée. Motif : %s', v_parcel, p_reason),
          '/dashboard?tab=expertise');
END;
$$;

-- 7) RPC : finaliser (post-upload PDF)
CREATE OR REPLACE FUNCTION public.complete_expertise_request(
  p_request_id UUID,
  p_market_value NUMERIC,
  p_certificate_url TEXT,
  p_issue_date TIMESTAMPTZ,
  p_expiry_date TIMESTAMPTZ,
  p_notes TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner UUID; v_parcel TEXT;
BEGIN
  IF NOT public.is_expert_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.real_estate_expertise_requests
     SET status='completed',
         market_value_usd = p_market_value,
         certificate_url  = p_certificate_url,
         certificate_issue_date  = p_issue_date,
         certificate_expiry_date = p_expiry_date,
         expertise_date = p_issue_date,
         processing_notes = COALESCE(p_notes, processing_notes),
         updated_at = now()
   WHERE id = p_request_id
   RETURNING user_id, parcel_number INTO v_owner, v_parcel;

  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (v_owner, 'success',
          'Certificat d''expertise immobilière généré',
          format('Votre certificat pour la parcelle %s est disponible. Valeur vénale : $%s.', v_parcel, p_market_value),
          '/dashboard?tab=expertise');
END;
$$;

-- 8) Audit des frais d'expertise -> system_config_audit
CREATE OR REPLACE FUNCTION public.audit_expertise_fees_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.system_config_audit (config_key, action, new_value, changed_by)
    VALUES ('expertise_fees:'||NEW.id::text, 'INSERT', to_jsonb(NEW), auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.system_config_audit (config_key, action, old_value, new_value, changed_by)
    VALUES ('expertise_fees:'||NEW.id::text, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.system_config_audit (config_key, action, old_value, changed_by)
    VALUES ('expertise_fees:'||OLD.id::text, 'DELETE', to_jsonb(OLD), auth.uid());
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_expertise_fees ON public.expertise_fees_config;
CREATE TRIGGER trg_audit_expertise_fees
  AFTER INSERT OR UPDATE OR DELETE ON public.expertise_fees_config
  FOR EACH ROW EXECUTE FUNCTION public.audit_expertise_fees_change();

-- 9) Index utiles
CREATE INDEX IF NOT EXISTS idx_expertise_requests_status_created ON public.real_estate_expertise_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expertise_requests_assigned_to    ON public.real_estate_expertise_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_expertise_requests_search         ON public.real_estate_expertise_requests USING gin (to_tsvector('simple', coalesce(reference_number,'')||' '||coalesce(parcel_number,'')||' '||coalesce(requester_name,'')));

-- 10) Backfill : signaler les certificats publiquement exposés (legacy)
UPDATE public.real_estate_expertise_requests
   SET certificate_url = NULL,
       processing_notes = COALESCE(processing_notes,'') || E'\n[Backfill] Certificat à régénérer (URL publique legacy).'
 WHERE status = 'completed'
   AND certificate_url IS NOT NULL
   AND (certificate_url ILIKE '%/object/public/expertise-certificates/%' OR certificate_url ILIKE '%/storage/v1/object/public/expertise-certificates/%');
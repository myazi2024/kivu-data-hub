
-- DROP & RECREATE CHECK constraint sur cadastral_building_permits
ALTER TABLE public.cadastral_building_permits DROP CONSTRAINT IF EXISTS cadastral_building_permits_administrative_status_check;

-- 1. AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.request_admin_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_table TEXT NOT NULL,
  request_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  rejection_reason TEXT,
  admin_id UUID,
  admin_name TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_request_admin_audit_request ON public.request_admin_audit(request_table, request_id);
CREATE INDEX IF NOT EXISTS idx_request_admin_audit_created ON public.request_admin_audit(created_at DESC);
ALTER TABLE public.request_admin_audit ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can view all request audit" ON public.request_admin_audit
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "System can insert request audit" ON public.request_admin_audit
    FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. NORMALISATION STATUTS FR → EN
UPDATE public.cadastral_building_permits SET administrative_status = 'approved' WHERE administrative_status = 'Conforme';
UPDATE public.cadastral_building_permits SET administrative_status = 'pending' WHERE administrative_status = 'En attente';
UPDATE public.cadastral_building_permits SET administrative_status = 'rejected' WHERE administrative_status = 'Non autorisé';
UPDATE public.cadastral_building_permits SET administrative_status = 'in_review' WHERE administrative_status = 'En cours';

UPDATE public.cadastral_land_disputes SET current_status = 'in_review' WHERE current_status = 'en_cours';
UPDATE public.cadastral_land_disputes SET current_status = 'completed' WHERE current_status IN ('resolu', 'résolu');
UPDATE public.cadastral_land_disputes SET current_status = 'pending' WHERE current_status = 'demande_levee';

UPDATE public.cadastral_mortgages SET mortgage_status = 'approved' WHERE mortgage_status = 'active';
UPDATE public.cadastral_mortgages SET mortgage_status = 'in_review' WHERE mortgage_status IN ('en_défaut', 'en_defaut');
UPDATE public.cadastral_mortgages SET mortgage_status = 'completed' WHERE mortgage_status IN ('soldée', 'soldee');

-- Recréer une contrainte alignée sur l'enum standard
ALTER TABLE public.cadastral_building_permits ADD CONSTRAINT cadastral_building_permits_administrative_status_check
  CHECK (administrative_status IN ('pending', 'in_review', 'approved', 'rejected', 'completed', 'cancelled'));

-- 3. COLONNES ESCALATED
ALTER TABLE public.land_title_requests ADD COLUMN IF NOT EXISTS escalated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.land_title_requests ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
ALTER TABLE public.mutation_requests ADD COLUMN IF NOT EXISTS escalated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.mutation_requests ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
ALTER TABLE public.subdivision_requests ADD COLUMN IF NOT EXISTS escalated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.subdivision_requests ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
ALTER TABLE public.real_estate_expertise_requests ADD COLUMN IF NOT EXISTS escalated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.real_estate_expertise_requests ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
ALTER TABLE public.cadastral_land_disputes ADD COLUMN IF NOT EXISTS escalated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.cadastral_land_disputes ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
ALTER TABLE public.cadastral_mortgages ADD COLUMN IF NOT EXISTS escalated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.cadastral_mortgages ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

-- 4. TRIGGER enforce_rejection_motive
CREATE OR REPLACE FUNCTION public.enforce_rejection_motive()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status_col TEXT := TG_ARGV[0];
  v_motive_col TEXT := COALESCE(TG_ARGV[1], 'rejection_reason');
  v_new_status TEXT;
  v_motive TEXT;
BEGIN
  EXECUTE format('SELECT ($1).%I::text, ($1).%I::text', v_status_col, v_motive_col)
    INTO v_new_status, v_motive USING NEW;
  IF v_new_status = 'rejected' AND (v_motive IS NULL OR length(trim(v_motive)) = 0) THEN
    RAISE EXCEPTION 'Un motif de rejet est obligatoire (colonne %)', v_motive_col;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_rejection_ltr ON public.land_title_requests;
CREATE TRIGGER trg_enforce_rejection_ltr BEFORE INSERT OR UPDATE ON public.land_title_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rejection_motive('status', 'rejection_reason');
DROP TRIGGER IF EXISTS trg_enforce_rejection_mut ON public.mutation_requests;
CREATE TRIGGER trg_enforce_rejection_mut BEFORE INSERT OR UPDATE ON public.mutation_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rejection_motive('status', 'rejection_reason');
DROP TRIGGER IF EXISTS trg_enforce_rejection_sub ON public.subdivision_requests;
CREATE TRIGGER trg_enforce_rejection_sub BEFORE INSERT OR UPDATE ON public.subdivision_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rejection_motive('status', 'rejection_reason');
DROP TRIGGER IF EXISTS trg_enforce_rejection_exp ON public.real_estate_expertise_requests;
CREATE TRIGGER trg_enforce_rejection_exp BEFORE INSERT OR UPDATE ON public.real_estate_expertise_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rejection_motive('status', 'rejection_reason');

-- 5. TRIGGER audit_request_decisions
CREATE OR REPLACE FUNCTION public.audit_request_decisions()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status_col TEXT := TG_ARGV[0];
  v_old TEXT; v_new TEXT; v_motive TEXT; v_admin UUID := auth.uid();
BEGIN
  IF TG_OP = 'UPDATE' THEN
    EXECUTE format('SELECT ($1).%I::text', v_status_col) INTO v_old USING OLD;
    EXECUTE format('SELECT ($1).%I::text', v_status_col) INTO v_new USING NEW;
    IF v_old IS DISTINCT FROM v_new THEN
      BEGIN
        EXECUTE 'SELECT ($1).rejection_reason::text' INTO v_motive USING NEW;
      EXCEPTION WHEN OTHERS THEN v_motive := NULL; END;
      INSERT INTO public.request_admin_audit (request_table, request_id, action, old_status, new_status, rejection_reason, admin_id)
      VALUES (TG_TABLE_NAME, NEW.id, 'status_change', v_old, v_new, v_motive, v_admin);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_decisions_ltr ON public.land_title_requests;
CREATE TRIGGER trg_audit_decisions_ltr AFTER UPDATE ON public.land_title_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_request_decisions('status');
DROP TRIGGER IF EXISTS trg_audit_decisions_mut ON public.mutation_requests;
CREATE TRIGGER trg_audit_decisions_mut AFTER UPDATE ON public.mutation_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_request_decisions('status');
DROP TRIGGER IF EXISTS trg_audit_decisions_sub ON public.subdivision_requests;
CREATE TRIGGER trg_audit_decisions_sub AFTER UPDATE ON public.subdivision_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_request_decisions('status');
DROP TRIGGER IF EXISTS trg_audit_decisions_exp ON public.real_estate_expertise_requests;
CREATE TRIGGER trg_audit_decisions_exp AFTER UPDATE ON public.real_estate_expertise_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_request_decisions('status');
DROP TRIGGER IF EXISTS trg_audit_decisions_perm ON public.cadastral_building_permits;
CREATE TRIGGER trg_audit_decisions_perm AFTER UPDATE ON public.cadastral_building_permits
  FOR EACH ROW EXECUTE FUNCTION public.audit_request_decisions('administrative_status');
DROP TRIGGER IF EXISTS trg_audit_decisions_disp ON public.cadastral_land_disputes;
CREATE TRIGGER trg_audit_decisions_disp AFTER UPDATE ON public.cadastral_land_disputes
  FOR EACH ROW EXECUTE FUNCTION public.audit_request_decisions('current_status');
DROP TRIGGER IF EXISTS trg_audit_decisions_mort ON public.cadastral_mortgages;
CREATE TRIGGER trg_audit_decisions_mort AFTER UPDATE ON public.cadastral_mortgages
  FOR EACH ROW EXECUTE FUNCTION public.audit_request_decisions('mortgage_status');

-- 6. RPC regenerate_missing_certificates
CREATE OR REPLACE FUNCTION public.regenerate_missing_certificates()
RETURNS TABLE(request_table TEXT, request_id UUID, reference_number TEXT, user_id UUID, approved_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  RETURN QUERY
  SELECT 'land_title_requests'::TEXT, ltr.id, ltr.reference_number, ltr.user_id, ltr.updated_at
  FROM public.land_title_requests ltr
  LEFT JOIN public.document_verifications dv 
    ON dv.metadata->>'request_id' = ltr.id::text 
    AND dv.document_type = 'land_title'::document_type
  WHERE ltr.status = 'approved' AND dv.id IS NULL
  UNION ALL
  SELECT 'mutation_requests'::TEXT, mr.id, mr.reference_number, mr.user_id, mr.updated_at
  FROM public.mutation_requests mr
  LEFT JOIN public.document_verifications dv 
    ON dv.metadata->>'request_id' = mr.id::text
    AND dv.document_type = 'mutation_certificate'::document_type
  WHERE mr.status = 'approved' AND dv.id IS NULL;
END;
$$;

-- 7. RPC escalate_stale_requests
CREATE OR REPLACE FUNCTION public.escalate_stale_requests(p_days INTEGER DEFAULT 30)
RETURNS TABLE(service TEXT, escalated_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.land_title_requests SET escalated = true, escalated_at = now()
    WHERE escalated = false AND status IN ('pending', 'in_review') AND created_at < now() - (p_days || ' days')::interval;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  service := 'land_title_requests'; escalated_count := v_count; RETURN NEXT;

  UPDATE public.mutation_requests SET escalated = true, escalated_at = now()
    WHERE escalated = false AND status IN ('pending', 'in_review') AND created_at < now() - (p_days || ' days')::interval;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  service := 'mutation_requests'; escalated_count := v_count; RETURN NEXT;

  UPDATE public.subdivision_requests SET escalated = true, escalated_at = now()
    WHERE escalated = false AND status IN ('pending', 'in_review') AND created_at < now() - (p_days || ' days')::interval;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  service := 'subdivision_requests'; escalated_count := v_count; RETURN NEXT;

  UPDATE public.real_estate_expertise_requests SET escalated = true, escalated_at = now()
    WHERE escalated = false AND status IN ('pending', 'in_review') AND created_at < now() - (p_days || ' days')::interval;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  service := 'real_estate_expertise_requests'; escalated_count := v_count; RETURN NEXT;

  UPDATE public.cadastral_land_disputes SET escalated = true, escalated_at = now()
    WHERE escalated = false AND current_status IN ('pending', 'in_review') AND created_at < now() - (p_days * 2 || ' days')::interval;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  service := 'cadastral_land_disputes'; escalated_count := v_count; RETURN NEXT;

  UPDATE public.cadastral_mortgages SET escalated = true, escalated_at = now()
    WHERE escalated = false AND mortgage_status = 'in_review' AND created_at < now() - (p_days || ' days')::interval;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  service := 'cadastral_mortgages'; escalated_count := v_count; RETURN NEXT;
END;
$$;

-- 8. SLA CONFIG TABLE
CREATE TABLE IF NOT EXISTS public.service_sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key TEXT NOT NULL UNIQUE,
  service_label TEXT NOT NULL,
  target_days INTEGER NOT NULL DEFAULT 30,
  warning_days INTEGER NOT NULL DEFAULT 20,
  critical_days INTEGER NOT NULL DEFAULT 45,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_sla_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read SLA config" ON public.service_sla_config FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage SLA config" ON public.service_sla_config FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO public.service_sla_config (service_key, service_label, target_days, warning_days, critical_days) VALUES
  ('land_title_requests', 'Titre foncier', 30, 20, 45),
  ('mutation_requests', 'Mutation foncière', 21, 14, 30),
  ('subdivision_requests', 'Lotissement', 45, 30, 60),
  ('real_estate_expertise_requests', 'Expertise immobilière', 14, 10, 21),
  ('cadastral_building_permits', 'Autorisation de bâtir', 30, 20, 45),
  ('cadastral_land_disputes', 'Litige foncier', 60, 45, 90),
  ('cadastral_mortgages', 'Hypothèque', 21, 14, 30)
ON CONFLICT (service_key) DO NOTHING;

-- 9. VUE requests_health_overview
CREATE OR REPLACE VIEW public.requests_health_overview AS
SELECT 'land_title_requests'::TEXT AS service, 'Titre foncier'::TEXT AS service_label,
  COUNT(*)::INTEGER AS total,
  COUNT(*) FILTER (WHERE status = 'pending')::INTEGER AS pending,
  COUNT(*) FILTER (WHERE status = 'in_review')::INTEGER AS in_review,
  COUNT(*) FILTER (WHERE status = 'approved')::INTEGER AS approved,
  COUNT(*) FILTER (WHERE status = 'rejected')::INTEGER AS rejected,
  COUNT(*) FILTER (WHERE status IN ('pending','in_review') AND created_at < now() - interval '30 days')::INTEGER AS stale_30d,
  COUNT(*) FILTER (WHERE escalated = true)::INTEGER AS escalated_count
FROM public.land_title_requests
UNION ALL SELECT 'mutation_requests', 'Mutation foncière', COUNT(*)::INTEGER,
  COUNT(*) FILTER (WHERE status = 'pending')::INTEGER, COUNT(*) FILTER (WHERE status = 'in_review')::INTEGER,
  COUNT(*) FILTER (WHERE status = 'approved')::INTEGER, COUNT(*) FILTER (WHERE status = 'rejected')::INTEGER,
  COUNT(*) FILTER (WHERE status IN ('pending','in_review') AND created_at < now() - interval '30 days')::INTEGER,
  COUNT(*) FILTER (WHERE escalated = true)::INTEGER
FROM public.mutation_requests
UNION ALL SELECT 'subdivision_requests', 'Lotissement', COUNT(*)::INTEGER,
  COUNT(*) FILTER (WHERE status = 'pending')::INTEGER, COUNT(*) FILTER (WHERE status = 'in_review')::INTEGER,
  COUNT(*) FILTER (WHERE status = 'approved')::INTEGER, COUNT(*) FILTER (WHERE status = 'rejected')::INTEGER,
  COUNT(*) FILTER (WHERE status IN ('pending','in_review') AND created_at < now() - interval '30 days')::INTEGER,
  COUNT(*) FILTER (WHERE escalated = true)::INTEGER
FROM public.subdivision_requests
UNION ALL SELECT 'real_estate_expertise_requests', 'Expertise immobilière', COUNT(*)::INTEGER,
  COUNT(*) FILTER (WHERE status = 'pending')::INTEGER, COUNT(*) FILTER (WHERE status = 'in_review')::INTEGER,
  COUNT(*) FILTER (WHERE status = 'approved')::INTEGER, COUNT(*) FILTER (WHERE status = 'rejected')::INTEGER,
  COUNT(*) FILTER (WHERE status IN ('pending','in_review') AND created_at < now() - interval '30 days')::INTEGER,
  COUNT(*) FILTER (WHERE escalated = true)::INTEGER
FROM public.real_estate_expertise_requests
UNION ALL SELECT 'cadastral_building_permits', 'Autorisation de bâtir', COUNT(*)::INTEGER,
  COUNT(*) FILTER (WHERE administrative_status = 'pending')::INTEGER,
  COUNT(*) FILTER (WHERE administrative_status = 'in_review')::INTEGER,
  COUNT(*) FILTER (WHERE administrative_status = 'approved')::INTEGER,
  COUNT(*) FILTER (WHERE administrative_status = 'rejected')::INTEGER,
  COUNT(*) FILTER (WHERE administrative_status IN ('pending','in_review') AND created_at < now() - interval '30 days')::INTEGER,
  0::INTEGER
FROM public.cadastral_building_permits
UNION ALL SELECT 'cadastral_land_disputes', 'Litige foncier', COUNT(*)::INTEGER,
  COUNT(*) FILTER (WHERE current_status = 'pending')::INTEGER,
  COUNT(*) FILTER (WHERE current_status = 'in_review')::INTEGER,
  COUNT(*) FILTER (WHERE current_status = 'completed')::INTEGER,
  COUNT(*) FILTER (WHERE current_status = 'rejected')::INTEGER,
  COUNT(*) FILTER (WHERE current_status IN ('pending','in_review') AND created_at < now() - interval '60 days')::INTEGER,
  COUNT(*) FILTER (WHERE escalated = true)::INTEGER
FROM public.cadastral_land_disputes
UNION ALL SELECT 'cadastral_mortgages', 'Hypothèque', COUNT(*)::INTEGER,
  COUNT(*) FILTER (WHERE mortgage_status = 'pending')::INTEGER,
  COUNT(*) FILTER (WHERE mortgage_status = 'in_review')::INTEGER,
  COUNT(*) FILTER (WHERE mortgage_status = 'approved')::INTEGER,
  COUNT(*) FILTER (WHERE mortgage_status = 'rejected')::INTEGER,
  COUNT(*) FILTER (WHERE mortgage_status = 'in_review' AND created_at < now() - interval '30 days')::INTEGER,
  COUNT(*) FILTER (WHERE escalated = true)::INTEGER
FROM public.cadastral_mortgages;

GRANT SELECT ON public.requests_health_overview TO authenticated;

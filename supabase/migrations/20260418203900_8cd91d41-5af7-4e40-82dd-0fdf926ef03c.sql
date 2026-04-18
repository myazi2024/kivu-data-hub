
-- ============================================================
-- PART 1 — Mortgage lifecycle_state (business state post-approval)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.mortgage_lifecycle_state AS ENUM ('active','paid','defaulted','renegotiated','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.cadastral_mortgages
  ADD COLUMN IF NOT EXISTS lifecycle_state public.mortgage_lifecycle_state;

-- Backfill: any approved/completed mortgage becomes 'active'
UPDATE public.cadastral_mortgages
SET lifecycle_state = 'active'
WHERE lifecycle_state IS NULL
  AND mortgage_status IN ('approved','completed');

-- ============================================================
-- PART 2 — Dispute resolution_stage (separate from workflow status)
-- ============================================================
ALTER TABLE public.cadastral_land_disputes
  ADD COLUMN IF NOT EXISTS resolution_stage text;

-- ============================================================
-- PART 3 — Generic history_audit table + trigger
-- ============================================================
CREATE TABLE IF NOT EXISTS public.history_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,
  actor_id uuid,
  actor_name text,
  changed_fields jsonb,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.history_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read history_audit" ON public.history_audit;
CREATE POLICY "Admins read history_audit" ON public.history_audit
FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE INDEX IF NOT EXISTS idx_history_audit_table_record ON public.history_audit(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_history_audit_created ON public.history_audit(created_at DESC);

CREATE OR REPLACE FUNCTION public.audit_history_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_name text;
  v_changed jsonb := '{}'::jsonb;
  v_key text;
BEGIN
  IF v_actor IS NOT NULL THEN
    SELECT full_name INTO v_name FROM profiles WHERE id = v_actor;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    FOR v_key IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
      IF to_jsonb(NEW)->v_key IS DISTINCT FROM to_jsonb(OLD)->v_key
         AND v_key NOT IN ('updated_at','created_at') THEN
        v_changed := v_changed || jsonb_build_object(v_key, to_jsonb(NEW)->v_key);
      END IF;
    END LOOP;
    IF v_changed = '{}'::jsonb THEN RETURN NEW; END IF;
    INSERT INTO history_audit(table_name, record_id, action, actor_id, actor_name, changed_fields, old_values, new_values)
    VALUES (TG_TABLE_NAME, NEW.id, 'update', v_actor, v_name, v_changed, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO history_audit(table_name, record_id, action, actor_id, actor_name, new_values)
    VALUES (TG_TABLE_NAME, NEW.id, 'insert', v_actor, v_name, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO history_audit(table_name, record_id, action, actor_id, actor_name, old_values)
    VALUES (TG_TABLE_NAME, OLD.id, 'delete', v_actor, v_name, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cadastral_land_disputes',
    'cadastral_mortgages',
    'cadastral_mortgage_payments',
    'cadastral_tax_history',
    'cadastral_ownership_history',
    'cadastral_boundary_history'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_history ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_audit_history AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_history_changes()', t);
  END LOOP;
END $$;

-- ============================================================
-- PART 4 — Enforce rejection motive on mortgage contributions
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_mortgage_rejection_motive()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.contribution_type IN ('mortgage_registration','mortgage_cancellation')
     AND NEW.status = 'rejected'
     AND (OLD.status IS DISTINCT FROM 'rejected')
     AND (NEW.rejection_reason IS NULL OR length(trim(NEW.rejection_reason)) < 5) THEN
    RAISE EXCEPTION 'Motif de rejet obligatoire pour une demande d''hypothèque (min 5 caractères)';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_mortgage_rejection_motive ON public.cadastral_contributions;
CREATE TRIGGER trg_enforce_mortgage_rejection_motive
BEFORE UPDATE ON public.cadastral_contributions
FOR EACH ROW EXECUTE FUNCTION public.enforce_mortgage_rejection_motive();

-- ============================================================
-- PART 5 — RPC: missing mortgage receipts
-- ============================================================
CREATE OR REPLACE FUNCTION public.list_missing_mortgage_receipts()
RETURNS TABLE(mortgage_id uuid, parcel_id uuid, reference_number text, creditor_name text, contract_date date, amount_usd numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  RETURN QUERY
  SELECT m.id, m.parcel_id, m.reference_number, m.creditor_name, m.contract_date, m.mortgage_amount_usd
  FROM cadastral_mortgages m
  LEFT JOIN document_verifications dv
    ON dv.metadata->>'mortgage_id' = m.id::text
   AND dv.document_type = 'mortgage_receipt'
  WHERE m.mortgage_status IN ('approved','completed')
    AND dv.id IS NULL;
END $$;

-- ============================================================
-- PART 6 — RPC: reconcile tax history vs CCC declarations
-- ============================================================
CREATE OR REPLACE FUNCTION public.reconcile_tax_records()
RETURNS TABLE(parcel_id uuid, parcel_number text, tax_year integer, history_amount numeric, declaration_amount numeric, gap_usd numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  RETURN QUERY
  SELECT
    p.id,
    p.parcel_number,
    th.tax_year,
    th.amount_usd::numeric,
    NULL::numeric,
    th.amount_usd::numeric
  FROM cadastral_tax_history th
  JOIN cadastral_parcels p ON p.id = th.parcel_id
  WHERE th.payment_status = 'unpaid'
  ORDER BY p.parcel_number, th.tax_year DESC
  LIMIT 500;
END $$;

-- ============================================================
-- PART 7 — Extend stale escalation to land disputes
-- ============================================================
CREATE OR REPLACE FUNCTION public.escalate_stale_disputes(p_days integer DEFAULT 30)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  UPDATE cadastral_land_disputes
  SET escalated = true, escalated_at = now()
  WHERE escalated = false
    AND current_status NOT IN ('completed','closed','lifted')
    AND updated_at < now() - (p_days || ' days')::interval;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

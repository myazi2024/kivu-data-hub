-- 1) ARCHIVE TABLES
CREATE TABLE IF NOT EXISTS public.archived_invoices (
  LIKE public.cadastral_invoices INCLUDING ALL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archived_by uuid,
  archive_reason text
);
ALTER TABLE public.archived_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage archived invoices" ON public.archived_invoices;
CREATE POLICY "Admins manage archived invoices" ON public.archived_invoices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.archived_transactions (
  LIKE public.payment_transactions INCLUDING ALL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archived_by uuid,
  archive_reason text
);
ALTER TABLE public.archived_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage archived transactions" ON public.archived_transactions;
CREATE POLICY "Admins manage archived transactions" ON public.archived_transactions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2) BILLING CONFIG AUDIT
CREATE TABLE IF NOT EXISTS public.billing_config_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  admin_name text,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_config_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read billing audit" ON public.billing_config_audit;
CREATE POLICY "Admins read billing audit" ON public.billing_config_audit
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins insert billing audit" ON public.billing_config_audit;
CREATE POLICY "Admins insert billing audit" ON public.billing_config_audit
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_billing_audit_created ON public.billing_config_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_audit_table ON public.billing_config_audit(table_name);

-- 3) TRIGGER: sync invoice when transaction completed
CREATE OR REPLACE FUNCTION public.sync_invoice_on_tx_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') AND NEW.invoice_id IS NOT NULL THEN
    UPDATE public.cadastral_invoices
       SET status = 'paid', payment_id = NEW.id, updated_at = now()
     WHERE id = NEW.invoice_id AND status <> 'paid';
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_sync_invoice_on_tx ON public.payment_transactions;
CREATE TRIGGER trg_sync_invoice_on_tx
AFTER INSERT OR UPDATE OF status ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_on_tx_completed();

-- 4) TRIGGER: generate reseller_sale on paid invoice
CREATE OR REPLACE FUNCTION public.generate_reseller_sale_on_paid_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dc record; v_commission numeric;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') AND NEW.discount_code_used IS NOT NULL THEN
    SELECT dc.id, dc.reseller_id, r.commission_rate, r.fixed_commission_usd
      INTO v_dc
      FROM public.discount_codes dc
      JOIN public.resellers r ON r.id = dc.reseller_id
     WHERE dc.code = NEW.discount_code_used
     LIMIT 1;
    IF FOUND THEN
      v_commission := COALESCE(v_dc.fixed_commission_usd,0)
                    + COALESCE(NEW.total_amount_usd,0) * COALESCE(v_dc.commission_rate,0) / 100.0;
      IF NOT EXISTS (SELECT 1 FROM public.reseller_sales WHERE invoice_id = NEW.id) THEN
        INSERT INTO public.reseller_sales(reseller_id, invoice_id, payment_id, discount_code_id,
          sale_amount_usd, discount_applied_usd, commission_earned_usd)
        VALUES (v_dc.reseller_id, NEW.id, NEW.payment_id, v_dc.id,
          NEW.total_amount_usd, COALESCE(NEW.discount_amount_usd,0), v_commission);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_reseller_sale_on_paid ON public.cadastral_invoices;
CREATE TRIGGER trg_reseller_sale_on_paid
AFTER UPDATE OF status ON public.cadastral_invoices
FOR EACH ROW EXECUTE FUNCTION public.generate_reseller_sale_on_paid_invoice();

-- 5) TRIGGER: enforce discount code traceability
CREATE OR REPLACE FUNCTION public.enforce_discount_code_traceability()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.discount_amount_usd,0) > 0
     AND (NEW.discount_code_used IS NULL OR length(trim(NEW.discount_code_used)) = 0) THEN
    RAISE EXCEPTION 'discount_code_used is required when discount_amount_usd > 0';
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_enforce_discount_traceability ON public.cadastral_invoices;
CREATE TRIGGER trg_enforce_discount_traceability
BEFORE INSERT OR UPDATE ON public.cadastral_invoices
FOR EACH ROW EXECUTE FUNCTION public.enforce_discount_code_traceability();

-- 6) CRON FUNCTIONS
CREATE OR REPLACE FUNCTION public.expire_discount_codes()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.discount_codes
     SET is_active = false, updated_at = now()
   WHERE is_active = true AND expires_at IS NOT NULL AND expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;$$;

CREATE OR REPLACE FUNCTION public.auto_cancel_stale_pending()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer := 0; v_n integer;
BEGIN
  UPDATE public.cadastral_invoices
     SET status = 'cancelled', updated_at = now()
   WHERE status = 'pending' AND created_at < now() - interval '30 days';
  GET DIAGNOSTICS v_n = ROW_COUNT; v_count := v_count + v_n;

  UPDATE public.expertise_payments
     SET status = 'cancelled', updated_at = now()
   WHERE status = 'pending' AND created_at < now() - interval '30 days';
  GET DIAGNOSTICS v_n = ROW_COUNT; v_count := v_count + v_n;
  RETURN v_count;
END;$$;

-- 7) ADMIN PURGE FUNCTION
CREATE OR REPLACE FUNCTION public.purge_test_billing_data(p_reason text DEFAULT 'manual_admin_purge')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid(); v_inv_count integer := 0; v_tx_count integer := 0;
BEGIN
  IF NOT public.has_role(v_admin,'admin') THEN
    RAISE EXCEPTION 'Only admins can purge test billing data';
  END IF;

  WITH moved AS (
    DELETE FROM public.payment_transactions
     WHERE provider ILIKE 'TEST%' OR payment_method ILIKE 'TEST%'
    RETURNING *
  )
  INSERT INTO public.archived_transactions
  SELECT m.*, now(), v_admin, p_reason FROM moved m;
  GET DIAGNOSTICS v_tx_count = ROW_COUNT;

  WITH moved AS (
    DELETE FROM public.cadastral_invoices
     WHERE parcel_number ILIKE 'TEST-%'
        OR client_email ILIKE '%test%'
        OR client_email ILIKE '%example.com'
    RETURNING *
  )
  INSERT INTO public.archived_invoices
  SELECT m.*, now(), v_admin, p_reason FROM moved m;
  GET DIAGNOSTICS v_inv_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'archived_invoices', v_inv_count,
    'archived_transactions', v_tx_count,
    'archived_at', now()
  );
END;$$;

-- 8) BACKFILL reseller_sales for paid invoices with code
INSERT INTO public.reseller_sales (
  reseller_id, invoice_id, payment_id, discount_code_id,
  sale_amount_usd, discount_applied_usd, commission_earned_usd)
SELECT 
  dc.reseller_id, ci.id, ci.payment_id, dc.id,
  ci.total_amount_usd, COALESCE(ci.discount_amount_usd,0),
  COALESCE(r.fixed_commission_usd,0) + COALESCE(ci.total_amount_usd,0) * COALESCE(r.commission_rate,0) / 100.0
FROM public.cadastral_invoices ci
JOIN public.discount_codes dc ON dc.code = ci.discount_code_used
JOIN public.resellers r ON r.id = dc.reseller_id
WHERE ci.status = 'paid'
  AND ci.discount_code_used IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.reseller_sales rs WHERE rs.invoice_id = ci.id);

-- 9) ANOMALY VIEW
CREATE OR REPLACE VIEW public.billing_anomalies AS
SELECT 'tx_completed_invoice_unpaid'::text AS anomaly_type,
       pt.id::text AS ref_id, pt.invoice_id::text AS related_id,
       pt.amount_usd AS amount, pt.created_at
  FROM public.payment_transactions pt
  JOIN public.cadastral_invoices ci ON ci.id = pt.invoice_id
 WHERE pt.status = 'completed' AND ci.status <> 'paid'
UNION ALL
SELECT 'discount_without_code', ci.id::text, NULL,
       ci.discount_amount_usd, ci.created_at
  FROM public.cadastral_invoices ci
 WHERE COALESCE(ci.discount_amount_usd,0) > 0
   AND (ci.discount_code_used IS NULL OR length(trim(ci.discount_code_used))=0)
UNION ALL
SELECT 'expired_active_discount_code', dc.id::text, NULL,
       NULL, dc.created_at
  FROM public.discount_codes dc
 WHERE dc.is_active = true AND dc.expires_at IS NOT NULL AND dc.expires_at < now();

GRANT SELECT ON public.billing_anomalies TO authenticated;

-- 10) CRON SCHEDULES (pg_cron assumed installed)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.unschedule('expire_discount_codes_daily')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='expire_discount_codes_daily');
    PERFORM cron.schedule('expire_discount_codes_daily','30 3 * * *','SELECT public.expire_discount_codes();');

    PERFORM cron.unschedule('auto_cancel_stale_pending_daily')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='auto_cancel_stale_pending_daily');
    PERFORM cron.schedule('auto_cancel_stale_pending_daily','0 4 * * *','SELECT public.auto_cancel_stale_pending();');
  END IF;
END $$;
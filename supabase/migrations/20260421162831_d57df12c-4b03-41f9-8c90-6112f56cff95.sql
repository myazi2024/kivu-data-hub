-- ============================================================
-- PASSTHROUGH BILLING — Refacturation des frais providers
-- ============================================================

CREATE TABLE public.passthrough_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type text NOT NULL CHECK (scope_type IN ('reseller','partner','payment_method','global')),
  scope_id text,
  scope_label text,
  markup_pct numeric(6,3) NOT NULL DEFAULT 0 CHECK (markup_pct >= 0 AND markup_pct <= 100),
  min_amount_usd numeric(12,2) NOT NULL DEFAULT 0 CHECK (min_amount_usd >= 0),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','quarterly')),
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope_type, scope_id)
);

CREATE TABLE public.passthrough_invoice_seq_year (
  year integer PRIMARY KEY,
  last_value integer NOT NULL DEFAULT 0
);

CREATE TABLE public.passthrough_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.passthrough_rules(id) ON DELETE SET NULL,
  scope_type text NOT NULL,
  scope_id text,
  scope_label text,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_provider_fees_usd numeric(14,4) NOT NULL DEFAULT 0,
  markup_pct numeric(6,3) NOT NULL DEFAULT 0,
  markup_amount_usd numeric(14,4) NOT NULL DEFAULT 0,
  total_billed_usd numeric(14,4) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  transaction_count integer NOT NULL DEFAULT 0,
  consistency_check_passed boolean NOT NULL DEFAULT true,
  consistency_notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','sent','paid','disputed','cancelled')),
  invoice_number text UNIQUE,
  pdf_url text,
  validated_at timestamptz,
  validated_by uuid,
  sent_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope_type, scope_id, period_start, period_end)
);

CREATE INDEX idx_pt_invoices_status ON public.passthrough_invoices (status);
CREATE INDEX idx_pt_invoices_period ON public.passthrough_invoices (period_start, period_end);
CREATE INDEX idx_pt_invoices_scope ON public.passthrough_invoices (scope_type, scope_id);

CREATE TABLE public.passthrough_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passthrough_invoice_id uuid NOT NULL REFERENCES public.passthrough_invoices(id) ON DELETE CASCADE,
  payment_transaction_id uuid NOT NULL REFERENCES public.payment_transactions(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  payment_method text,
  provider_fee_usd numeric(14,4) NOT NULL DEFAULT 0,
  markup_pct numeric(6,3) NOT NULL DEFAULT 0,
  markup_usd numeric(14,4) NOT NULL DEFAULT 0,
  billed_usd numeric(14,4) NOT NULL DEFAULT 0,
  transaction_date timestamptz NOT NULL,
  invoice_id uuid,
  reseller_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (passthrough_invoice_id, payment_transaction_id)
);

CREATE INDEX idx_pt_lines_invoice ON public.passthrough_invoice_lines (passthrough_invoice_id);
CREATE INDEX idx_pt_lines_txn ON public.passthrough_invoice_lines (payment_transaction_id);

CREATE TRIGGER trg_pt_rules_updated_at BEFORE UPDATE ON public.passthrough_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pt_invoices_updated_at BEFORE UPDATE ON public.passthrough_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.check_passthrough_line_consistency()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_expected numeric(14,4);
BEGIN
  v_expected := round(NEW.provider_fee_usd * (1 + NEW.markup_pct / 100.0), 4);
  IF abs(NEW.markup_usd - (v_expected - NEW.provider_fee_usd)) > 0.01 THEN
    RAISE EXCEPTION 'Passthrough line inconsistency: markup_usd % does not match expected %', NEW.markup_usd, (v_expected - NEW.provider_fee_usd);
  END IF;
  IF abs(NEW.billed_usd - v_expected) > 0.01 THEN
    RAISE EXCEPTION 'Passthrough line inconsistency: billed_usd % does not match expected %', NEW.billed_usd, v_expected;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_passthrough_line_consistency
  BEFORE INSERT OR UPDATE ON public.passthrough_invoice_lines
  FOR EACH ROW EXECUTE FUNCTION public.check_passthrough_line_consistency();

ALTER TABLE public.passthrough_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passthrough_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passthrough_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passthrough_invoice_seq_year ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage passthrough_rules" ON public.passthrough_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins manage passthrough_invoices" ON public.passthrough_invoices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins manage passthrough_invoice_lines" ON public.passthrough_invoice_lines
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins manage passthrough_seq" ON public.passthrough_invoice_seq_year
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.next_passthrough_invoice_number(p_period_start date)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM p_period_start)::int;
  v_month integer := EXTRACT(MONTH FROM p_period_start)::int;
  v_next integer;
BEGIN
  INSERT INTO public.passthrough_invoice_seq_year (year, last_value)
    VALUES (v_year, 1)
    ON CONFLICT (year) DO UPDATE SET last_value = passthrough_invoice_seq_year.last_value + 1
    RETURNING last_value INTO v_next;
  RETURN 'PT-' || lpad(v_year::text, 4, '0') || lpad(v_month::text, 2, '0') || '-' || lpad(v_next::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_eligible_passthrough_transactions(
  p_scope_type text,
  p_scope_id text,
  p_period_start date,
  p_period_end date
) RETURNS TABLE (
  transaction_id uuid,
  provider text,
  payment_method text,
  provider_fee_usd numeric,
  transaction_date timestamptz,
  invoice_id uuid,
  reseller_id uuid
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT pt.id, pt.provider, pt.payment_method, pt.provider_fee_usd, pt.created_at, pt.invoice_id, rs.reseller_id
  FROM public.payment_transactions pt
  LEFT JOIN public.reseller_sales rs ON rs.invoice_id = pt.invoice_id
  WHERE pt.status = 'completed'
    AND pt.provider_fee_usd > 0
    AND pt.created_at >= p_period_start
    AND pt.created_at < (p_period_end + interval '1 day')
    AND (
      p_scope_type = 'global'
      OR (p_scope_type = 'payment_method' AND pt.payment_method = p_scope_id)
      OR (p_scope_type = 'reseller' AND rs.reseller_id::text = p_scope_id)
      OR (p_scope_type = 'partner' AND pt.metadata->>'partner_id' = p_scope_id)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_eligible_passthrough_transactions_count(
  p_scope_type text,
  p_scope_id text,
  p_period_start date,
  p_period_end date
) RETURNS TABLE (txn_count integer, total_fees_usd numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT count(*)::int, COALESCE(sum(t.provider_fee_usd), 0)::numeric
  FROM public.get_eligible_passthrough_transactions(p_scope_type, p_scope_id, p_period_start, p_period_end) t;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_passthrough_invoices(
  p_period_start date,
  p_period_end date
) RETURNS TABLE (
  invoice_id uuid,
  scope_type text,
  scope_id text,
  total_billed_usd numeric,
  transaction_count integer,
  status text,
  message text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rule RECORD;
  v_total_fees numeric;
  v_count integer;
  v_markup_amount numeric;
  v_total_billed numeric;
  v_invoice_id uuid;
  v_existing uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  FOR v_rule IN SELECT * FROM public.passthrough_rules WHERE active = true LOOP
    SELECT id INTO v_existing FROM public.passthrough_invoices
      WHERE scope_type = v_rule.scope_type
        AND scope_id IS NOT DISTINCT FROM v_rule.scope_id
        AND period_start = p_period_start
        AND period_end = p_period_end;
    IF v_existing IS NOT NULL THEN
      invoice_id := v_existing; scope_type := v_rule.scope_type; scope_id := v_rule.scope_id;
      total_billed_usd := 0; transaction_count := 0; status := 'skipped'; message := 'Already exists';
      RETURN NEXT; CONTINUE;
    END IF;

    SELECT t.txn_count, t.total_fees_usd INTO v_count, v_total_fees
      FROM public.get_eligible_passthrough_transactions_count(v_rule.scope_type, v_rule.scope_id, p_period_start, p_period_end) t;

    v_total_fees := COALESCE(v_total_fees, 0);
    v_count := COALESCE(v_count, 0);

    IF v_total_fees < v_rule.min_amount_usd OR v_count = 0 THEN
      invoice_id := NULL; scope_type := v_rule.scope_type; scope_id := v_rule.scope_id;
      total_billed_usd := v_total_fees; transaction_count := v_count; status := 'skipped';
      message := 'Below threshold or no transactions';
      RETURN NEXT; CONTINUE;
    END IF;

    v_markup_amount := round(v_total_fees * v_rule.markup_pct / 100.0, 4);
    v_total_billed := v_total_fees + v_markup_amount;

    INSERT INTO public.passthrough_invoices (
      rule_id, scope_type, scope_id, scope_label,
      period_start, period_end,
      total_provider_fees_usd, markup_pct, markup_amount_usd, total_billed_usd,
      transaction_count, consistency_check_passed, status
    ) VALUES (
      v_rule.id, v_rule.scope_type, v_rule.scope_id, v_rule.scope_label,
      p_period_start, p_period_end,
      v_total_fees, v_rule.markup_pct, v_markup_amount, v_total_billed,
      v_count, true, 'draft'
    ) RETURNING id INTO v_invoice_id;

    INSERT INTO public.passthrough_invoice_lines (
      passthrough_invoice_id, payment_transaction_id, provider, payment_method,
      provider_fee_usd, markup_pct, markup_usd, billed_usd, transaction_date,
      invoice_id, reseller_id
    )
    SELECT v_invoice_id, t.transaction_id, t.provider, t.payment_method,
           t.provider_fee_usd, v_rule.markup_pct,
           round(t.provider_fee_usd * v_rule.markup_pct / 100.0, 4),
           round(t.provider_fee_usd * (1 + v_rule.markup_pct / 100.0), 4),
           t.transaction_date, t.invoice_id, t.reseller_id
    FROM public.get_eligible_passthrough_transactions(v_rule.scope_type, v_rule.scope_id, p_period_start, p_period_end) t;

    invoice_id := v_invoice_id; scope_type := v_rule.scope_type; scope_id := v_rule.scope_id;
    total_billed_usd := v_total_billed; transaction_count := v_count; status := 'created';
    message := 'Draft created';
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_passthrough_invoice(p_invoice_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv RECORD;
  v_recomputed_fees numeric;
  v_recomputed_total numeric;
  v_recomputed_count integer;
  v_invoice_number text;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  SELECT * INTO v_inv FROM public.passthrough_invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF v_inv.status <> 'draft' THEN RAISE EXCEPTION 'Only draft invoices can be validated (current: %)', v_inv.status; END IF;

  SELECT t.txn_count, t.total_fees_usd INTO v_recomputed_count, v_recomputed_fees
    FROM public.get_eligible_passthrough_transactions_count(v_inv.scope_type, v_inv.scope_id, v_inv.period_start, v_inv.period_end) t;

  v_recomputed_fees := COALESCE(v_recomputed_fees, 0);
  v_recomputed_total := round(v_recomputed_fees * (1 + v_inv.markup_pct / 100.0), 4);

  IF abs(v_recomputed_total - v_inv.total_billed_usd) > 0.01 THEN
    UPDATE public.passthrough_invoices
      SET consistency_check_passed = false,
          consistency_notes = format('Recompute mismatch: stored %s vs recomputed %s', v_inv.total_billed_usd, v_recomputed_total)
      WHERE id = p_invoice_id;
    RAISE EXCEPTION 'Consistency check failed: stored % vs recomputed %', v_inv.total_billed_usd, v_recomputed_total;
  END IF;

  v_invoice_number := public.next_passthrough_invoice_number(v_inv.period_start);
  UPDATE public.passthrough_invoices
    SET status = 'validated',
        invoice_number = v_invoice_number,
        validated_at = now(),
        validated_by = auth.uid(),
        consistency_check_passed = true,
        consistency_notes = NULL
    WHERE id = p_invoice_id;

  RETURN jsonb_build_object('invoice_id', p_invoice_id, 'invoice_number', v_invoice_number, 'total_billed_usd', v_recomputed_total);
END;
$$;

CREATE OR REPLACE VIEW public.passthrough_billing_summary AS
SELECT
  date_trunc('month', period_start)::date AS month,
  count(*) FILTER (WHERE status NOT IN ('cancelled')) AS invoice_count,
  count(*) FILTER (WHERE status = 'draft') AS draft_count,
  count(*) FILTER (WHERE status = 'validated') AS validated_count,
  count(*) FILTER (WHERE status = 'sent') AS sent_count,
  count(*) FILTER (WHERE status = 'paid') AS paid_count,
  count(*) FILTER (WHERE consistency_check_passed = false) AS inconsistent_count,
  COALESCE(sum(total_provider_fees_usd) FILTER (WHERE status NOT IN ('cancelled')), 0) AS total_fees_usd,
  COALESCE(sum(markup_amount_usd) FILTER (WHERE status NOT IN ('cancelled')), 0) AS total_markup_usd,
  COALESCE(sum(total_billed_usd) FILTER (WHERE status NOT IN ('cancelled')), 0) AS total_billed_usd
FROM public.passthrough_invoices
WHERE period_start >= (now() - interval '12 months')::date
GROUP BY 1
ORDER BY 1 DESC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto_generate_passthrough') THEN
    PERFORM cron.schedule(
      'auto_generate_passthrough',
      '0 2 1 * *',
      $cron$
        SELECT public.generate_passthrough_invoices(
          (date_trunc('month', now()) - interval '1 month')::date,
          (date_trunc('month', now()) - interval '1 day')::date
        );
      $cron$
    );
  END IF;
END $$;
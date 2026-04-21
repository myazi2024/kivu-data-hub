
-- ============================================================
-- 1. TABLE fiscal_periods
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fiscal_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL CHECK (year >= 2000 AND year <= 2100),
  month integer CHECK (month IS NULL OR (month >= 1 AND month <= 12)),
  period_type text NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('monthly', 'yearly')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'locked')),
  closed_at timestamptz,
  closed_by uuid,
  closed_by_name text,
  reopened_at timestamptz,
  reopened_by uuid,
  reopen_reason text,
  revenue_total_usd numeric(14,2) NOT NULL DEFAULT 0,
  tva_collected_usd numeric(14,2) NOT NULL DEFAULT 0,
  invoice_count integer NOT NULL DEFAULT 0,
  credit_note_count integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fiscal_periods_unique UNIQUE (year, month, period_type),
  CONSTRAINT fiscal_periods_monthly_has_month CHECK (
    (period_type = 'monthly' AND month IS NOT NULL) OR
    (period_type = 'yearly' AND month IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_fiscal_periods_year_month ON public.fiscal_periods(year, month);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_status ON public.fiscal_periods(status);

ALTER TABLE public.fiscal_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view fiscal periods" ON public.fiscal_periods;
CREATE POLICY "Admins can view fiscal periods"
  ON public.fiscal_periods FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

DROP TRIGGER IF EXISTS trg_fiscal_periods_updated_at ON public.fiscal_periods;
CREATE TRIGGER trg_fiscal_periods_updated_at
  BEFORE UPDATE ON public.fiscal_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. TABLE accounting_journal_entries
-- ============================================================
CREATE TABLE IF NOT EXISTS public.accounting_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL,
  journal_code text NOT NULL CHECK (journal_code IN ('VTE', 'AVO', 'RBT', 'OD', 'BNQ')),
  piece_ref text NOT NULL,
  account_code text NOT NULL,
  account_label text NOT NULL,
  debit_usd numeric(14,2) NOT NULL DEFAULT 0 CHECK (debit_usd >= 0),
  credit_usd numeric(14,2) NOT NULL DEFAULT 0 CHECK (credit_usd >= 0),
  description text,
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  fiscal_period_id uuid REFERENCES public.fiscal_periods(id) ON DELETE SET NULL,
  currency_code text NOT NULL DEFAULT 'USD',
  exchange_rate_used numeric(12,6) NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT je_debit_xor_credit CHECK (
    (debit_usd > 0 AND credit_usd = 0) OR
    (credit_usd > 0 AND debit_usd = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_je_entry_date ON public.accounting_journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_je_journal_code ON public.accounting_journal_entries(journal_code);
CREATE INDEX IF NOT EXISTS idx_je_piece_ref ON public.accounting_journal_entries(piece_ref);
CREATE INDEX IF NOT EXISTS idx_je_account_code ON public.accounting_journal_entries(account_code);
CREATE INDEX IF NOT EXISTS idx_je_source ON public.accounting_journal_entries(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_je_fiscal_period ON public.accounting_journal_entries(fiscal_period_id);

ALTER TABLE public.accounting_journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view journal entries" ON public.accounting_journal_entries;
CREATE POLICY "Admins can view journal entries"
  ON public.accounting_journal_entries FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- ============================================================
-- 3. FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.find_or_create_fiscal_period(p_date date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM p_date)::integer;
  v_month integer := EXTRACT(MONTH FROM p_date)::integer;
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.fiscal_periods
  WHERE year = v_year AND month = v_month AND period_type = 'monthly';
  IF v_id IS NULL THEN
    INSERT INTO public.fiscal_periods (year, month, period_type, status)
    VALUES (v_year, v_month, 'monthly', 'open')
    ON CONFLICT (year, month, period_type) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_journal_entries_for_invoice(p_invoice_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv record; v_period_id uuid; v_entry_date date;
  v_total numeric; v_tva numeric; v_ht numeric;
BEGIN
  SELECT * INTO v_inv FROM public.cadastral_invoices WHERE id = p_invoice_id;
  IF NOT FOUND OR v_inv.status <> 'paid' THEN RETURN 0; END IF;
  IF EXISTS (SELECT 1 FROM public.accounting_journal_entries
    WHERE source_table = 'cadastral_invoices' AND source_id = p_invoice_id) THEN RETURN 0; END IF;

  v_entry_date := COALESCE(v_inv.paid_at::date, v_inv.created_at::date);
  v_period_id := find_or_create_fiscal_period(v_entry_date);
  v_total := v_inv.total_amount_usd;
  v_tva := ROUND(v_total - (v_total / 1.16), 2);
  v_ht := v_total - v_tva;

  INSERT INTO public.accounting_journal_entries
    (entry_date, journal_code, piece_ref, account_code, account_label, debit_usd, credit_usd,
     description, source_table, source_id, fiscal_period_id, currency_code, exchange_rate_used)
  VALUES
    (v_entry_date, 'VTE', v_inv.invoice_number, '411000', 'Clients', v_total, 0,
     'Facture ' || v_inv.invoice_number || ' - ' || COALESCE(v_inv.client_name, v_inv.client_email),
     'cadastral_invoices', p_invoice_id, v_period_id, v_inv.currency_code, v_inv.exchange_rate_used),
    (v_entry_date, 'VTE', v_inv.invoice_number, '706000', 'Prestations de services', 0, v_ht,
     'Vente services - ' || v_inv.parcel_number,
     'cadastral_invoices', p_invoice_id, v_period_id, v_inv.currency_code, v_inv.exchange_rate_used),
    (v_entry_date, 'VTE', v_inv.invoice_number, '4457', 'TVA collectée 16%', 0, v_tva,
     'TVA 16% sur ' || v_inv.invoice_number,
     'cadastral_invoices', p_invoice_id, v_period_id, v_inv.currency_code, v_inv.exchange_rate_used);
  RETURN 3;
END;
$$;

CREATE OR REPLACE FUNCTION public.regenerate_journal_for_invoice(p_invoice_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  DELETE FROM public.accounting_journal_entries
  WHERE source_table = 'cadastral_invoices' AND source_id = p_invoice_id;
  RETURN generate_journal_entries_for_invoice(p_invoice_id);
END;
$$;

-- ============================================================
-- 4. TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_invoice_paid_generate_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    PERFORM generate_journal_entries_for_invoice(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_journal_on_invoice_paid ON public.cadastral_invoices;
CREATE TRIGGER trg_generate_journal_on_invoice_paid
  AFTER INSERT OR UPDATE OF status ON public.cadastral_invoices
  FOR EACH ROW EXECUTE FUNCTION public.trg_invoice_paid_generate_journal();

CREATE OR REPLACE FUNCTION public.trg_credit_note_generate_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv record; v_period_id uuid; v_entry_date date;
  v_total numeric; v_tva numeric; v_ht numeric;
BEGIN
  IF NEW.status NOT IN ('issued', 'applied') THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.accounting_journal_entries
    WHERE source_table = 'cadastral_credit_notes' AND source_id = NEW.id) THEN RETURN NEW; END IF;

  SELECT * INTO v_inv FROM public.cadastral_invoices WHERE id = NEW.original_invoice_id;
  v_entry_date := NEW.issued_at::date;
  v_period_id := find_or_create_fiscal_period(v_entry_date);
  v_total := NEW.amount_usd;
  v_tva := ROUND(v_total - (v_total / 1.16), 2);
  v_ht := v_total - v_tva;

  INSERT INTO public.accounting_journal_entries
    (entry_date, journal_code, piece_ref, account_code, account_label, debit_usd, credit_usd,
     description, source_table, source_id, fiscal_period_id, currency_code, exchange_rate_used)
  VALUES
    (v_entry_date, 'AVO', NEW.credit_note_number, '411000', 'Clients', 0, v_total,
     'Avoir ' || NEW.credit_note_number || ' / Facture ' || COALESCE(v_inv.invoice_number, '?'),
     'cadastral_credit_notes', NEW.id, v_period_id, NEW.currency_code, NEW.exchange_rate_used),
    (v_entry_date, 'AVO', NEW.credit_note_number, '706000', 'Prestations de services', v_ht, 0,
     'Annulation vente - ' || NEW.reason,
     'cadastral_credit_notes', NEW.id, v_period_id, NEW.currency_code, NEW.exchange_rate_used),
    (v_entry_date, 'AVO', NEW.credit_note_number, '4457', 'TVA collectée 16%', v_tva, 0,
     'Annulation TVA sur avoir ' || NEW.credit_note_number,
     'cadastral_credit_notes', NEW.id, v_period_id, NEW.currency_code, NEW.exchange_rate_used);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_journal_on_credit_note ON public.cadastral_credit_notes;
CREATE TRIGGER trg_generate_journal_on_credit_note
  AFTER INSERT OR UPDATE OF status ON public.cadastral_credit_notes
  FOR EACH ROW EXECUTE FUNCTION public.trg_credit_note_generate_journal();

CREATE OR REPLACE FUNCTION public.trg_prevent_invoice_in_closed_period()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_period_status text; v_check_date date;
BEGIN
  v_check_date := COALESCE(NEW.paid_at::date, NEW.created_at::date, current_date);
  SELECT status INTO v_period_status FROM public.fiscal_periods
  WHERE year = EXTRACT(YEAR FROM v_check_date)::integer
    AND month = EXTRACT(MONTH FROM v_check_date)::integer
    AND period_type = 'monthly';
  IF v_period_status IN ('closed', 'locked') THEN
    RAISE EXCEPTION 'La période fiscale % est clôturée. Aucune écriture ne peut y être ajoutée.',
      to_char(v_check_date, 'YYYY-MM');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_invoice_closed_period ON public.cadastral_invoices;
CREATE TRIGGER trg_prevent_invoice_closed_period
  BEFORE INSERT OR UPDATE ON public.cadastral_invoices
  FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_invoice_in_closed_period();

-- ============================================================
-- 5. RPC close / reopen
-- ============================================================
CREATE OR REPLACE FUNCTION public.close_fiscal_period(p_year integer, p_month integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid; v_revenue numeric := 0; v_tva numeric := 0;
  v_inv_count integer := 0; v_cn_count integer := 0; v_admin_name text;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT
    COALESCE(SUM(total_amount_usd), 0),
    COALESCE(SUM(ROUND(total_amount_usd - (total_amount_usd / 1.16), 2)), 0),
    COUNT(*)
  INTO v_revenue, v_tva, v_inv_count
  FROM public.cadastral_invoices
  WHERE status = 'paid'
    AND EXTRACT(YEAR FROM COALESCE(paid_at, created_at)) = p_year
    AND EXTRACT(MONTH FROM COALESCE(paid_at, created_at)) = p_month;

  SELECT COUNT(*) INTO v_cn_count FROM public.cadastral_credit_notes
  WHERE EXTRACT(YEAR FROM issued_at) = p_year AND EXTRACT(MONTH FROM issued_at) = p_month;

  SELECT COALESCE(full_name, email) INTO v_admin_name FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.fiscal_periods
    (year, month, period_type, status, closed_at, closed_by, closed_by_name,
     revenue_total_usd, tva_collected_usd, invoice_count, credit_note_count)
  VALUES (p_year, p_month, 'monthly', 'closed', now(), auth.uid(), v_admin_name,
     v_revenue, v_tva, v_inv_count, v_cn_count)
  ON CONFLICT (year, month, period_type) DO UPDATE SET
    status = 'closed', closed_at = now(), closed_by = auth.uid(), closed_by_name = v_admin_name,
    revenue_total_usd = EXCLUDED.revenue_total_usd, tva_collected_usd = EXCLUDED.tva_collected_usd,
    invoice_count = EXCLUDED.invoice_count, credit_note_count = EXCLUDED.credit_note_count,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'id', v_id, 'year', p_year, 'month', p_month, 'status', 'closed',
    'revenue_total_usd', v_revenue, 'tva_collected_usd', v_tva,
    'invoice_count', v_inv_count, 'credit_note_count', v_cn_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_fiscal_period(p_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Seul un super_admin peut réouvrir une période fiscale';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'Motif requis (minimum 10 caractères)';
  END IF;
  UPDATE public.fiscal_periods
  SET status = 'open', reopened_at = now(), reopened_by = auth.uid(),
      reopen_reason = p_reason, updated_at = now()
  WHERE id = p_id AND status = 'closed';
  IF NOT FOUND THEN RAISE EXCEPTION 'Période introuvable ou non clôturée'; END IF;
  RETURN jsonb_build_object('id', p_id, 'status', 'open', 'reopened_at', now());
END;
$$;

-- ============================================================
-- 6. VIEW + RPC TVA
-- ============================================================
CREATE OR REPLACE VIEW public.tva_collected_by_period AS
SELECT
  EXTRACT(YEAR FROM COALESCE(paid_at, created_at))::integer AS year,
  EXTRACT(MONTH FROM COALESCE(paid_at, created_at))::integer AS month,
  currency_code,
  COUNT(*) AS invoice_count,
  COALESCE(SUM(total_amount_usd), 0) AS total_ttc_usd,
  COALESCE(SUM(ROUND(total_amount_usd / 1.16, 2)), 0) AS total_ht_usd,
  COALESCE(SUM(ROUND(total_amount_usd - (total_amount_usd / 1.16), 2)), 0) AS tva_collected_usd
FROM public.cadastral_invoices
WHERE status = 'paid'
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 2 DESC;

CREATE OR REPLACE FUNCTION public.get_tva_declaration(p_year integer, p_month integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total_ht numeric := 0; v_total_ttc numeric := 0; v_tva_collected numeric := 0;
  v_invoice_count integer := 0; v_credit_note_total numeric := 0; v_period_status text;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT COALESCE(SUM(total_ttc_usd), 0), COALESCE(SUM(total_ht_usd), 0),
    COALESCE(SUM(tva_collected_usd), 0), COALESCE(SUM(invoice_count), 0)
  INTO v_total_ttc, v_total_ht, v_tva_collected, v_invoice_count
  FROM public.tva_collected_by_period WHERE year = p_year AND month = p_month;

  SELECT COALESCE(SUM(amount_usd), 0) INTO v_credit_note_total
  FROM public.cadastral_credit_notes
  WHERE status IN ('issued', 'applied')
    AND EXTRACT(YEAR FROM issued_at) = p_year AND EXTRACT(MONTH FROM issued_at) = p_month;

  SELECT status INTO v_period_status FROM public.fiscal_periods
  WHERE year = p_year AND month = p_month AND period_type = 'monthly';

  RETURN jsonb_build_object(
    'year', p_year, 'month', p_month, 'period_status', COALESCE(v_period_status, 'open'),
    'total_ttc_usd', v_total_ttc, 'total_ht_usd', v_total_ht,
    'tva_collected_usd', v_tva_collected, 'tva_deductible_usd', 0,
    'tva_to_pay_usd', v_tva_collected, 'invoice_count', v_invoice_count,
    'credit_note_total_usd', v_credit_note_total, 'tva_rate', 0.16, 'generated_at', now()
  );
END;
$$;

-- ============================================================
-- 7. Backfill
-- ============================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.cadastral_invoices WHERE status = 'paid' LIMIT 5000
  LOOP
    BEGIN
      PERFORM public.generate_journal_entries_for_invoice(r.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped invoice %: %', r.id, SQLERRM;
    END;
  END LOOP;
END $$;

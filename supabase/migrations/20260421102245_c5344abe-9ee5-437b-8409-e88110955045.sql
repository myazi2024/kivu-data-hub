-- 1. Ajout colonnes source sur cadastral_invoices (F6)
ALTER TABLE public.cadastral_invoices
  ADD COLUMN IF NOT EXISTS source_request_id uuid,
  ADD COLUMN IF NOT EXISTS source_request_type text;

CREATE INDEX IF NOT EXISTS idx_cadastral_invoices_source
  ON public.cadastral_invoices(source_request_type, source_request_id)
  WHERE source_request_id IS NOT NULL;

COMMENT ON COLUMN public.cadastral_invoices.source_request_type IS
  'Type de demande source: ccc | mutation | expertise | permit | land_title | subdivision | catalog';

-- 2. Numérotation avoirs (F1)
CREATE TABLE IF NOT EXISTS public.cadastral_credit_note_seq_year (
  year integer PRIMARY KEY,
  last_value integer NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.generate_credit_note_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM now())::int;
  v_next integer;
BEGIN
  INSERT INTO public.cadastral_credit_note_seq_year(year, last_value)
  VALUES (v_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_value = public.cadastral_credit_note_seq_year.last_value + 1
  RETURNING last_value INTO v_next;
  RETURN 'AV-' || v_year || '-' || lpad(v_next::text, 4, '0');
END;
$$;

-- 3. Table remboursements (F2)
CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.cadastral_invoices(id) ON DELETE SET NULL,
  payment_id uuid,
  payment_transaction_id uuid,
  amount_usd numeric(12,2) NOT NULL CHECK (amount_usd > 0),
  currency_code text NOT NULL DEFAULT 'USD',
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','cancelled')),
  provider text,
  provider_refund_id text,
  provider_response jsonb,
  initiated_by uuid,
  initiated_by_name text,
  notes text,
  failure_reason text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_invoice ON public.payment_refunds(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_status ON public.payment_refunds(status);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_created ON public.payment_refunds(created_at DESC);

ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage refunds"
  ON public.payment_refunds FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_payment_refunds_updated
  BEFORE UPDATE ON public.payment_refunds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Table relances factures impayées (F4)
CREATE TABLE IF NOT EXISTS public.invoice_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.cadastral_invoices(id) ON DELETE CASCADE,
  reminder_number integer NOT NULL DEFAULT 1,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email','sms','whatsapp')),
  recipient text NOT NULL,
  subject text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed','bounced','opened','clicked')),
  error_message text,
  sent_by text NOT NULL DEFAULT 'system' CHECK (sent_by IN ('system','admin')),
  sent_by_user uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_reminders_invoice ON public.invoice_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_created ON public.invoice_reminders(created_at DESC);

ALTER TABLE public.invoice_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view reminders"
  ON public.invoice_reminders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins insert reminders"
  ON public.invoice_reminders FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 5. Export FEC (F3)
CREATE OR REPLACE FUNCTION public.export_fec_period(_start_date date, _end_date date)
RETURNS TABLE (
  journal_code text,
  journal_lib text,
  ecriture_num text,
  ecriture_date date,
  compte_num text,
  compte_lib text,
  comp_aux_num text,
  comp_aux_lib text,
  piece_ref text,
  piece_date date,
  ecriture_lib text,
  debit numeric,
  credit numeric,
  ecriture_let text,
  date_let date,
  valid_date date,
  montant_devise numeric,
  idevise text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  RETURN QUERY
  -- Factures payées : débit 411 client, crédit 706 ventes (et 4457 TVA)
  SELECT
    'VTE'::text AS journal_code,
    'Ventes'::text AS journal_lib,
    i.invoice_number AS ecriture_num,
    COALESCE(i.paid_at::date, i.created_at::date) AS ecriture_date,
    '411000'::text AS compte_num,
    'Clients'::text AS compte_lib,
    COALESCE(i.client_id_nat, i.client_email) AS comp_aux_num,
    COALESCE(i.client_name, i.client_email) AS comp_aux_lib,
    i.invoice_number AS piece_ref,
    i.created_at::date AS piece_date,
    ('Facture ' || i.parcel_number)::text AS ecriture_lib,
    i.total_amount_usd AS debit,
    0::numeric AS credit,
    NULL::text AS ecriture_let,
    NULL::date AS date_let,
    i.created_at::date AS valid_date,
    i.total_amount_usd * i.exchange_rate_used AS montant_devise,
    i.currency_code AS idevise
  FROM public.cadastral_invoices i
  WHERE i.status = 'paid'
    AND COALESCE(i.paid_at::date, i.created_at::date) BETWEEN _start_date AND _end_date

  UNION ALL

  SELECT
    'VTE', 'Ventes', i.invoice_number,
    COALESCE(i.paid_at::date, i.created_at::date),
    '706000', 'Prestations de services',
    NULL, NULL,
    i.invoice_number, i.created_at::date,
    ('Facture ' || i.parcel_number),
    0::numeric, i.total_amount_usd,
    NULL, NULL, i.created_at::date,
    i.total_amount_usd * i.exchange_rate_used, i.currency_code
  FROM public.cadastral_invoices i
  WHERE i.status = 'paid'
    AND COALESCE(i.paid_at::date, i.created_at::date) BETWEEN _start_date AND _end_date

  UNION ALL

  -- Avoirs : contre-passation
  SELECT
    'AVO', 'Avoirs', cn.credit_note_number,
    cn.issued_at::date,
    '706000', 'Prestations de services',
    NULL, NULL,
    cn.credit_note_number, cn.issued_at::date,
    ('Avoir sur ' || COALESCE(i.invoice_number, '?')),
    cn.amount_usd, 0::numeric,
    NULL, NULL, cn.issued_at::date,
    cn.amount_usd * cn.exchange_rate_used, cn.currency_code
  FROM public.cadastral_credit_notes cn
  LEFT JOIN public.cadastral_invoices i ON i.id = cn.original_invoice_id
  WHERE cn.status = 'issued'
    AND cn.issued_at::date BETWEEN _start_date AND _end_date

  UNION ALL

  SELECT
    'AVO', 'Avoirs', cn.credit_note_number,
    cn.issued_at::date,
    '411000', 'Clients',
    COALESCE(i.client_id_nat, i.client_email),
    COALESCE(i.client_name, i.client_email),
    cn.credit_note_number, cn.issued_at::date,
    ('Avoir sur ' || COALESCE(i.invoice_number, '?')),
    0::numeric, cn.amount_usd,
    NULL, NULL, cn.issued_at::date,
    cn.amount_usd * cn.exchange_rate_used, cn.currency_code
  FROM public.cadastral_credit_notes cn
  LEFT JOIN public.cadastral_invoices i ON i.id = cn.original_invoice_id
  WHERE cn.status = 'issued'
    AND cn.issued_at::date BETWEEN _start_date AND _end_date

  ORDER BY ecriture_date, ecriture_num, compte_num;
END;
$$;

GRANT EXECUTE ON FUNCTION public.export_fec_period(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_credit_note_number() TO authenticated;
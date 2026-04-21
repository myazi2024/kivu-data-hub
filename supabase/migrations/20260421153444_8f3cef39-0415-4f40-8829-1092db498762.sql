-- 1. due_date sur cadastral_invoices
ALTER TABLE public.cadastral_invoices
  ADD COLUMN IF NOT EXISTS due_date timestamptz;

UPDATE public.cadastral_invoices
SET due_date = created_at + interval '30 days'
WHERE due_date IS NULL;

CREATE OR REPLACE FUNCTION public.set_invoice_due_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  terms_days int := 30;
  cfg_val jsonb;
BEGIN
  IF NEW.due_date IS NULL THEN
    SELECT config_value INTO cfg_val
    FROM public.cadastral_search_config
    WHERE config_key = 'invoice_payment_terms_days' AND is_active = true
    LIMIT 1;
    IF cfg_val IS NOT NULL THEN
      BEGIN terms_days := (cfg_val#>>'{}')::int;
      EXCEPTION WHEN others THEN terms_days := 30;
      END;
    END IF;
    NEW.due_date := COALESCE(NEW.created_at, now()) + (terms_days || ' days')::interval;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_invoice_due_date ON public.cadastral_invoices;
CREATE TRIGGER trg_set_invoice_due_date
BEFORE INSERT ON public.cadastral_invoices
FOR EACH ROW EXECUTE FUNCTION public.set_invoice_due_date();

INSERT INTO public.cadastral_search_config (config_key, config_value, description, is_active)
VALUES ('invoice_payment_terms_days', '30'::jsonb, 'Délai de paiement par défaut (jours)', true)
ON CONFLICT (config_key) DO NOTHING;

-- 2. Aligner invoice_reminders existante
ALTER TABLE public.invoice_reminders
  ADD COLUMN IF NOT EXISTS sent_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS sent_by_name text,
  ADD COLUMN IF NOT EXISTS template_used text,
  ADD COLUMN IF NOT EXISTS note text;

-- Backfill sent_at si la table contenait déjà des données
UPDATE public.invoice_reminders SET sent_at = created_at WHERE sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_reminders_invoice ON public.invoice_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_sent_at ON public.invoice_reminders(sent_at DESC);

ALTER TABLE public.invoice_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins peuvent voir les relances" ON public.invoice_reminders;
CREATE POLICY "Admins peuvent voir les relances"
ON public.invoice_reminders FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins peuvent créer des relances" ON public.invoice_reminders;
CREATE POLICY "Admins peuvent créer des relances"
ON public.invoice_reminders FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- 3. Vue invoices_aging
CREATE OR REPLACE VIEW public.invoices_aging
WITH (security_invoker = true)
AS
SELECT
  i.id AS invoice_id,
  i.invoice_number,
  i.client_email,
  i.client_name,
  i.client_organization,
  i.total_amount_usd,
  i.currency_code,
  i.created_at,
  i.due_date,
  i.status,
  GREATEST(0, (now()::date - COALESCE(i.due_date, i.created_at)::date))::int AS days_overdue,
  CASE
    WHEN (now()::date - COALESCE(i.due_date, i.created_at)::date) <= 30 THEN 'current'
    WHEN (now()::date - COALESCE(i.due_date, i.created_at)::date) <= 60 THEN '30_60'
    WHEN (now()::date - COALESCE(i.due_date, i.created_at)::date) <= 90 THEN '60_90'
    ELSE 'over_90'
  END AS aging_bucket,
  (SELECT MAX(r.sent_at) FROM public.invoice_reminders r WHERE r.invoice_id = i.id) AS last_reminder_sent_at,
  (SELECT COUNT(*) FROM public.invoice_reminders r WHERE r.invoice_id = i.id)::int AS reminder_count
FROM public.cadastral_invoices i
WHERE i.status NOT IN ('paid', 'cancelled', 'refunded');

-- 4. Vue reseller_commissions_summary
CREATE OR REPLACE VIEW public.reseller_commissions_summary
WITH (security_invoker = true)
AS
SELECT
  r.id AS reseller_id,
  r.business_name AS reseller_name,
  r.reseller_code,
  r.commission_rate,
  COALESCE(SUM(rs.sale_amount_usd), 0)::numeric AS total_sales_usd,
  COALESCE(SUM(rs.commission_earned_usd), 0)::numeric AS total_commission_usd,
  COALESCE(SUM(CASE WHEN rs.commission_paid = true THEN rs.commission_earned_usd ELSE 0 END), 0)::numeric AS commission_paid_usd,
  COALESCE(SUM(CASE WHEN rs.commission_paid = false THEN rs.commission_earned_usd ELSE 0 END), 0)::numeric AS commission_pending_usd,
  COUNT(rs.id)::int AS sales_count,
  MAX(CASE WHEN rs.commission_paid = true THEN rs.commission_paid_at END) AS last_payout_at
FROM public.resellers r
LEFT JOIN public.reseller_sales rs ON rs.reseller_id = r.id
GROUP BY r.id, r.business_name, r.reseller_code, r.commission_rate;
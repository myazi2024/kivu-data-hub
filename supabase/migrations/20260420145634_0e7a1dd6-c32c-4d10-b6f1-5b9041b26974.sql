
-- ============================================================
-- PHASE 1 — Conformité Facture Normalisée DGI (RDC)
-- ============================================================

-- ---- P1.1 : Identification fiscale du client ----
ALTER TABLE public.cadastral_invoices
  ADD COLUMN IF NOT EXISTS client_type text DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS client_nif text,
  ADD COLUMN IF NOT EXISTS client_rccm text,
  ADD COLUMN IF NOT EXISTS client_id_nat text,
  ADD COLUMN IF NOT EXISTS client_address text,
  ADD COLUMN IF NOT EXISTS client_tax_regime text;

ALTER TABLE public.expertise_payments
  ADD COLUMN IF NOT EXISTS client_type text DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS client_nif text,
  ADD COLUMN IF NOT EXISTS client_rccm text,
  ADD COLUMN IF NOT EXISTS client_id_nat text,
  ADD COLUMN IF NOT EXISTS client_address text,
  ADD COLUMN IF NOT EXISTS client_tax_regime text;

ALTER TABLE public.permit_payments
  ADD COLUMN IF NOT EXISTS client_type text DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS client_nif text,
  ADD COLUMN IF NOT EXISTS client_rccm text,
  ADD COLUMN IF NOT EXISTS client_id_nat text,
  ADD COLUMN IF NOT EXISTS client_address text,
  ADD COLUMN IF NOT EXISTS client_tax_regime text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_type text DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS client_nif text,
  ADD COLUMN IF NOT EXISTS client_rccm text,
  ADD COLUMN IF NOT EXISTS client_id_nat text,
  ADD COLUMN IF NOT EXISTS client_address text,
  ADD COLUMN IF NOT EXISTS client_tax_regime text;

-- ---- P1.4 : Numérotation séquentielle officielle ----
CREATE SEQUENCE IF NOT EXISTS public.bic_invoice_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Année courante mémorisée pour reset annuel logique (séquence reste continue)
CREATE TABLE IF NOT EXISTS public.bic_invoice_seq_year (
  year integer PRIMARY KEY,
  last_value bigint NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.generate_normalized_invoice_number(p_year integer DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer := COALESCE(p_year, EXTRACT(YEAR FROM now())::int);
  v_next bigint;
BEGIN
  INSERT INTO public.bic_invoice_seq_year(year, last_value)
  VALUES (v_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_value = public.bic_invoice_seq_year.last_value + 1
  RETURNING last_value INTO v_next;

  RETURN 'BIC/' || v_year::text || '/' || lpad(v_next::text, 6, '0');
END;
$$;

-- ---- P2.2 / P2.4 : Intégrité et traçabilité ----
ALTER TABLE public.cadastral_invoices
  ADD COLUMN IF NOT EXISTS invoice_signature text,
  ADD COLUMN IF NOT EXISTS signature_algorithm text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS dgi_validation_code text;

-- ---- P2.1 : Trigger immuabilité post-paid ----
CREATE OR REPLACE FUNCTION public.prevent_paid_invoice_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'paid' THEN
    -- Whitelist : seuls quelques champs techniques peuvent évoluer
    IF NEW.invoice_number IS DISTINCT FROM OLD.invoice_number
       OR NEW.total_amount_usd IS DISTINCT FROM OLD.total_amount_usd
       OR NEW.original_amount_usd IS DISTINCT FROM OLD.original_amount_usd
       OR NEW.discount_amount_usd IS DISTINCT FROM OLD.discount_amount_usd
       OR NEW.selected_services IS DISTINCT FROM OLD.selected_services
       OR NEW.client_email IS DISTINCT FROM OLD.client_email
       OR NEW.client_name IS DISTINCT FROM OLD.client_name
       OR NEW.client_nif IS DISTINCT FROM OLD.client_nif
       OR NEW.client_rccm IS DISTINCT FROM OLD.client_rccm
       OR NEW.parcel_number IS DISTINCT FROM OLD.parcel_number
       OR NEW.exchange_rate_used IS DISTINCT FROM OLD.exchange_rate_used
       OR NEW.currency_code IS DISTINCT FROM OLD.currency_code
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Facture normalisée payée : modification interdite (DGI immuabilité). Créez un avoir (credit note) à la place.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Auto-set paid_at lors du passage à paid
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') AND NEW.paid_at IS NULL THEN
    NEW.paid_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_paid_invoice_mutation ON public.cadastral_invoices;
CREATE TRIGGER trg_prevent_paid_invoice_mutation
  BEFORE UPDATE ON public.cadastral_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_paid_invoice_mutation();

-- ---- P3.1 : Table identité légale émettrice ----
CREATE TABLE IF NOT EXISTS public.company_legal_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true,
  legal_name text NOT NULL,
  trade_name text,
  rccm text NOT NULL,
  id_nat text NOT NULL,
  nif text NOT NULL,
  tva_number text,
  tax_regime text NOT NULL DEFAULT 'reel',
  legal_form text,
  capital_amount text,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  province text NOT NULL,
  country text NOT NULL DEFAULT 'République Démocratique du Congo',
  phone text,
  email text,
  website text,
  logo_url text,
  bank_name text,
  bank_account text,
  bank_swift text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.company_legal_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tout le monde peut lire l'identité légale active"
  ON public.company_legal_info FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins peuvent gérer l'identité légale"
  ON public.company_legal_info FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.update_company_legal_info_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_company_legal_info ON public.company_legal_info;
CREATE TRIGGER trg_update_company_legal_info
  BEFORE UPDATE ON public.company_legal_info
  FOR EACH ROW
  EXECUTE FUNCTION public.update_company_legal_info_timestamp();

-- Seed initial depuis BIC_COMPANY_INFO
INSERT INTO public.company_legal_info (
  legal_name, trade_name, rccm, id_nat, nif, tva_number, tax_regime, legal_form,
  address_line1, city, province, country, phone, email
)
SELECT
  'Bureau d''Informations Cadastrales SARL',
  'BIC',
  'CD/KIN/RCCM/24-B-00000',
  '01-XXXX-XXXXX',
  'A0000000X',
  'TVA-XXXXXXXX',
  'reel',
  'SARL',
  'Avenue à compléter',
  'Kinshasa',
  'Kinshasa',
  'République Démocratique du Congo',
  '+243 000 000 000',
  'contact@bic.cd'
WHERE NOT EXISTS (SELECT 1 FROM public.company_legal_info);

-- ---- P2.3 : Avoirs / factures rectificatives ----
CREATE TABLE IF NOT EXISTS public.cadastral_credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_number text NOT NULL UNIQUE,
  original_invoice_id uuid NOT NULL REFERENCES public.cadastral_invoices(id) ON DELETE RESTRICT,
  reason text NOT NULL,
  amount_usd numeric NOT NULL CHECK (amount_usd > 0),
  currency_code text NOT NULL DEFAULT 'USD',
  exchange_rate_used numeric NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'issued',
  issued_by uuid,
  issued_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_original ON public.cadastral_credit_notes(original_invoice_id);

ALTER TABLE public.cadastral_credit_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins peuvent gérer les avoirs"
  ON public.cadastral_credit_notes FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Le client peut voir ses avoirs"
  ON public.cadastral_credit_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cadastral_invoices ci
      WHERE ci.id = cadastral_credit_notes.original_invoice_id
        AND ci.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trg_update_credit_notes ON public.cadastral_credit_notes;
CREATE TRIGGER trg_update_credit_notes
  BEFORE UPDATE ON public.cadastral_credit_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_company_legal_info_timestamp();

-- Index utile
CREATE INDEX IF NOT EXISTS idx_invoices_paid_at ON public.cadastral_invoices(paid_at) WHERE paid_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_dgi_code ON public.cadastral_invoices(dgi_validation_code) WHERE dgi_validation_code IS NOT NULL;

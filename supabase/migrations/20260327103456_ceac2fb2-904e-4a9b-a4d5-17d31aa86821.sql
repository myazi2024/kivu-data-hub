
-- Table de configuration des devises
CREATE TABLE public.currency_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code TEXT NOT NULL UNIQUE,
  currency_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  exchange_rate_to_usd NUMERIC(18,4) NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Données initiales
INSERT INTO public.currency_config (currency_code, currency_name, symbol, exchange_rate_to_usd, is_active, is_default)
VALUES 
  ('USD', 'Dollar américain', '$', 1, true, true),
  ('CDF', 'Franc congolais', 'FC', 2850, true, false);

-- RLS
ALTER TABLE public.currency_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active currencies"
  ON public.currency_config FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage currencies"
  ON public.currency_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ajouter colonnes devise sur cadastral_invoices
ALTER TABLE public.cadastral_invoices
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS exchange_rate_used NUMERIC(18,4) NOT NULL DEFAULT 1;

-- Ajouter colonnes devise sur payment_transactions
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS exchange_rate_used NUMERIC(18,4) NOT NULL DEFAULT 1;

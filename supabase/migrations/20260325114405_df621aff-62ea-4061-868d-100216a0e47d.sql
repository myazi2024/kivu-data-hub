ALTER TABLE public.mutation_requests
  ADD COLUMN IF NOT EXISTS market_value_usd numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expertise_certificate_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expertise_certificate_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS title_age text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mutation_fee_amount numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_fee_amount numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS late_fee_amount numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS late_fee_days integer DEFAULT NULL;

COMMENT ON COLUMN public.mutation_requests.market_value_usd IS 'Valeur vénale du bien (expertise)';
COMMENT ON COLUMN public.mutation_requests.expertise_certificate_url IS 'URL du certificat expertise';
COMMENT ON COLUMN public.mutation_requests.expertise_certificate_date IS 'Date de délivrance du certificat';
COMMENT ON COLUMN public.mutation_requests.title_age IS 'Ancienneté du titre: less_than_10 ou 10_or_more';
COMMENT ON COLUMN public.mutation_requests.mutation_fee_amount IS 'Frais de mutation calculés (1.5% ou 3%)';
COMMENT ON COLUMN public.mutation_requests.bank_fee_amount IS 'Frais bancaires calculés';
COMMENT ON COLUMN public.mutation_requests.late_fee_amount IS 'Pénalités de retard en USD';
COMMENT ON COLUMN public.mutation_requests.late_fee_days IS 'Nombre de jours de retard';
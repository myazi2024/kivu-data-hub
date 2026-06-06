
ALTER TABLE public.cadastral_contributions
  ADD COLUMN IF NOT EXISTS would_sell_if_offered boolean,
  ADD COLUMN IF NOT EXISTS resale_price_amount numeric,
  ADD COLUMN IF NOT EXISTS resale_price_currency text,
  ADD COLUMN IF NOT EXISTS resale_price_usd numeric,
  ADD COLUMN IF NOT EXISTS has_recent_appraisal boolean,
  ADD COLUMN IF NOT EXISTS appraisal_date date,
  ADD COLUMN IF NOT EXISTS appraiser_name text,
  ADD COLUMN IF NOT EXISTS appraised_value_amount numeric,
  ADD COLUMN IF NOT EXISTS appraised_value_currency text,
  ADD COLUMN IF NOT EXISTS appraised_value_usd numeric,
  ADD COLUMN IF NOT EXISTS appraisal_report_url text,
  ADD COLUMN IF NOT EXISTS market_listings jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cadastral_contributions_resale_price_currency_check'
  ) THEN
    ALTER TABLE public.cadastral_contributions
      ADD CONSTRAINT cadastral_contributions_resale_price_currency_check
      CHECK (resale_price_currency IS NULL OR resale_price_currency IN ('USD','CDF'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cadastral_contributions_appraised_value_currency_check'
  ) THEN
    ALTER TABLE public.cadastral_contributions
      ADD CONSTRAINT cadastral_contributions_appraised_value_currency_check
      CHECK (appraised_value_currency IS NULL OR appraised_value_currency IN ('USD','CDF'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cadastral_contributions_resale_price_amount_check'
  ) THEN
    ALTER TABLE public.cadastral_contributions
      ADD CONSTRAINT cadastral_contributions_resale_price_amount_check
      CHECK (resale_price_amount IS NULL OR resale_price_amount >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cadastral_contributions_appraised_value_amount_check'
  ) THEN
    ALTER TABLE public.cadastral_contributions
      ADD CONSTRAINT cadastral_contributions_appraised_value_amount_check
      CHECK (appraised_value_amount IS NULL OR appraised_value_amount >= 0);
  END IF;
END $$;

COMMENT ON COLUMN public.cadastral_contributions.would_sell_if_offered IS 'CCC – Valeur marchande : disposition à vendre la parcelle';
COMMENT ON COLUMN public.cadastral_contributions.resale_price_amount IS 'CCC – Valeur marchande : prix de revente proposé (devise resale_price_currency)';
COMMENT ON COLUMN public.cadastral_contributions.resale_price_currency IS 'USD ou CDF';
COMMENT ON COLUMN public.cadastral_contributions.resale_price_usd IS 'Equivalent USD du prix de revente';
COMMENT ON COLUMN public.cadastral_contributions.has_recent_appraisal IS 'CCC – Expertise réalisée dans les 6 derniers mois';
COMMENT ON COLUMN public.cadastral_contributions.appraisal_date IS 'Date de l''expertise immobilière';
COMMENT ON COLUMN public.cadastral_contributions.appraiser_name IS 'Nom de l''expert ou du cabinet ayant réalisé l''expertise';
COMMENT ON COLUMN public.cadastral_contributions.appraised_value_amount IS 'Valeur vénale retenue par l''expert';
COMMENT ON COLUMN public.cadastral_contributions.appraised_value_currency IS 'USD ou CDF';
COMMENT ON COLUMN public.cadastral_contributions.appraised_value_usd IS 'Equivalent USD de la valeur vénale';
COMMENT ON COLUMN public.cadastral_contributions.appraisal_report_url IS 'Lien Storage vers le rapport d''expertise (cadastral-documents)';
COMMENT ON COLUMN public.cadastral_contributions.market_listings IS 'Locaux vacants à mettre sur le marché : [{constructionRef, unitLabel, listForRent, targetRentUsd, availableFrom}]';

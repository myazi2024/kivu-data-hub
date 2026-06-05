-- Add rental configuration columns to cadastral_contributions
ALTER TABLE public.cadastral_contributions
  ADD COLUMN IF NOT EXISTS rental_configuration text,
  ADD COLUMN IF NOT EXISTS rental_units_count integer,
  ADD COLUMN IF NOT EXISTS monthly_rent_usd numeric(14,2),
  ADD COLUMN IF NOT EXISTS rental_units jsonb;

ALTER TABLE public.cadastral_contributions
  DROP CONSTRAINT IF EXISTS cadastral_contributions_rental_configuration_check;
ALTER TABLE public.cadastral_contributions
  ADD CONSTRAINT cadastral_contributions_rental_configuration_check
  CHECK (rental_configuration IS NULL OR rental_configuration IN ('single','multi'));

ALTER TABLE public.cadastral_contributions
  DROP CONSTRAINT IF EXISTS cadastral_contributions_rental_units_count_check;
ALTER TABLE public.cadastral_contributions
  ADD CONSTRAINT cadastral_contributions_rental_units_count_check
  CHECK (rental_units_count IS NULL OR (rental_units_count >= 1 AND rental_units_count <= 200));

-- Mirror columns on cadastral_parcels (for IRL reuse)
ALTER TABLE public.cadastral_parcels
  ADD COLUMN IF NOT EXISTS rental_configuration text,
  ADD COLUMN IF NOT EXISTS rental_units_count integer,
  ADD COLUMN IF NOT EXISTS monthly_rent_usd numeric(14,2),
  ADD COLUMN IF NOT EXISTS rental_units jsonb;

ALTER TABLE public.cadastral_parcels
  DROP CONSTRAINT IF EXISTS cadastral_parcels_rental_configuration_check;
ALTER TABLE public.cadastral_parcels
  ADD CONSTRAINT cadastral_parcels_rental_configuration_check
  CHECK (rental_configuration IS NULL OR rental_configuration IN ('single','multi'));

COMMENT ON COLUMN public.cadastral_contributions.rental_configuration IS 'single = un seul local loué; multi = plusieurs locaux loués séparément. NULL si non applicable.';
COMMENT ON COLUMN public.cadastral_contributions.rental_units IS 'JSON array [{label, monthly_rent_usd}] décrivant chaque local loué quand rental_configuration = multi.';
COMMENT ON COLUMN public.cadastral_contributions.monthly_rent_usd IS 'Loyer mensuel actuel en USD quand rental_configuration = single (sinon utiliser rental_units).';
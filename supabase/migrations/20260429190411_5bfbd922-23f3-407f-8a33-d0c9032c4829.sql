
-- 1) Extend permit_fees_config with progressive pricing dimensions
ALTER TABLE public.permit_fees_config
  ADD COLUMN IF NOT EXISTS min_area_sqm numeric,
  ADD COLUMN IF NOT EXISTS max_area_sqm numeric,
  ADD COLUMN IF NOT EXISTS applicable_usages text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS applicable_natures text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS amount_per_sqm_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cap_amount_usd numeric;

CREATE INDEX IF NOT EXISTS idx_permit_fees_config_active_type
  ON public.permit_fees_config (permit_type, is_active);

COMMENT ON COLUMN public.permit_fees_config.min_area_sqm IS 'Minimum surface (m²) for this fee bracket; NULL = no lower bound.';
COMMENT ON COLUMN public.permit_fees_config.max_area_sqm IS 'Maximum surface (m²) for this fee bracket; NULL = no upper bound.';
COMMENT ON COLUMN public.permit_fees_config.applicable_usages IS 'Restrict fee to declared_usage values (CCC picklist). NULL = applies to all.';
COMMENT ON COLUMN public.permit_fees_config.applicable_natures IS 'Restrict fee to construction_nature values. NULL = applies to all.';
COMMENT ON COLUMN public.permit_fees_config.amount_per_sqm_usd IS 'Additional USD per m² added to amount_usd (linear pricing component).';
COMMENT ON COLUMN public.permit_fees_config.cap_amount_usd IS 'Maximum total for this fee line (USD). NULL = no cap.';

-- 2) Insert utility picklists if the system_picklists table exists and rows are missing
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'system_picklists'
  ) THEN
    -- Water supply
    IF NOT EXISTS (SELECT 1 FROM public.system_picklists WHERE picklist_key = 'picklist_utility_water') THEN
      INSERT INTO public.system_picklists (picklist_key, label, description, options, is_active)
      VALUES (
        'picklist_utility_water',
        'Alimentation en eau',
        'Sources d''alimentation en eau pour une construction',
        to_jsonb(ARRAY['REGIDESO', 'Forage privé', 'Citerne', 'Aucune']),
        true
      );
    END IF;

    -- Power supply
    IF NOT EXISTS (SELECT 1 FROM public.system_picklists WHERE picklist_key = 'picklist_utility_power') THEN
      INSERT INTO public.system_picklists (picklist_key, label, description, options, is_active)
      VALUES (
        'picklist_utility_power',
        'Alimentation électrique',
        'Sources d''alimentation électrique pour une construction',
        to_jsonb(ARRAY['SNEL', 'Solaire', 'Groupe électrogène', 'Aucune']),
        true
      );
    END IF;
  END IF;
END $$;

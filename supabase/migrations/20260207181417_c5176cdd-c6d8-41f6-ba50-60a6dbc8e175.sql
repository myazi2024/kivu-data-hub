
-- Add IRL (Impôt sur le Revenu Locatif) rates to property_tax_rates_config
INSERT INTO property_tax_rates_config (tax_category, zone_type, usage_type, construction_type, rate_percentage, base_amount_usd, area_multiplier, description, display_order, is_active)
VALUES
  -- IRL: 22% du revenu brut locatif - urban
  ('impot_revenu_locatif', 'urban', 'residential', NULL, 22, 0, 0, 'IRL résidentiel urbain — 22% du revenu brut locatif', 100, true),
  ('impot_revenu_locatif', 'urban', 'commercial', NULL, 22, 0, 0, 'IRL commercial urbain — 22% du revenu brut locatif', 101, true),
  ('impot_revenu_locatif', 'urban', 'industrial', NULL, 22, 0, 0, 'IRL industriel urbain — 22% du revenu brut locatif', 102, true),
  ('impot_revenu_locatif', 'urban', 'mixed', NULL, 22, 0, 0, 'IRL mixte urbain — 22% du revenu brut locatif', 103, true),
  -- IRL: urban agricultural (rare but possible)
  ('impot_revenu_locatif', 'urban', 'agricultural', NULL, 22, 0, 0, 'IRL agricole urbain — 22% du revenu brut locatif', 104, true),
  -- IRL: rural
  ('impot_revenu_locatif', 'rural', 'residential', NULL, 22, 0, 0, 'IRL résidentiel rural — 22% du revenu brut locatif', 105, true),
  ('impot_revenu_locatif', 'rural', 'commercial', NULL, 22, 0, 0, 'IRL commercial rural — 22% du revenu brut locatif', 106, true),
  ('impot_revenu_locatif', 'rural', 'industrial', NULL, 22, 0, 0, 'IRL industriel rural — 22% du revenu brut locatif', 107, true),
  ('impot_revenu_locatif', 'rural', 'mixed', NULL, 22, 0, 0, 'IRL mixte rural — 22% du revenu brut locatif', 108, true),
  ('impot_revenu_locatif', 'rural', 'agricultural', NULL, 22, 0, 0, 'IRL agricole rural — 22% du revenu brut locatif', 109, true);

-- Add tax exemption config table
CREATE TABLE IF NOT EXISTS public.tax_exemptions_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exemption_type TEXT NOT NULL, -- 'batiments_publics', 'constructions_recentes', 'petites_surfaces'
  label TEXT NOT NULL,
  description TEXT,
  duration_years INTEGER, -- for temporary exemptions (e.g. 5 years for new constructions)
  max_area_sqm NUMERIC, -- for small surface exemptions
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_exemptions_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tax exemptions config viewable by everyone"
  ON public.tax_exemptions_config FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage tax exemptions config"
  ON public.tax_exemptions_config FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
  ));

-- Seed exemptions
INSERT INTO public.tax_exemptions_config (exemption_type, label, description, duration_years, max_area_sqm, display_order)
VALUES
  ('batiments_publics', 'Bâtiments publics et religieux', 'Édifices de l''État, églises, mosquées, écoles publiques, hôpitaux publics', NULL, NULL, 1),
  ('constructions_recentes', 'Constructions récentes', 'Exonération temporaire pour les nouvelles constructions', 5, NULL, 2),
  ('petites_surfaces', 'Petites surfaces', 'Parcelles en dessous du seuil minimum de superficie', NULL, 50, 3);

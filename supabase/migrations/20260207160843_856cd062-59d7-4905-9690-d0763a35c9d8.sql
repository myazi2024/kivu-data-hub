
-- Configuration table for property tax calculation rates
CREATE TABLE public.property_tax_rates_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tax_category TEXT NOT NULL, -- 'impot_foncier', 'taxe_superficie', 'revenus_locatifs', etc.
  zone_type TEXT NOT NULL DEFAULT 'urban', -- 'urban', 'rural'
  usage_type TEXT NOT NULL DEFAULT 'residential', -- 'residential', 'commercial', 'industrial', 'agricultural', 'mixed'
  construction_type TEXT, -- 'en_dur', 'semi_dur', 'en_paille', null for land
  rate_percentage NUMERIC NOT NULL DEFAULT 0,
  base_amount_usd NUMERIC NOT NULL DEFAULT 0,
  area_multiplier NUMERIC DEFAULT 0, -- per sqm rate
  min_area_sqm NUMERIC,
  max_area_sqm NUMERIC,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tax fees (banking + admin fees) configuration
CREATE TABLE public.tax_payment_fees_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fee_name TEXT NOT NULL,
  fee_type TEXT NOT NULL DEFAULT 'fixed', -- 'fixed', 'percentage'
  amount_usd NUMERIC DEFAULT 0,
  percentage NUMERIC DEFAULT 0,
  description TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_tax_rates_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_payment_fees_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for property_tax_rates_config
CREATE POLICY "Tax rates config viewable by everyone"
ON public.property_tax_rates_config FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage tax rates config"
ON public.property_tax_rates_config FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
));

-- RLS policies for tax_payment_fees_config
CREATE POLICY "Tax payment fees viewable by everyone"
ON public.tax_payment_fees_config FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage tax payment fees"
ON public.tax_payment_fees_config FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
));

-- Insert default tax rates (based on DRC property tax regulations)
INSERT INTO public.property_tax_rates_config (tax_category, zone_type, usage_type, construction_type, rate_percentage, base_amount_usd, area_multiplier, description, display_order) VALUES
('impot_foncier', 'urban', 'residential', 'en_dur', 0, 50, 0.05, 'Impôt foncier - Résidentiel urbain, construction en dur', 1),
('impot_foncier', 'urban', 'residential', 'semi_dur', 0, 35, 0.03, 'Impôt foncier - Résidentiel urbain, semi-dur', 2),
('impot_foncier', 'urban', 'residential', null, 0, 20, 0.02, 'Impôt foncier - Résidentiel urbain, terrain nu', 3),
('impot_foncier', 'urban', 'commercial', 'en_dur', 0, 100, 0.10, 'Impôt foncier - Commercial urbain, en dur', 4),
('impot_foncier', 'urban', 'commercial', 'semi_dur', 0, 70, 0.07, 'Impôt foncier - Commercial urbain, semi-dur', 5),
('impot_foncier', 'urban', 'industrial', 'en_dur', 0, 150, 0.15, 'Impôt foncier - Industriel urbain', 6),
('impot_foncier', 'rural', 'residential', 'en_dur', 0, 25, 0.02, 'Impôt foncier - Résidentiel rural, en dur', 7),
('impot_foncier', 'rural', 'residential', 'semi_dur', 0, 15, 0.01, 'Impôt foncier - Résidentiel rural, semi-dur', 8),
('impot_foncier', 'rural', 'residential', null, 0, 10, 0.005, 'Impôt foncier - Résidentiel rural, terrain nu', 9),
('impot_foncier', 'rural', 'agricultural', null, 0, 5, 0.002, 'Impôt foncier - Agricole rural', 10),
('taxe_superficie', 'urban', 'residential', null, 0, 0, 0.03, 'Taxe de superficie - Urbain résidentiel', 11),
('taxe_superficie', 'rural', 'residential', null, 0, 0, 0.01, 'Taxe de superficie - Rural résidentiel', 12);

-- Insert default payment fees
INSERT INTO public.tax_payment_fees_config (fee_name, fee_type, amount_usd, percentage, description, display_order) VALUES
('Frais bancaires', 'percentage', 0, 2.5, 'Frais de traitement bancaire appliqués sur le montant total', 1),
('Frais administratifs', 'fixed', 5, 0, 'Frais administratifs de traitement de la déclaration', 2);

-- Update parcel_actions_config default label
UPDATE public.parcel_actions_config 
SET label = 'Taxe foncière', description = 'Calculer et déclarer une taxe'
WHERE action_key = 'tax';

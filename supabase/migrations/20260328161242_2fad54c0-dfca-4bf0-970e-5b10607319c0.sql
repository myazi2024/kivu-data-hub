
CREATE TABLE public.subdivision_rate_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_type TEXT NOT NULL CHECK (section_type IN ('urban', 'rural')),
  location_name TEXT NOT NULL,
  rate_per_sqm_usd NUMERIC NOT NULL DEFAULT 0.5,
  min_fee_per_lot_usd NUMERIC DEFAULT 5,
  max_fee_per_lot_usd NUMERIC DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(section_type, location_name)
);

ALTER TABLE public.subdivision_rate_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read subdivision rates"
  ON public.subdivision_rate_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage subdivision rates"
  ON public.subdivision_rate_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.subdivision_rate_config (section_type, location_name, rate_per_sqm_usd, min_fee_per_lot_usd, max_fee_per_lot_usd)
VALUES 
  ('urban', '*', 0.5, 10, NULL),
  ('rural', '*', 0.3, 5, NULL);


-- Analytics charts & KPIs configuration table
CREATE TABLE public.analytics_charts_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tab_key TEXT NOT NULL,
  item_key TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'chart' CHECK (item_type IN ('chart', 'kpi')),
  is_visible BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  custom_title TEXT,
  custom_color TEXT,
  chart_type TEXT CHECK (chart_type IN ('bar-h', 'bar-v', 'pie', 'donut', 'area', NULL)),
  custom_icon TEXT,
  col_span INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tab_key, item_key)
);

ALTER TABLE public.analytics_charts_config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated reads (everyone can read config to render charts)
CREATE POLICY "Anyone authenticated can read analytics config"
ON public.analytics_charts_config FOR SELECT TO authenticated
USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage analytics config"
ON public.analytics_charts_config FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_analytics_charts_config_updated_at
  BEFORE UPDATE ON public.analytics_charts_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

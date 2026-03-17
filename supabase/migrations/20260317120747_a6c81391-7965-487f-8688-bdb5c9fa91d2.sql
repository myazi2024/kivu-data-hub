-- 1. Fix the CHECK constraint: allow 'tab' alongside 'chart' and 'kpi'
ALTER TABLE public.analytics_charts_config
  DROP CONSTRAINT analytics_charts_config_item_type_check;

ALTER TABLE public.analytics_charts_config
  ADD CONSTRAINT analytics_charts_config_item_type_check
  CHECK (item_type = ANY (ARRAY['chart', 'kpi', 'tab']));

-- 2. Remove the duplicate UNIQUE constraint (keep the original _key one)
ALTER TABLE public.analytics_charts_config
  DROP CONSTRAINT IF EXISTS analytics_charts_config_tab_key_item_key_unique;
ALTER TABLE analytics_charts_config DROP CONSTRAINT IF EXISTS analytics_charts_config_item_type_check;
ALTER TABLE analytics_charts_config ADD CONSTRAINT analytics_charts_config_item_type_check
  CHECK (item_type IN ('chart', 'kpi', 'tab', 'filter', 'cross'));
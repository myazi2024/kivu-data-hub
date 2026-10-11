DELETE FROM public.analytics_charts_config
WHERE (item_type = 'filter' AND item_key IN ('filter-status', 'filter-status-field'))
   OR (tab_key = 'rdc-map' AND item_key = 'map-header-note');
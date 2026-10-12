DELETE FROM public.analytics_charts_config
WHERE tab_key = 'rental-market'
  AND item_type IN ('chart', 'kpi')
  AND item_key NOT IN (
    'sale-by-location','rent-by-location','price-yield-location','sale-rent-by-category','value-by-category',
    'share-by-category','sale-rent-by-type','area-x-sale','area-x-rent','built-x-sale','built-x-rent',
    'value-by-area-class','price-by-height','price-by-capacity','built-capacity-price','sale-by-year',
    'rent-by-year','sale-rent-by-status','age-distribution','value-by-permit','permit-split',
    'yield-by-category','top-investments','top-sale','top-rent','valuation',
    'kpi-avg-sale','kpi-median-sale','kpi-avg-rent','kpi-median-rent','kpi-total','kpi-avg-area',
    'kpi-avg-built','kpi-avg-yield','kpi-permit'
  );
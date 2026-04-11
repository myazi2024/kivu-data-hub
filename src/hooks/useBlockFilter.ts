import { useState, useContext, useEffect, useMemo } from 'react';
import { AnalyticsFilter, defaultFilter, applyFilters, buildFilterLabel } from '@/utils/analyticsHelpers';
import { MapProvinceContext, VilleFilterContext, CommuneFilterContext, QuartierFilterContext } from '@/components/visualizations/filters/AnalyticsFilters';
import { useTabChartsConfig, useTabFilterConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';

/**
 * Centralised hook for analytics blocks.
 * Handles filter state, geo-context sync, chart config, and data filtering.
 */
export function useBlockFilter(tabKey: string, records: any[]) {
  const [filter, setFilter] = useState<AnalyticsFilter>(defaultFilter);

  const mapProvince = useContext(MapProvinceContext);
  const mapVille = useContext(VilleFilterContext);
  const mapCommune = useContext(CommuneFilterContext);
  const mapQuartier = useContext(QuartierFilterContext);

  useEffect(() => {
    setFilter(f => ({
      ...f,
      province: mapProvince || undefined,
      ville: mapVille || undefined,
      commune: mapCommune || undefined,
      quartier: mapQuartier || undefined,
    }));
  }, [mapProvince, mapVille, mapCommune, mapQuartier]);

  const filterLabel = useMemo(() => buildFilterLabel(filter), [filter]);

  const defaultItems = useMemo(() => {
    const reg = ANALYTICS_TABS_REGISTRY[tabKey];
    return reg ? [...reg.kpis, ...reg.charts] : [];
  }, [tabKey]);

  const { isChartVisible, getChartConfig } = useTabChartsConfig(tabKey, defaultItems);
  const filterConfig = useTabFilterConfig(tabKey);

  const filtered = useMemo(
    () => applyFilters(records, filter, filterConfig.dateField),
    [records, filter, filterConfig.dateField]
  );

  /** Shorthand: get custom title or fallback */
  const ct = (key: string, fallback: string) =>
    getChartConfig(key)?.custom_title || fallback;

  return {
    filter,
    setFilter,
    filterLabel,
    filtered,
    filterConfig,
    isChartVisible,
    getChartConfig,
    /** Alias for isChartVisible */
    v: isChartVisible,
    /** Get custom title with fallback */
    ct,
  };
}

import { useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { AnalyticsFilter, defaultFilter, applyFilters, buildFilterLabel } from '@/utils/analyticsHelpers';
import { MapProvinceContext, VilleFilterContext, CommuneFilterContext, QuartierFilterContext } from '@/components/visualizations/filters/AnalyticsFilters';
import { useTabChartsConfig, useTabFilterConfig, useTabCrossConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';
import { getCrossVariables, getCrossVariablesWithOverrides, CrossVariable } from '@/config/crossVariables';
import { useAnalyticsChartsConfig } from '@/hooks/useAnalyticsChartsConfig';
import { exportRecordsToCSV } from '@/utils/csvExport';

/**
 * Centralised hook for analytics blocks.
 * Handles filter state, geo-context sync, chart config, data filtering, and cross-variables.
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

  // Cross-variables with DB overrides
  const { configs } = useAnalyticsChartsConfig();
  const crossOverrides = useMemo(() => {
    const map = new Map<string, { is_visible: boolean; custom_title?: string | null }>();
    configs.filter(c => c.tab_key === tabKey && c.item_type === 'cross').forEach(c => {
      const chartKey = c.item_key.replace(/^cross-/, '');
      map.set(chartKey, { is_visible: c.is_visible, custom_title: c.custom_title });
    });
    return map;
  }, [configs, tabKey]);

  /** Get cross-variables for a chart key, applying admin overrides */
  const cx = useMemo(() => {
    return (chartKey: string): CrossVariable[] => {
      const override = crossOverrides.get(chartKey);
      if (!override) return getCrossVariables(tabKey, chartKey);
      return getCrossVariablesWithOverrides(tabKey, chartKey, override);
    };
  }, [tabKey, crossOverrides]);

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
    /** Get cross-variables with admin overrides */
    cx,
    /** Get chart type with fallback */
    ty: <T extends string>(key: string, fallback: T): T =>
      ((getChartConfig(key)?.chart_type as T) || fallback),
    /** Get display_order for sorting */
    ord: (key: string) => getChartConfig(key)?.display_order ?? 99,
  };
}

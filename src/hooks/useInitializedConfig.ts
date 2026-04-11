import { useState, useEffect } from 'react';
import { ChartConfigItem, TabConfig, buildFilterDefaults } from '@/hooks/useAnalyticsChartsConfig';
import { ANALYTICS_TABS_REGISTRY } from '@/config/analyticsTabsRegistry';
import { CROSS_VARIABLE_REGISTRY } from '@/config/crossVariables';

/** Tabs excluded from all user-facing views (system-level only) */
const EXCLUDED_SYSTEM_TABS = ['_global'];
const CHARTS_ONLY_TABS = ['rdc-map'];
export const isUserTab = (key: string) => !EXCLUDED_SYSTEM_TABS.includes(key) && !CHARTS_ONLY_TABS.includes(key);
export const isChartsViewTab = (key: string) => isUserTab(key) || CHARTS_ONLY_TABS.includes(key);

export type LocalCrossConfig = Record<string, Record<string, { enabled: boolean; variables: { label: string; field: string; enabled: boolean }[] }>>;

/**
 * Unified initialization hook that replaces 4 separate useEffect blocks.
 * Merges DB configs with defaults from ANALYTICS_TABS_REGISTRY for items, tabs, filters, and cross-variables.
 */
export function useInitializedConfig(configs: ChartConfigItem[], dbTabs: TabConfig[], isLoading: boolean) {
  const [localItems, setLocalItems] = useState<Record<string, ChartConfigItem[]>>({});
  const [localTabs, setLocalTabs] = useState<TabConfig[]>([]);
  const [localFilters, setLocalFilters] = useState<Record<string, ChartConfigItem[]>>({});
  const [localCross, setLocalCross] = useState<LocalCrossConfig>({});

  useEffect(() => {
    if (isLoading) return;

    // 1. Items (charts + KPIs)
    const dbMap = new Map<string, ChartConfigItem>();
    configs.filter(c => c.item_type !== 'tab').forEach(c => dbMap.set(`${c.tab_key}::${c.item_key}`, c));
    const itemsResult: Record<string, ChartConfigItem[]> = {};
    Object.entries(ANALYTICS_TABS_REGISTRY).forEach(([tabKey, tab]) => {
      const allDefaults = [...tab.kpis, ...tab.charts];
      itemsResult[tabKey] = allDefaults.map((d, i) => {
        const override = dbMap.get(`${d.tab_key}::${d.item_key}`);
        if (!override) return { ...d, display_order: d.display_order ?? i };
        return {
          ...d, id: override.id, is_visible: override.is_visible,
          display_order: override.display_order ?? i,
          custom_title: override.custom_title || d.custom_title,
          custom_color: override.custom_color || d.custom_color,
          chart_type: override.chart_type || d.chart_type,
          custom_icon: override.custom_icon || d.custom_icon,
          col_span: override.col_span ?? d.col_span,
        };
      }).sort((a, b) => {
        if (a.item_type !== b.item_type) return a.item_type === 'kpi' ? -1 : 1;
        return a.display_order - b.display_order;
      });
    });
    setLocalItems(itemsResult);

    // 2. Tabs
    setLocalTabs(dbTabs);

    // 3. Filters
    const dbFilterMap = new Map<string, ChartConfigItem>();
    configs.filter(c => c.item_type === 'filter').forEach(c => dbFilterMap.set(`${c.tab_key}::${c.item_key}`, c));
    const filtersResult: Record<string, ChartConfigItem[]> = {};
    Object.entries(ANALYTICS_TABS_REGISTRY).filter(([key]) => isUserTab(key)).forEach(([tabKey]) => {
      const defaults = buildFilterDefaults(tabKey);
      filtersResult[tabKey] = defaults.map(d => {
        const override = dbFilterMap.get(`${d.tab_key}::${d.item_key}`);
        return override ? { ...d, is_visible: override.is_visible, custom_title: override.custom_title || d.custom_title, id: override.id } : d;
      });
    });
    setLocalFilters(filtersResult);

    // 4. Cross variables
    const dbCrossMap = new Map<string, ChartConfigItem>();
    configs.filter(c => c.item_type === 'cross').forEach(c => dbCrossMap.set(`${c.tab_key}::${c.item_key}`, c));
    const crossResult: LocalCrossConfig = {};
    Object.entries(CROSS_VARIABLE_REGISTRY).forEach(([tabKey, charts]) => {
      crossResult[tabKey] = {};
      Object.entries(charts).forEach(([chartKey, defaults]) => {
        const dbItem = dbCrossMap.get(`${tabKey}::cross-${chartKey}`);
        if (dbItem) {
          let variables: { label: string; field: string; enabled: boolean }[];
          try {
            variables = dbItem.custom_title ? JSON.parse(dbItem.custom_title) : defaults.map(d => ({ label: d.label, field: d.field, enabled: true }));
          } catch {
            variables = defaults.map(d => ({ label: d.label, field: d.field, enabled: true }));
          }
          crossResult[tabKey][chartKey] = { enabled: dbItem.is_visible, variables };
        } else {
          crossResult[tabKey][chartKey] = {
            enabled: true,
            variables: defaults.map(d => ({ label: d.label, field: d.field, enabled: true })),
          };
        }
      });
    });
    setLocalCross(crossResult);
  }, [configs, dbTabs, isLoading]);

  return { localItems, setLocalItems, localTabs, setLocalTabs, localFilters, setLocalFilters, localCross, setLocalCross };
}

/** Build cross-variable items for saving to DB */
export function buildCrossItems(localCross: LocalCrossConfig): ChartConfigItem[] {
  const crossItems: ChartConfigItem[] = [];
  Object.entries(localCross).forEach(([tabKey, charts]) => {
    Object.entries(charts).forEach(([chartKey, config]) => {
      crossItems.push({
        tab_key: tabKey,
        item_key: `cross-${chartKey}`,
        item_type: 'cross',
        is_visible: config.enabled,
        display_order: 0,
        custom_title: JSON.stringify(config.variables),
      });
    });
  });
  return crossItems;
}

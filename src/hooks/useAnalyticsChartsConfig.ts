import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { getCrossVariablesWithOverrides } from '@/config/crossVariables';

// Re-export registry from its dedicated config file
export { ANALYTICS_TABS_REGISTRY } from '@/config/analyticsTabsRegistry';
import { ANALYTICS_TABS_REGISTRY } from '@/config/analyticsTabsRegistry';

export interface ChartConfigItem {
  id?: string;
  tab_key: string;
  item_key: string;
  item_type: 'chart' | 'kpi' | 'tab' | 'filter' | 'cross';
  is_visible: boolean;
  display_order: number;
  custom_title?: string | null;
  custom_color?: string | null;
  chart_type?: 'bar-h' | 'bar-v' | 'pie' | 'donut' | 'area' | 'multi-area' | null;
  custom_icon?: string | null;
  col_span?: number;
}

export interface TabConfig {
  key: string;
  label: string;
  defaultLabel: string;
  is_visible: boolean;
  display_order: number;
}

export interface TabFilterConfig {
  hideStatus: boolean;
  hideTime: boolean;
  hideLocation: boolean;
  dateField: string;
  statusField?: string;
}

/** Default filter settings per tab (matches current hardcoded behavior) */
const TAB_FILTER_DEFAULTS: Record<string, TabFilterConfig> = {
  'title-requests': { hideStatus: true, hideTime: false, hideLocation: false, dateField: 'title_issue_date' },
  'parcels-titled': { hideStatus: false, hideTime: false, hideLocation: false, dateField: 'created_at' },
  'contributions': { hideStatus: false, hideTime: false, hideLocation: false, dateField: 'created_at' },
  'expertise': { hideStatus: false, hideTime: false, hideLocation: false, dateField: 'created_at' },
  'mutations': { hideStatus: false, hideTime: false, hideLocation: false, dateField: 'created_at' },
  'mortgages': { hideStatus: false, hideTime: false, hideLocation: false, dateField: 'created_at' },
  'subdivision': { hideStatus: false, hideTime: false, hideLocation: false, dateField: 'created_at' },
  'disputes': { hideStatus: false, hideTime: false, hideLocation: false, dateField: 'created_at', statusField: 'current_status' },
  'ownership': { hideStatus: true, hideTime: false, hideLocation: false, dateField: 'ownership_start_date' },
  'certificates': { hideStatus: false, hideTime: false, hideLocation: false, dateField: 'generated_at' },
  'invoices': { hideStatus: false, hideTime: false, hideLocation: false, dateField: 'created_at' },
  'building-permits': { hideStatus: false, hideTime: false, hideLocation: false, dateField: 'created_at' },
  'taxes': { hideStatus: false, hideTime: false, hideLocation: false, dateField: 'created_at' },
};

/** Available date fields for admin selection */
export const DATE_FIELD_OPTIONS = [
  { value: 'created_at', label: 'Date de création (created_at)' },
  { value: 'updated_at', label: 'Date de mise à jour (updated_at)' },
  { value: 'ownership_start_date', label: 'Début de propriété (ownership_start_date)' },
  { value: 'generated_at', label: 'Date de génération (generated_at)' },
  { value: 'issue_date', label: "Date d'émission (issue_date)" },
  { value: 'contract_date', label: 'Date de contrat (contract_date)' },
  { value: 'survey_date', label: "Date d'arpentage (survey_date)" },
  { value: 'payment_date', label: 'Date de paiement (payment_date)' },
];

/** Available status fields for admin selection */
export const STATUS_FIELD_OPTIONS = [
  { value: 'status', label: 'Statut (status)' },
  { value: 'current_status', label: 'Statut actuel (current_status)' },
  { value: 'payment_status', label: 'Statut paiement (payment_status)' },
  { value: 'mortgage_status', label: 'Statut hypothèque (mortgage_status)' },
  { value: 'administrative_status', label: 'Statut administratif (administrative_status)' },
];

/** Build default filter config items for a given tab */
export function buildFilterDefaults(tabKey: string): ChartConfigItem[] {
  const defaults = TAB_FILTER_DEFAULTS[tabKey] || { hideStatus: false, hideTime: false, hideLocation: false, dateField: 'created_at' };
  return [
    { tab_key: tabKey, item_key: 'filter-status', item_type: 'filter', is_visible: !defaults.hideStatus, display_order: 0, custom_title: 'Filtre statut' },
    { tab_key: tabKey, item_key: 'filter-time', item_type: 'filter', is_visible: !defaults.hideTime, display_order: 1, custom_title: 'Filtre temps' },
    { tab_key: tabKey, item_key: 'filter-location', item_type: 'filter', is_visible: !defaults.hideLocation, display_order: 2, custom_title: 'Filtre lieu' },
    { tab_key: tabKey, item_key: 'filter-date-field', item_type: 'filter', is_visible: true, display_order: 3, custom_title: defaults.dateField },
    { tab_key: tabKey, item_key: 'filter-status-field', item_type: 'filter', is_visible: true, display_order: 4, custom_title: defaults.statusField || 'status' },
  ];
}

const QUERY_KEY = ['analytics-charts-config'];

async function fetchConfig(): Promise<ChartConfigItem[]> {
  const { data, error } = await supabase
    .from('analytics_charts_config')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data as unknown as ChartConfigItem[]) || [];
}

export function useAnalyticsChartsConfig() {
  const { data: configs = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchConfig,
    staleTime: 5 * 60 * 1000,
  });

  return { configs, isLoading };
}

/** Returns tab-level config merged with defaults from ANALYTICS_TABS_REGISTRY */
export function useAnalyticsTabsConfig() {
  const { configs, isLoading } = useAnalyticsChartsConfig();

  const tabs = useMemo(() => {
    const dbTabMap = new Map<string, ChartConfigItem>();
    configs.filter(c => c.item_type === 'tab' && c.item_key === '__tab__').forEach(c => dbTabMap.set(c.tab_key, c));

    return Object.entries(ANALYTICS_TABS_REGISTRY).filter(([key]) => key !== '_global' && key !== 'rdc-map').map(([key, reg]: [string, any], i) => {
      const override = dbTabMap.get(key);
      return {
        key,
        label: override?.custom_title || reg.label,
        defaultLabel: reg.label,
        is_visible: override ? override.is_visible : true,
        display_order: override?.display_order ?? i,
      } as TabConfig;
    }).sort((a, b) => a.display_order - b.display_order);
  }, [configs]);

  const visibleTabs = useMemo(() => tabs.filter(t => t.is_visible), [tabs]);

  return { tabs, visibleTabs, isLoading };
}

/** Returns a lookup for a specific tab — merges defaults with DB overrides */
export function useTabChartsConfig(tabKey: string, defaults: ChartConfigItem[]) {
  const { configs, isLoading } = useAnalyticsChartsConfig();

  const merged = useMemo(() => {
    const dbMap = new Map<string, ChartConfigItem>();
    configs.filter(c => c.tab_key === tabKey && c.item_type !== 'tab' && c.item_type !== 'filter' && c.item_type !== 'cross').forEach(c => dbMap.set(c.item_key, c));

    return defaults.map((d, i) => {
      const override = dbMap.get(d.item_key);
      if (!override) return { ...d, display_order: d.display_order ?? i };
      return {
        ...d,
        is_visible: override.is_visible,
        display_order: override.display_order ?? i,
        custom_title: override.custom_title || d.custom_title,
        custom_color: override.custom_color || d.custom_color,
        chart_type: override.chart_type || d.chart_type,
        custom_icon: override.custom_icon || d.custom_icon,
        col_span: override.col_span ?? d.col_span,
      };
    }).sort((a, b) => a.display_order - b.display_order);
  }, [configs, tabKey, defaults]);

  const isChartVisible = useMemo(() => {
    const map = new Map<string, boolean>();
    merged.forEach(m => map.set(m.item_key, m.is_visible));
    return (key: string) => map.get(key) ?? true;
  }, [merged]);

  const getChartConfig = useMemo(() => {
    const map = new Map<string, ChartConfigItem>();
    merged.forEach(m => map.set(m.item_key, m));
    return (key: string) => map.get(key);
  }, [merged]);

  return { merged, isChartVisible, getChartConfig, isLoading };
}

/** Returns the filter configuration for a specific tab, merged with DB overrides */
export function useTabFilterConfig(tabKey: string): TabFilterConfig {
  const { configs } = useAnalyticsChartsConfig();

  return useMemo(() => {
    const defaults = TAB_FILTER_DEFAULTS[tabKey] || { hideStatus: false, hideTime: false, hideLocation: false, dateField: 'created_at' };
    const filterItems = configs.filter(c => c.tab_key === tabKey && c.item_type === 'filter');

    if (filterItems.length === 0) return defaults;

    const filterMap = new Map<string, ChartConfigItem>();
    filterItems.forEach(c => filterMap.set(c.item_key, c));

    const statusCfg = filterMap.get('filter-status');
    const timeCfg = filterMap.get('filter-time');
    const locationCfg = filterMap.get('filter-location');
    const dateFieldCfg = filterMap.get('filter-date-field');
    const statusFieldCfg = filterMap.get('filter-status-field');

    return {
      hideStatus: statusCfg ? !statusCfg.is_visible : defaults.hideStatus,
      hideTime: timeCfg ? !timeCfg.is_visible : defaults.hideTime,
      hideLocation: locationCfg ? !locationCfg.is_visible : defaults.hideLocation,
      dateField: dateFieldCfg?.custom_title || defaults.dateField,
      statusField: statusFieldCfg?.custom_title || defaults.statusField,
    };
  }, [configs, tabKey]);
}

/** Admin mutation helpers */
export function useAnalyticsChartsConfigMutations() {
  const queryClient = useQueryClient();

  const upsertConfig = useMutation({
    mutationFn: async (items: ChartConfigItem[]) => {
      const toUpsert = items.map(({ id, ...rest }) => ({
        tab_key: rest.tab_key,
        item_key: rest.item_key,
        item_type: rest.item_type,
        is_visible: rest.is_visible,
        display_order: rest.display_order,
        custom_title: rest.custom_title || null,
        custom_color: rest.custom_color || null,
        chart_type: (rest.item_type === 'tab' || rest.item_type === 'filter' || rest.item_type === 'cross') ? null : (rest.chart_type || null),
        custom_icon: rest.custom_icon || null,
        col_span: rest.col_span ?? 1,
      }));
      const { error } = await supabase
        .from('analytics_charts_config')
        .upsert(toUpsert as any, { onConflict: 'tab_key,item_key' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const deleteConfig = useMutation({
    mutationFn: async ({ tab_key, item_key }: { tab_key: string; item_key: string }) => {
      const { error } = await supabase
        .from('analytics_charts_config')
        .delete()
        .eq('tab_key', tab_key)
        .eq('item_key', item_key);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const deleteTabOverrides = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('analytics_charts_config')
        .delete()
        .eq('item_key', '__tab__');
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return { upsertConfig, deleteConfig, deleteTabOverrides };
}

/** Returns the cross-variable config for a specific chart, merged with DB overrides */
export function useTabCrossConfig(tabKey: string, chartKey: string) {
  const { configs } = useAnalyticsChartsConfig();

  return useMemo(() => {
    const crossItem = configs.find(
      c => c.tab_key === tabKey && c.item_key === `cross-${chartKey}` && c.item_type === 'cross'
    );
    return getCrossVariablesWithOverrides(
      tabKey,
      chartKey,
      crossItem ? { is_visible: crossItem.is_visible, custom_title: crossItem.custom_title } : undefined
    );
  }, [configs, tabKey, chartKey]);
}

/** Exported for admin UI filter management */
export { TAB_FILTER_DEFAULTS };

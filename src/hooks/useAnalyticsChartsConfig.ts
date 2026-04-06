import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

export interface ChartConfigItem {
  id?: string;
  tab_key: string;
  item_key: string;
  item_type: 'chart' | 'kpi' | 'tab' | 'filter';
  is_visible: boolean;
  display_order: number;
  custom_title?: string | null;
  custom_color?: string | null;
  chart_type?: 'bar-h' | 'bar-v' | 'pie' | 'donut' | 'area' | null;
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
  'title-requests': { hideStatus: false, hideTime: false, hideLocation: false, dateField: 'created_at' },
  'parcels-titled': { hideStatus: false, hideTime: false, hideLocation: false, dateField: 'created_at' },
  'contributions': { hideStatus: false, hideTime: false, hideLocation: false, dateField: 'created_at' },
  'expertise': { hideStatus: false, hideTime: false, hideLocation: false, dateField: 'created_at' },
  'mutations': { hideStatus: false, hideTime: false, hideLocation: false, dateField: 'created_at' },
  'mortgages': { hideStatus: false, hideTime: false, hideLocation: false, dateField: 'created_at' },
  'subdivision': { hideStatus: false, hideTime: false, hideLocation: false, dateField: 'created_at' },
  'disputes': { hideStatus: false, hideTime: false, hideLocation: false, dateField: 'created_at', statusField: 'current_status' },
  'ownership': { hideStatus: true, hideTime: false, hideLocation: false, dateField: 'ownership_start_date' },
  'fraud': { hideStatus: true, hideTime: false, hideLocation: false, dateField: 'created_at' },
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
function buildFilterDefaults(tabKey: string): ChartConfigItem[] {
  const defaults = TAB_FILTER_DEFAULTS[tabKey];
  if (!defaults) return [];
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

    return Object.entries(ANALYTICS_TABS_REGISTRY).filter(([key]) => key !== '_global').map(([key, reg], i) => {
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
    configs.filter(c => c.tab_key === tabKey && c.item_type !== 'tab' && c.item_type !== 'filter').forEach(c => dbMap.set(c.item_key, c));

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
      // Strip client-only id field; keep only DB-relevant columns
      const toUpsert = items.map(({ id, ...rest }) => ({
        tab_key: rest.tab_key,
        item_key: rest.item_key,
        item_type: rest.item_type,
        is_visible: rest.is_visible,
        display_order: rest.display_order,
        custom_title: rest.custom_title || null,
        custom_color: rest.custom_color || null,
        chart_type: (rest.item_type === 'tab' || rest.item_type === 'filter') ? null : (rest.chart_type || null),
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

/** Exported for admin UI filter management */
export { TAB_FILTER_DEFAULTS, buildFilterDefaults };

/** Registry of all analytics tabs with their default charts and KPIs */
export const ANALYTICS_TABS_REGISTRY: Record<string, { label: string; charts: ChartConfigItem[]; kpis: ChartConfigItem[] }> = {
  'title-requests': {
    label: 'Titres fonciers',
    charts: [
      { tab_key: 'title-requests', item_key: 'request-type', item_type: 'chart', is_visible: true, display_order: 0, custom_title: 'Type de demande', chart_type: 'bar-h' },
      { tab_key: 'title-requests', item_key: 'requester-type', item_type: 'chart', is_visible: true, display_order: 1, custom_title: 'Demandeur', chart_type: 'donut' },
      { tab_key: 'title-requests', item_key: 'status', item_type: 'chart', is_visible: true, display_order: 2, custom_title: 'Statut', chart_type: 'bar-v' },
      { tab_key: 'title-requests', item_key: 'payment', item_type: 'chart', is_visible: true, display_order: 3, custom_title: 'Paiement', chart_type: 'donut' },
      { tab_key: 'title-requests', item_key: 'legal-status', item_type: 'chart', is_visible: true, display_order: 4, custom_title: 'Statut juridique', chart_type: 'donut' },
      { tab_key: 'title-requests', item_key: 'declared-usage', item_type: 'chart', is_visible: true, display_order: 5, custom_title: 'Usage déclaré', chart_type: 'bar-h' },
      { tab_key: 'title-requests', item_key: 'gender', item_type: 'chart', is_visible: true, display_order: 6, custom_title: 'Genre', chart_type: 'pie' },
      { tab_key: 'title-requests', item_key: 'nationality', item_type: 'chart', is_visible: true, display_order: 7, custom_title: 'Nationalité', chart_type: 'bar-h' },
      { tab_key: 'title-requests', item_key: 'deduced-title', item_type: 'chart', is_visible: true, display_order: 8, custom_title: 'Titre déduit', chart_type: 'bar-h' },
      { tab_key: 'title-requests', item_key: 'owner-same', item_type: 'chart', is_visible: true, display_order: 9, custom_title: 'Demandeur = Proprio', chart_type: 'pie' },
      { tab_key: 'title-requests', item_key: 'surface', item_type: 'chart', is_visible: true, display_order: 10, custom_title: 'Superficie demandée', chart_type: 'bar-v' },
      { tab_key: 'title-requests', item_key: 'construction-type', item_type: 'chart', is_visible: true, display_order: 11, custom_title: 'Type construction', chart_type: 'bar-h' },
      { tab_key: 'title-requests', item_key: 'construction-nature', item_type: 'chart', is_visible: true, display_order: 12, custom_title: 'Nature construction', chart_type: 'bar-h' },
      { tab_key: 'title-requests', item_key: 'revenue-trend', item_type: 'chart', is_visible: true, display_order: 13, custom_title: 'Revenus/mois', chart_type: 'area' },
      { tab_key: 'title-requests', item_key: 'processing-comparison', item_type: 'chart', is_visible: true, display_order: 14, custom_title: 'Délai estimé vs réel', chart_type: 'bar-v' },
      { tab_key: 'title-requests', item_key: 'geo', item_type: 'chart', is_visible: true, display_order: 15, custom_title: 'Géographie' },
      { tab_key: 'title-requests', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 16, custom_title: 'Évolution', chart_type: 'area', col_span: 2 },
    ],
    kpis: [
      { tab_key: 'title-requests', item_key: 'kpi-total', item_type: 'kpi', is_visible: true, display_order: 0, custom_title: 'Total' },
      { tab_key: 'title-requests', item_key: 'kpi-urbaine', item_type: 'kpi', is_visible: true, display_order: 1, custom_title: 'Urbaine' },
      { tab_key: 'title-requests', item_key: 'kpi-rurale', item_type: 'kpi', is_visible: true, display_order: 2, custom_title: 'Rurale' },
      { tab_key: 'title-requests', item_key: 'kpi-approval', item_type: 'kpi', is_visible: true, display_order: 3, custom_title: 'Taux approbation' },
      { tab_key: 'title-requests', item_key: 'kpi-revenue', item_type: 'kpi', is_visible: true, display_order: 4, custom_title: 'Revenus payés' },
      { tab_key: 'title-requests', item_key: 'kpi-delay', item_type: 'kpi', is_visible: true, display_order: 5, custom_title: 'Délai moy.' },
    ],
  },
  'parcels-titled': {
    label: 'Parcelles',
    charts: [
      { tab_key: 'parcels-titled', item_key: 'title-type', item_type: 'chart', is_visible: true, display_order: 0, custom_title: 'Type titre', chart_type: 'bar-h' },
      { tab_key: 'parcels-titled', item_key: 'legal-status', item_type: 'chart', is_visible: true, display_order: 1, custom_title: 'Propriétaires', chart_type: 'donut' },
      { tab_key: 'parcels-titled', item_key: 'gender', item_type: 'chart', is_visible: true, display_order: 2, custom_title: 'Genre propriétaires', chart_type: 'pie' },
      { tab_key: 'parcels-titled', item_key: 'construction-type', item_type: 'chart', is_visible: true, display_order: 3, custom_title: 'Construction', chart_type: 'bar-h' },
      { tab_key: 'parcels-titled', item_key: 'construction-nature', item_type: 'chart', is_visible: true, display_order: 4, custom_title: 'Nature construction', chart_type: 'bar-h' },
      { tab_key: 'parcels-titled', item_key: 'construction-decade', item_type: 'chart', is_visible: true, display_order: 5, custom_title: 'Année construction', chart_type: 'bar-v' },
      { tab_key: 'parcels-titled', item_key: 'usage', item_type: 'chart', is_visible: true, display_order: 6, custom_title: 'Usage déclaré', chart_type: 'bar-h' },
      { tab_key: 'parcels-titled', item_key: 'lease-type', item_type: 'chart', is_visible: true, display_order: 7, custom_title: 'Type bail', chart_type: 'donut' },
      { tab_key: 'parcels-titled', item_key: 'surface', item_type: 'chart', is_visible: true, display_order: 8, custom_title: 'Superficie', chart_type: 'bar-v' },
      { tab_key: 'parcels-titled', item_key: 'geo', item_type: 'chart', is_visible: true, display_order: 9, custom_title: 'Géographie' },
      { tab_key: 'parcels-titled', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 10, custom_title: 'Évolution', chart_type: 'area', col_span: 2 },
    ],
    kpis: [
      { tab_key: 'parcels-titled', item_key: 'kpi-parcels', item_type: 'kpi', is_visible: true, display_order: 0, custom_title: 'Parcelles' },
      { tab_key: 'parcels-titled', item_key: 'kpi-urban', item_type: 'kpi', is_visible: true, display_order: 1, custom_title: 'Urbaines' },
      { tab_key: 'parcels-titled', item_key: 'kpi-rural', item_type: 'kpi', is_visible: true, display_order: 2, custom_title: 'Rurales' },
      { tab_key: 'parcels-titled', item_key: 'kpi-surface', item_type: 'kpi', is_visible: true, display_order: 3, custom_title: 'Surface tot.' },
    ],
  },
  'contributions': {
    label: 'Contributions',
    charts: [
      { tab_key: 'contributions', item_key: 'contribution-type', item_type: 'chart', is_visible: true, display_order: 0, custom_title: 'Type contribution', chart_type: 'bar-h' },
      { tab_key: 'contributions', item_key: 'status', item_type: 'chart', is_visible: true, display_order: 1, custom_title: 'Statut', chart_type: 'pie' },
      { tab_key: 'contributions', item_key: 'title-type', item_type: 'chart', is_visible: true, display_order: 2, custom_title: 'Type titre', chart_type: 'bar-h' },
      { tab_key: 'contributions', item_key: 'legal-status', item_type: 'chart', is_visible: true, display_order: 3, custom_title: 'Statut juridique', chart_type: 'donut' },
      { tab_key: 'contributions', item_key: 'usage', item_type: 'chart', is_visible: true, display_order: 4, custom_title: 'Usage déclaré', chart_type: 'bar-h' },
      { tab_key: 'contributions', item_key: 'construction-type', item_type: 'chart', is_visible: true, display_order: 5, custom_title: 'Type construction', chart_type: 'bar-h' },
      { tab_key: 'contributions', item_key: 'fraud-detection', item_type: 'chart', is_visible: true, display_order: 6, custom_title: 'Détection fraude', chart_type: 'pie' },
      { tab_key: 'contributions', item_key: 'fraud-score', item_type: 'chart', is_visible: true, display_order: 7, custom_title: 'Score fraude', chart_type: 'bar-v' },
      { tab_key: 'contributions', item_key: 'fraud-reason', item_type: 'chart', is_visible: true, display_order: 8, custom_title: 'Motif fraude', chart_type: 'bar-h' },
      { tab_key: 'contributions', item_key: 'appeal-status', item_type: 'chart', is_visible: true, display_order: 9, custom_title: 'Statut appel', chart_type: 'donut' },
      { tab_key: 'contributions', item_key: 'geo', item_type: 'chart', is_visible: true, display_order: 10, custom_title: 'Géographie' },
      { tab_key: 'contributions', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 11, custom_title: 'Évolution', chart_type: 'area', col_span: 2 },
    ],
    kpis: [
      { tab_key: 'contributions', item_key: 'kpi-total', item_type: 'kpi', is_visible: true, display_order: 0, custom_title: 'Total' },
      { tab_key: 'contributions', item_key: 'kpi-approved', item_type: 'kpi', is_visible: true, display_order: 1, custom_title: 'Approuvées' },
      { tab_key: 'contributions', item_key: 'kpi-pending', item_type: 'kpi', is_visible: true, display_order: 2, custom_title: 'En attente' },
      { tab_key: 'contributions', item_key: 'kpi-suspicious', item_type: 'kpi', is_visible: true, display_order: 3, custom_title: 'Suspectes' },
      { tab_key: 'contributions', item_key: 'kpi-appeals', item_type: 'kpi', is_visible: true, display_order: 4, custom_title: 'Appels' },
      { tab_key: 'contributions', item_key: 'kpi-delay', item_type: 'kpi', is_visible: true, display_order: 5, custom_title: 'Délai moy.' },
    ],
  },
  'expertise': {
    label: 'Expertise',
    charts: [
      { tab_key: 'expertise', item_key: 'status', item_type: 'chart', is_visible: true, display_order: 0, custom_title: 'Statut détaillé', chart_type: 'bar-v' },
      { tab_key: 'expertise', item_key: 'payment', item_type: 'chart', is_visible: true, display_order: 1, custom_title: 'Paiement', chart_type: 'donut' },
      { tab_key: 'expertise', item_key: 'property-condition', item_type: 'chart', is_visible: true, display_order: 2, custom_title: 'État du bien', chart_type: 'bar-h' },
      { tab_key: 'expertise', item_key: 'construction-quality', item_type: 'chart', is_visible: true, display_order: 3, custom_title: 'Qualité construction', chart_type: 'donut' },
      { tab_key: 'expertise', item_key: 'construction-decade', item_type: 'chart', is_visible: true, display_order: 4, custom_title: 'Année construction', chart_type: 'bar-v' },
      { tab_key: 'expertise', item_key: 'built-area', item_type: 'chart', is_visible: true, display_order: 5, custom_title: 'Surface bâtie', chart_type: 'bar-v' },
      { tab_key: 'expertise', item_key: 'equipment', item_type: 'chart', is_visible: true, display_order: 6, custom_title: 'Équipements', chart_type: 'bar-h' },
      { tab_key: 'expertise', item_key: 'wall-material', item_type: 'chart', is_visible: true, display_order: 7, custom_title: 'Matériau murs', chart_type: 'bar-h' },
      { tab_key: 'expertise', item_key: 'roof-material', item_type: 'chart', is_visible: true, display_order: 8, custom_title: 'Matériau toiture', chart_type: 'pie' },
      { tab_key: 'expertise', item_key: 'sound-env', item_type: 'chart', is_visible: true, display_order: 9, custom_title: 'Env. sonore', chart_type: 'donut' },
      { tab_key: 'expertise', item_key: 'building-position', item_type: 'chart', is_visible: true, display_order: 10, custom_title: 'Position bâtiment', chart_type: 'pie' },
      { tab_key: 'expertise', item_key: 'road-access', item_type: 'chart', is_visible: true, display_order: 11, custom_title: 'Accès routier', chart_type: 'pie' },
      { tab_key: 'expertise', item_key: 'proximity', item_type: 'chart', is_visible: true, display_order: 12, custom_title: 'Proximité moy.', chart_type: 'bar-h' },
      { tab_key: 'expertise', item_key: 'risk-zones', item_type: 'chart', is_visible: true, display_order: 13, custom_title: 'Zones à risque', chart_type: 'pie' },
      { tab_key: 'expertise', item_key: 'market-value', item_type: 'chart', is_visible: true, display_order: 14, custom_title: 'Valeur marchande', chart_type: 'bar-v' },
      { tab_key: 'expertise', item_key: 'floors', item_type: 'chart', is_visible: true, display_order: 15, custom_title: 'Nbre d\'étages', chart_type: 'bar-v' },
      { tab_key: 'expertise', item_key: 'garden', item_type: 'chart', is_visible: true, display_order: 16, custom_title: 'Surface jardin', chart_type: 'bar-v' },
      { tab_key: 'expertise', item_key: 'geo', item_type: 'chart', is_visible: true, display_order: 17, custom_title: 'Géographie' },
      { tab_key: 'expertise', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 18, custom_title: 'Évolution', chart_type: 'area', col_span: 2 },
    ],
    kpis: [
      { tab_key: 'expertise', item_key: 'kpi-total', item_type: 'kpi', is_visible: true, display_order: 0, custom_title: 'Total' },
      { tab_key: 'expertise', item_key: 'kpi-completed', item_type: 'kpi', is_visible: true, display_order: 1, custom_title: 'Complétées' },
      { tab_key: 'expertise', item_key: 'kpi-in-progress', item_type: 'kpi', is_visible: true, display_order: 2, custom_title: 'En cours' },
      { tab_key: 'expertise', item_key: 'kpi-delay-total', item_type: 'kpi', is_visible: true, display_order: 3, custom_title: 'Délai total' },
      { tab_key: 'expertise', item_key: 'kpi-delay-assign', item_type: 'kpi', is_visible: true, display_order: 4, custom_title: 'Délai assign.' },
      { tab_key: 'expertise', item_key: 'kpi-avg-value', item_type: 'kpi', is_visible: true, display_order: 5, custom_title: 'Valeur moy.' },
    ],
  },
  'mutations': {
    label: 'Mutations',
    charts: [
      { tab_key: 'mutations', item_key: 'status', item_type: 'chart', is_visible: true, display_order: 0, custom_title: 'Statut', chart_type: 'pie' },
      { tab_key: 'mutations', item_key: 'mutation-type', item_type: 'chart', is_visible: true, display_order: 1, custom_title: 'Type mutation', chart_type: 'bar-h' },
      { tab_key: 'mutations', item_key: 'requester-type', item_type: 'chart', is_visible: true, display_order: 2, custom_title: 'Type demandeur', chart_type: 'donut' },
      { tab_key: 'mutations', item_key: 'payment', item_type: 'chart', is_visible: true, display_order: 3, custom_title: 'Paiement', chart_type: 'donut' },
      { tab_key: 'mutations', item_key: 'type-status', item_type: 'chart', is_visible: true, display_order: 4, custom_title: 'Type × Statut' },
      { tab_key: 'mutations', item_key: 'market-value', item_type: 'chart', is_visible: true, display_order: 5, custom_title: 'Valeur vénale', chart_type: 'bar-v' },
      { tab_key: 'mutations', item_key: 'title-age', item_type: 'chart', is_visible: true, display_order: 6, custom_title: 'Ancienneté titre', chart_type: 'pie' },
      { tab_key: 'mutations', item_key: 'late-fees', item_type: 'chart', is_visible: true, display_order: 7, custom_title: 'Retard mutation', chart_type: 'pie' },
      { tab_key: 'mutations', item_key: 'revenue-trend', item_type: 'chart', is_visible: true, display_order: 8, custom_title: 'Revenus/mois', chart_type: 'area' },
      { tab_key: 'mutations', item_key: 'geo', item_type: 'chart', is_visible: true, display_order: 9, custom_title: 'Géographie' },
      { tab_key: 'mutations', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 10, custom_title: 'Évolution', chart_type: 'area', col_span: 2 },
    ],
    kpis: [
      { tab_key: 'mutations', item_key: 'kpi-total', item_type: 'kpi', is_visible: true, display_order: 0, custom_title: 'Total' },
      { tab_key: 'mutations', item_key: 'kpi-approved', item_type: 'kpi', is_visible: true, display_order: 1, custom_title: 'Approuvées' },
      { tab_key: 'mutations', item_key: 'kpi-pending', item_type: 'kpi', is_visible: true, display_order: 2, custom_title: 'En attente' },
      { tab_key: 'mutations', item_key: 'kpi-rejected', item_type: 'kpi', is_visible: true, display_order: 3, custom_title: 'Rejetées' },
      { tab_key: 'mutations', item_key: 'kpi-delay', item_type: 'kpi', is_visible: true, display_order: 4, custom_title: 'Délai moy.' },
      { tab_key: 'mutations', item_key: 'kpi-revenue', item_type: 'kpi', is_visible: true, display_order: 5, custom_title: 'Revenus' },
    ],
  },
  'mortgages': {
    label: 'Hypothèques',
    charts: [
      { tab_key: 'mortgages', item_key: 'creditor-type', item_type: 'chart', is_visible: true, display_order: 0, custom_title: 'Type créancier', chart_type: 'donut' },
      { tab_key: 'mortgages', item_key: 'amount-brackets', item_type: 'chart', is_visible: true, display_order: 1, custom_title: 'Montants', chart_type: 'bar-v' },
      { tab_key: 'mortgages', item_key: 'status', item_type: 'chart', is_visible: true, display_order: 2, custom_title: 'Statut', chart_type: 'pie' },
      { tab_key: 'mortgages', item_key: 'request-type', item_type: 'chart', is_visible: true, display_order: 3, custom_title: 'Enreg. vs Radiation', chart_type: 'pie' },
      { tab_key: 'mortgages', item_key: 'request-status', item_type: 'chart', is_visible: true, display_order: 4, custom_title: 'Statut demandes', chart_type: 'bar-v' },
      { tab_key: 'mortgages', item_key: 'duration', item_type: 'chart', is_visible: true, display_order: 5, custom_title: 'Durée (mois)', chart_type: 'bar-v' },
      { tab_key: 'mortgages', item_key: 'geo', item_type: 'chart', is_visible: true, display_order: 6, custom_title: 'Géographie' },
      { tab_key: 'mortgages', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 7, custom_title: 'Évolution', chart_type: 'area', col_span: 2 },
    ],
    kpis: [
      { tab_key: 'mortgages', item_key: 'kpi-total', item_type: 'kpi', is_visible: true, display_order: 0, custom_title: 'Total' },
      { tab_key: 'mortgages', item_key: 'kpi-active', item_type: 'kpi', is_visible: true, display_order: 1, custom_title: 'Actives' },
      { tab_key: 'mortgages', item_key: 'kpi-paid', item_type: 'kpi', is_visible: true, display_order: 2, custom_title: 'Soldées' },
      { tab_key: 'mortgages', item_key: 'kpi-amount', item_type: 'kpi', is_visible: true, display_order: 3, custom_title: 'Montant total' },
      { tab_key: 'mortgages', item_key: 'kpi-pending', item_type: 'kpi', is_visible: true, display_order: 4, custom_title: 'Demandes en att.' },
    ],
  },
  'subdivision': {
    label: 'Lotissement',
    charts: [
      { tab_key: 'subdivision', item_key: 'status', item_type: 'chart', is_visible: true, display_order: 0, custom_title: 'Statut', chart_type: 'pie' },
      { tab_key: 'subdivision', item_key: 'lots-distribution', item_type: 'chart', is_visible: true, display_order: 1, custom_title: 'Distribution lots', chart_type: 'bar-v' },
      { tab_key: 'subdivision', item_key: 'purpose', item_type: 'chart', is_visible: true, display_order: 2, custom_title: 'Objet lotissement', chart_type: 'bar-h' },
      { tab_key: 'subdivision', item_key: 'requester-type', item_type: 'chart', is_visible: true, display_order: 3, custom_title: 'Type demandeur', chart_type: 'donut' },
      { tab_key: 'subdivision', item_key: 'payment', item_type: 'chart', is_visible: true, display_order: 4, custom_title: 'Paiement', chart_type: 'donut' },
      { tab_key: 'subdivision', item_key: 'surface', item_type: 'chart', is_visible: true, display_order: 5, custom_title: 'Surface parcelle mère', chart_type: 'bar-v' },
      { tab_key: 'subdivision', item_key: 'revenue-trend', item_type: 'chart', is_visible: true, display_order: 6, custom_title: 'Revenus/mois', chart_type: 'area' },
      { tab_key: 'subdivision', item_key: 'geo', item_type: 'chart', is_visible: true, display_order: 7, custom_title: 'Géographie' },
      { tab_key: 'subdivision', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 8, custom_title: 'Évolution', chart_type: 'area', col_span: 2 },
    ],
    kpis: [
      { tab_key: 'subdivision', item_key: 'kpi-total', item_type: 'kpi', is_visible: true, display_order: 0, custom_title: 'Total' },
      { tab_key: 'subdivision', item_key: 'kpi-lots', item_type: 'kpi', is_visible: true, display_order: 1, custom_title: 'Lots prévus' },
      { tab_key: 'subdivision', item_key: 'kpi-avg-lots', item_type: 'kpi', is_visible: true, display_order: 2, custom_title: 'Moy. lots/dem.' },
      { tab_key: 'subdivision', item_key: 'kpi-approved', item_type: 'kpi', is_visible: true, display_order: 3, custom_title: 'Approuvées' },
      { tab_key: 'subdivision', item_key: 'kpi-delay', item_type: 'kpi', is_visible: true, display_order: 4, custom_title: 'Délai moy.' },
      { tab_key: 'subdivision', item_key: 'kpi-surface', item_type: 'kpi', is_visible: true, display_order: 5, custom_title: 'Surface tot.' },
    ],
  },
  'disputes': {
    label: 'Litiges fonciers',
    charts: [
      { tab_key: 'disputes', item_key: 'nature', item_type: 'chart', is_visible: true, display_order: 0, custom_title: 'Nature', chart_type: 'bar-h' },
      { tab_key: 'disputes', item_key: 'resolution-status', item_type: 'chart', is_visible: true, display_order: 1, custom_title: 'En cours vs Résolus', chart_type: 'pie' },
      { tab_key: 'disputes', item_key: 'status-detail', item_type: 'chart', is_visible: true, display_order: 2, custom_title: 'Statut détaillé', chart_type: 'bar-v' },
      { tab_key: 'disputes', item_key: 'type', item_type: 'chart', is_visible: true, display_order: 3, custom_title: 'Type litige', chart_type: 'donut' },
      { tab_key: 'disputes', item_key: 'resolution-level', item_type: 'chart', is_visible: true, display_order: 4, custom_title: 'Niveau résolution', chart_type: 'bar-h' },
      { tab_key: 'disputes', item_key: 'declarant-quality', item_type: 'chart', is_visible: true, display_order: 5, custom_title: 'Qualité déclarant', chart_type: 'donut' },
      { tab_key: 'disputes', item_key: 'nature-resolution', item_type: 'chart', is_visible: true, display_order: 6, custom_title: 'Nature × Résolution' },
      { tab_key: 'disputes', item_key: 'geo', item_type: 'chart', is_visible: true, display_order: 7, custom_title: 'Géographie' },
      { tab_key: 'disputes', item_key: 'resolution-rate', item_type: 'chart', is_visible: true, display_order: 8, custom_title: 'Taux résolution %', chart_type: 'area', col_span: 2 },
      { tab_key: 'disputes', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 9, custom_title: 'Évolution signalements', chart_type: 'area', col_span: 2 },
      { tab_key: 'disputes', item_key: 'lifting-status', item_type: 'chart', is_visible: true, display_order: 10, custom_title: 'Statut levée', chart_type: 'pie' },
      { tab_key: 'disputes', item_key: 'lifting-resolution-level', item_type: 'chart', is_visible: true, display_order: 11, custom_title: 'Niveau résolution (levée)', chart_type: 'bar-h' },
      { tab_key: 'disputes', item_key: 'lifting-nature', item_type: 'chart', is_visible: true, display_order: 12, custom_title: 'Nature litige (levée)', chart_type: 'bar-h' },
      { tab_key: 'disputes', item_key: 'lifting-reason', item_type: 'chart', is_visible: true, display_order: 13, custom_title: 'Motif de levée', chart_type: 'bar-h' },
      { tab_key: 'disputes', item_key: 'lifting-geo', item_type: 'chart', is_visible: true, display_order: 14, custom_title: 'Géographie (levée)' },
      { tab_key: 'disputes', item_key: 'lifting-success-rate', item_type: 'chart', is_visible: true, display_order: 15, custom_title: 'Taux réussite %', chart_type: 'area', col_span: 2 },
      { tab_key: 'disputes', item_key: 'lifting-evolution', item_type: 'chart', is_visible: true, display_order: 16, custom_title: 'Évolution levées', chart_type: 'area', col_span: 2 },
    ],
    kpis: [
      { tab_key: 'disputes', item_key: 'kpi-total', item_type: 'kpi', is_visible: true, display_order: 0, custom_title: 'Total' },
      { tab_key: 'disputes', item_key: 'kpi-en-cours', item_type: 'kpi', is_visible: true, display_order: 1, custom_title: 'En cours' },
      { tab_key: 'disputes', item_key: 'kpi-resolus', item_type: 'kpi', is_visible: true, display_order: 2, custom_title: 'Résolus' },
      { tab_key: 'disputes', item_key: 'kpi-rate', item_type: 'kpi', is_visible: true, display_order: 3, custom_title: 'Taux résolution' },
      { tab_key: 'disputes', item_key: 'kpi-duration', item_type: 'kpi', is_visible: true, display_order: 4, custom_title: 'Durée moy.' },
      { tab_key: 'disputes', item_key: 'kpi-lifting-total', item_type: 'kpi', is_visible: true, display_order: 5, custom_title: 'Demandes levée' },
      { tab_key: 'disputes', item_key: 'kpi-lifting-approved', item_type: 'kpi', is_visible: true, display_order: 6, custom_title: 'Levées approuvées' },
      { tab_key: 'disputes', item_key: 'kpi-lifting-pending', item_type: 'kpi', is_visible: true, display_order: 7, custom_title: 'Levées en attente' },
      { tab_key: 'disputes', item_key: 'kpi-lifting-success', item_type: 'kpi', is_visible: true, display_order: 8, custom_title: 'Taux réussite levée' },
    ],
  },
  'ownership': {
    label: 'Historique prop.',
    charts: [
      { tab_key: 'ownership', item_key: 'legal-status', item_type: 'chart', is_visible: true, display_order: 0, custom_title: 'Statut juridique', chart_type: 'donut' },
      { tab_key: 'ownership', item_key: 'mutation-type', item_type: 'chart', is_visible: true, display_order: 1, custom_title: 'Type mutation', chart_type: 'bar-h' },
      { tab_key: 'ownership', item_key: 'geo', item_type: 'chart', is_visible: true, display_order: 2, custom_title: 'Géographie' },
      { tab_key: 'ownership', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 3, custom_title: 'Évolution', chart_type: 'area', col_span: 2 },
    ],
    kpis: [
      { tab_key: 'ownership', item_key: 'kpi-total', item_type: 'kpi', is_visible: true, display_order: 0, custom_title: 'Total transferts' },
      { tab_key: 'ownership', item_key: 'kpi-active', item_type: 'kpi', is_visible: true, display_order: 1, custom_title: 'Propriétaires actifs' },
      { tab_key: 'ownership', item_key: 'kpi-closed', item_type: 'kpi', is_visible: true, display_order: 2, custom_title: 'Transferts clos' },
      { tab_key: 'ownership', item_key: 'kpi-duration', item_type: 'kpi', is_visible: true, display_order: 3, custom_title: 'Durée moy.' },
    ],
  },
  'fraud': {
    label: 'Fraude',
    charts: [
      { tab_key: 'fraud', item_key: 'fraud-type', item_type: 'chart', is_visible: true, display_order: 0, custom_title: 'Type de fraude', chart_type: 'bar-h' },
      { tab_key: 'fraud', item_key: 'severity', item_type: 'chart', is_visible: true, display_order: 1, custom_title: 'Sévérité', chart_type: 'pie' },
      { tab_key: 'fraud', item_key: 'type-severity-cross', item_type: 'chart', is_visible: true, display_order: 2, custom_title: 'Type × Sévérité' },
      { tab_key: 'fraud', item_key: 'linked', item_type: 'chart', is_visible: true, display_order: 3, custom_title: 'Liées à contrib.', chart_type: 'donut' },
      { tab_key: 'fraud', item_key: 'geo', item_type: 'chart', is_visible: true, display_order: 4, custom_title: 'Géographie' },
      { tab_key: 'fraud', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 5, custom_title: 'Évolution', chart_type: 'area', col_span: 2 },
    ],
    kpis: [
      { tab_key: 'fraud', item_key: 'kpi-total', item_type: 'kpi', is_visible: true, display_order: 0, custom_title: 'Total' },
      { tab_key: 'fraud', item_key: 'kpi-critical', item_type: 'kpi', is_visible: true, display_order: 1, custom_title: 'Critiques/Élevées' },
      { tab_key: 'fraud', item_key: 'kpi-medium', item_type: 'kpi', is_visible: true, display_order: 2, custom_title: 'Moyennes' },
      { tab_key: 'fraud', item_key: 'kpi-low', item_type: 'kpi', is_visible: true, display_order: 3, custom_title: 'Faibles' },
      { tab_key: 'fraud', item_key: 'kpi-linked', item_type: 'kpi', is_visible: true, display_order: 4, custom_title: 'Liées contrib.' },
    ],
  },
  'certificates': {
    label: 'Certificats',
    charts: [
      { tab_key: 'certificates', item_key: 'cert-type', item_type: 'chart', is_visible: true, display_order: 0, custom_title: 'Type certificat', chart_type: 'bar-h' },
      { tab_key: 'certificates', item_key: 'status', item_type: 'chart', is_visible: true, display_order: 1, custom_title: 'Statut', chart_type: 'pie' },
      { tab_key: 'certificates', item_key: 'type-trend', item_type: 'chart', is_visible: true, display_order: 2, custom_title: 'Type × Mois' },
      { tab_key: 'certificates', item_key: 'geo', item_type: 'chart', is_visible: true, display_order: 3, custom_title: 'Géographie' },
      { tab_key: 'certificates', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 4, custom_title: 'Évolution', chart_type: 'area', col_span: 2 },
    ],
    kpis: [
      { tab_key: 'certificates', item_key: 'kpi-total', item_type: 'kpi', is_visible: true, display_order: 0, custom_title: 'Total' },
      { tab_key: 'certificates', item_key: 'kpi-generated', item_type: 'kpi', is_visible: true, display_order: 1, custom_title: 'Générés' },
      { tab_key: 'certificates', item_key: 'kpi-pending', item_type: 'kpi', is_visible: true, display_order: 2, custom_title: 'En attente' },
      { tab_key: 'certificates', item_key: 'kpi-types', item_type: 'kpi', is_visible: true, display_order: 3, custom_title: 'Types distincts' },
    ],
  },
  'invoices': {
    label: 'Factures',
    charts: [
      { tab_key: 'invoices', item_key: 'status', item_type: 'chart', is_visible: true, display_order: 0, custom_title: 'Statut', chart_type: 'pie' },
      { tab_key: 'invoices', item_key: 'payment-method', item_type: 'chart', is_visible: true, display_order: 1, custom_title: 'Moyen paiement', chart_type: 'donut' },
      { tab_key: 'invoices', item_key: 'geo-zone', item_type: 'chart', is_visible: true, display_order: 2, custom_title: 'Zone géographique', chart_type: 'bar-h' },
      { tab_key: 'invoices', item_key: 'revenue-trend', item_type: 'chart', is_visible: true, display_order: 3, custom_title: 'Revenus/mois', chart_type: 'area' },
      { tab_key: 'invoices', item_key: 'geo', item_type: 'chart', is_visible: true, display_order: 4, custom_title: 'Géographie' },
      { tab_key: 'invoices', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 5, custom_title: 'Évolution', chart_type: 'area', col_span: 2 },
    ],
    kpis: [
      { tab_key: 'invoices', item_key: 'kpi-total', item_type: 'kpi', is_visible: true, display_order: 0, custom_title: 'Total' },
      { tab_key: 'invoices', item_key: 'kpi-paid', item_type: 'kpi', is_visible: true, display_order: 1, custom_title: 'Payées' },
      { tab_key: 'invoices', item_key: 'kpi-revenue', item_type: 'kpi', is_visible: true, display_order: 2, custom_title: 'Revenus payés' },
      { tab_key: 'invoices', item_key: 'kpi-avg', item_type: 'kpi', is_visible: true, display_order: 3, custom_title: 'Montant moy.' },
      { tab_key: 'invoices', item_key: 'kpi-discounts', item_type: 'kpi', is_visible: true, display_order: 4, custom_title: 'Remises' },
    ],
  },
  'building-permits': {
    label: 'Autorisations',
    charts: [
      { tab_key: 'building-permits', item_key: 'status', item_type: 'chart', is_visible: true, display_order: 0, custom_title: 'Statut administratif', chart_type: 'bar-v' },
      { tab_key: 'building-permits', item_key: 'current-status', item_type: 'chart', is_visible: true, display_order: 1, custom_title: 'En cours vs Expiré', chart_type: 'pie' },
      { tab_key: 'building-permits', item_key: 'issuing-service', item_type: 'chart', is_visible: true, display_order: 2, custom_title: 'Service émetteur', chart_type: 'bar-h' },
      { tab_key: 'building-permits', item_key: 'validity-period', item_type: 'chart', is_visible: true, display_order: 3, custom_title: 'Période de validité', chart_type: 'bar-v' },
      { tab_key: 'building-permits', item_key: 'estimated-cost', item_type: 'chart', is_visible: true, display_order: 4, custom_title: 'Coût estimé', chart_type: 'bar-v' },
      { tab_key: 'building-permits', item_key: 'roofing-type', item_type: 'chart', is_visible: true, display_order: 5, custom_title: 'Type toiture', chart_type: 'donut' },
      { tab_key: 'building-permits', item_key: 'water-supply', item_type: 'chart', is_visible: true, display_order: 6, custom_title: 'Alimentation eau', chart_type: 'pie' },
      { tab_key: 'building-permits', item_key: 'electricity', item_type: 'chart', is_visible: true, display_order: 7, custom_title: 'Alimentation élec.', chart_type: 'pie' },
      { tab_key: 'building-permits', item_key: 'payment', item_type: 'chart', is_visible: true, display_order: 8, custom_title: 'Paiement', chart_type: 'donut' },
      { tab_key: 'building-permits', item_key: 'geo', item_type: 'chart', is_visible: true, display_order: 9, custom_title: 'Géographie' },
      { tab_key: 'building-permits', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 10, custom_title: 'Évolution', chart_type: 'area', col_span: 2 },
    ],
    kpis: [
      { tab_key: 'building-permits', item_key: 'kpi-total', item_type: 'kpi', is_visible: true, display_order: 0, custom_title: 'Total' },
      { tab_key: 'building-permits', item_key: 'kpi-approved', item_type: 'kpi', is_visible: true, display_order: 1, custom_title: 'Approuvées' },
      { tab_key: 'building-permits', item_key: 'kpi-pending', item_type: 'kpi', is_visible: true, display_order: 2, custom_title: 'En attente' },
      { tab_key: 'building-permits', item_key: 'kpi-rejected', item_type: 'kpi', is_visible: true, display_order: 3, custom_title: 'Rejetées' },
      { tab_key: 'building-permits', item_key: 'kpi-approval-rate', item_type: 'kpi', is_visible: true, display_order: 4, custom_title: 'Taux approbation' },
    ],
  },
  'taxes': {
    label: 'Taxes foncières',
    charts: [
      { tab_key: 'taxes', item_key: 'tax-type', item_type: 'chart', is_visible: true, display_order: 0, custom_title: 'Type de taxe', chart_type: 'pie' },
      { tab_key: 'taxes', item_key: 'fiscal-year', item_type: 'chart', is_visible: true, display_order: 1, custom_title: 'Exercice fiscal', chart_type: 'bar-v' },
      { tab_key: 'taxes', item_key: 'status', item_type: 'chart', is_visible: true, display_order: 2, custom_title: 'Statut', chart_type: 'bar-v' },
      { tab_key: 'taxes', item_key: 'fiscal-zone', item_type: 'chart', is_visible: true, display_order: 3, custom_title: 'Zone fiscale', chart_type: 'donut' },
      { tab_key: 'taxes', item_key: 'penalties', item_type: 'chart', is_visible: true, display_order: 4, custom_title: 'Avec/sans pénalités', chart_type: 'pie' },
      { tab_key: 'taxes', item_key: 'exemptions', item_type: 'chart', is_visible: true, display_order: 5, custom_title: 'Exonérations', chart_type: 'pie' },
      { tab_key: 'taxes', item_key: 'amount-range', item_type: 'chart', is_visible: true, display_order: 6, custom_title: 'Tranche montant', chart_type: 'bar-h' },
      { tab_key: 'taxes', item_key: 'province', item_type: 'chart', is_visible: true, display_order: 7, custom_title: 'Par province', chart_type: 'bar-h' },
      { tab_key: 'taxes', item_key: 'geo', item_type: 'chart', is_visible: true, display_order: 8, custom_title: 'Géographie' },
      { tab_key: 'taxes', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 9, custom_title: 'Évolution', chart_type: 'area', col_span: 2 },
    ],
    kpis: [
      { tab_key: 'taxes', item_key: 'kpi-total', item_type: 'kpi', is_visible: true, display_order: 0, custom_title: 'Total déclarations' },
      { tab_key: 'taxes', item_key: 'kpi-revenue', item_type: 'kpi', is_visible: true, display_order: 1, custom_title: 'Montant total' },
      { tab_key: 'taxes', item_key: 'kpi-pending', item_type: 'kpi', is_visible: true, display_order: 2, custom_title: 'En attente' },
      { tab_key: 'taxes', item_key: 'kpi-approved', item_type: 'kpi', is_visible: true, display_order: 3, custom_title: 'Approuvées' },
      { tab_key: 'taxes', item_key: 'kpi-penalty-rate', item_type: 'kpi', is_visible: true, display_order: 4, custom_title: 'Taux pénalités' },
    ],
  },
  '_global': {
    label: 'Global',
    charts: [
      { tab_key: '_global', item_key: 'global-watermark', item_type: 'chart', is_visible: true, display_order: 0, custom_title: 'BIC - Tous droits réservés' },
    ],
    kpis: [],
  },
  'rdc-map': {
    label: 'Carte RDC',
    charts: [
      { tab_key: 'rdc-map', item_key: 'map-legend-title', item_type: 'chart', is_visible: true, display_order: 0, custom_title: 'Densité parcelles cadastrées' },
      { tab_key: 'rdc-map', item_key: 'map-header-note', item_type: 'chart', is_visible: true, display_order: 1, custom_title: 'Répartition géographique des données foncières cadastrales' },
      { tab_key: 'rdc-map', item_key: 'map-watermark', item_type: 'chart', is_visible: true, display_order: 2, custom_title: 'BIC - Tous droits réservés' },
      { tab_key: 'rdc-map', item_key: 'map-copy-button', item_type: 'chart', is_visible: true, display_order: 3, custom_title: 'Bouton copier image' },
      { tab_key: 'rdc-map', item_key: 'map-tier-1', item_type: 'chart', is_visible: true, display_order: 4, custom_title: 'Faible (0–30)', custom_color: '#bec8d1' },
      { tab_key: 'rdc-map', item_key: 'map-tier-2', item_type: 'chart', is_visible: true, display_order: 5, custom_title: 'Modéré (31–100)', custom_color: '#f0b90b' },
      { tab_key: 'rdc-map', item_key: 'map-tier-3', item_type: 'chart', is_visible: true, display_order: 6, custom_title: 'Élevé (101–500)', custom_color: '#e87422' },
      { tab_key: 'rdc-map', item_key: 'map-tier-4', item_type: 'chart', is_visible: true, display_order: 7, custom_title: 'Très élevé (501+)', custom_color: '#b31942' },
    ],
    kpis: [
      { tab_key: 'rdc-map', item_key: 'tooltip-parcels', item_type: 'kpi', is_visible: true, display_order: 0, custom_title: 'Parcelles' },
      { tab_key: 'rdc-map', item_key: 'tooltip-titles', item_type: 'kpi', is_visible: true, display_order: 1, custom_title: 'Titres dem.' },
      { tab_key: 'rdc-map', item_key: 'tooltip-contributions', item_type: 'kpi', is_visible: true, display_order: 2, custom_title: 'Contributions' },
      { tab_key: 'rdc-map', item_key: 'tooltip-mutations', item_type: 'kpi', is_visible: true, display_order: 3, custom_title: 'Mutations' },
      { tab_key: 'rdc-map', item_key: 'tooltip-disputes', item_type: 'kpi', is_visible: true, display_order: 4, custom_title: 'Litiges' },
      { tab_key: 'rdc-map', item_key: 'tooltip-expertises', item_type: 'kpi', is_visible: true, display_order: 5, custom_title: 'Expertises' },
      { tab_key: 'rdc-map', item_key: 'tooltip-certificates', item_type: 'kpi', is_visible: true, display_order: 6, custom_title: 'Certificats' },
      { tab_key: 'rdc-map', item_key: 'tooltip-invoices', item_type: 'kpi', is_visible: true, display_order: 7, custom_title: 'Factures' },
      { tab_key: 'rdc-map', item_key: 'tooltip-revenue', item_type: 'kpi', is_visible: true, display_order: 8, custom_title: 'Revenus' },
      { tab_key: 'rdc-map', item_key: 'tooltip-fiscal', item_type: 'kpi', is_visible: true, display_order: 9, custom_title: 'Rec. fiscales' },
      { tab_key: 'rdc-map', item_key: 'tooltip-density', item_type: 'kpi', is_visible: true, display_order: 10, custom_title: 'Densité' },
      { tab_key: 'rdc-map', item_key: 'detail-parcels', item_type: 'kpi', is_visible: true, display_order: 11, custom_title: 'Parcelles' },
      { tab_key: 'rdc-map', item_key: 'detail-titles', item_type: 'kpi', is_visible: true, display_order: 12, custom_title: 'Titres dem.' },
      { tab_key: 'rdc-map', item_key: 'detail-contributions', item_type: 'kpi', is_visible: true, display_order: 13, custom_title: 'Contributions' },
      { tab_key: 'rdc-map', item_key: 'detail-mutations', item_type: 'kpi', is_visible: true, display_order: 14, custom_title: 'Mutations' },
      { tab_key: 'rdc-map', item_key: 'detail-disputes', item_type: 'kpi', is_visible: true, display_order: 15, custom_title: 'Litiges' },
      { tab_key: 'rdc-map', item_key: 'detail-certificates', item_type: 'kpi', is_visible: true, display_order: 16, custom_title: 'Certificats' },
      { tab_key: 'rdc-map', item_key: 'detail-expertises', item_type: 'kpi', is_visible: true, display_order: 17, custom_title: 'Expertises' },
      { tab_key: 'rdc-map', item_key: 'detail-invoices', item_type: 'kpi', is_visible: true, display_order: 18, custom_title: 'Factures' },
      { tab_key: 'rdc-map', item_key: 'detail-revenue', item_type: 'kpi', is_visible: true, display_order: 19, custom_title: 'Revenus' },
      { tab_key: 'rdc-map', item_key: 'detail-fiscal', item_type: 'kpi', is_visible: true, display_order: 20, custom_title: 'Rec. fiscales' },
      { tab_key: 'rdc-map', item_key: 'detail-density', item_type: 'kpi', is_visible: true, display_order: 21, custom_title: 'Densité' },
      { tab_key: 'rdc-map', item_key: 'detail-surface', item_type: 'kpi', is_visible: true, display_order: 22, custom_title: 'Surface (ha)' },
      { tab_key: 'rdc-map', item_key: 'detail-resolution', item_type: 'kpi', is_visible: true, display_order: 23, custom_title: 'Résol. litiges' },
    ],
  },
};

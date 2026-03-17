import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

export interface ChartConfigItem {
  id?: string;
  tab_key: string;
  item_key: string;
  item_type: 'chart' | 'kpi';
  is_visible: boolean;
  display_order: number;
  custom_title?: string | null;
  custom_color?: string | null;
  chart_type?: 'bar-h' | 'bar-v' | 'pie' | 'donut' | 'area' | null;
  custom_icon?: string | null;
  col_span?: number;
}

const QUERY_KEY = ['analytics-charts-config'];

async function fetchConfig(): Promise<ChartConfigItem[]> {
  const { data, error } = await supabase
    .from('analytics_charts_config' as any)
    .select('*')
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data as any[]) || [];
}

export function useAnalyticsChartsConfig() {
  const { data: configs = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchConfig,
    staleTime: 5 * 60 * 1000,
  });

  return { configs, isLoading };
}

/** Returns a lookup for a specific tab — merges defaults with DB overrides */
export function useTabChartsConfig(tabKey: string, defaults: ChartConfigItem[]) {
  const { configs, isLoading } = useAnalyticsChartsConfig();

  const merged = useMemo(() => {
    const dbMap = new Map<string, ChartConfigItem>();
    configs.filter(c => c.tab_key === tabKey).forEach(c => dbMap.set(c.item_key, c));

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

/** Admin mutation helpers */
export function useAnalyticsChartsConfigMutations() {
  const queryClient = useQueryClient();

  const upsertConfig = useMutation({
    mutationFn: async (items: ChartConfigItem[]) => {
      const toUpsert = items.map(({ id, ...rest }) => rest);
      const { error } = await supabase
        .from('analytics_charts_config' as any)
        .upsert(toUpsert as any, { onConflict: 'tab_key,item_key' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const deleteConfig = useMutation({
    mutationFn: async ({ tab_key, item_key }: { tab_key: string; item_key: string }) => {
      const { error } = await supabase
        .from('analytics_charts_config' as any)
        .delete()
        .eq('tab_key', tab_key)
        .eq('item_key', item_key);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return { upsertConfig, deleteConfig };
}

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
      { tab_key: 'title-requests', item_key: 'circonscription', item_type: 'chart', is_visible: true, display_order: 11, custom_title: 'Circonscription', chart_type: 'bar-h' },
      { tab_key: 'title-requests', item_key: 'construction-type', item_type: 'chart', is_visible: true, display_order: 12, custom_title: 'Type construction', chart_type: 'bar-h' },
      { tab_key: 'title-requests', item_key: 'construction-nature', item_type: 'chart', is_visible: true, display_order: 13, custom_title: 'Nature construction', chart_type: 'bar-h' },
      { tab_key: 'title-requests', item_key: 'revenue-trend', item_type: 'chart', is_visible: true, display_order: 14, custom_title: 'Revenus/mois', chart_type: 'area' },
      { tab_key: 'title-requests', item_key: 'processing-comparison', item_type: 'chart', is_visible: true, display_order: 15, custom_title: 'Délai estimé vs réel', chart_type: 'bar-v' },
      { tab_key: 'title-requests', item_key: 'geo', item_type: 'chart', is_visible: true, display_order: 16, custom_title: 'Géographie' },
      { tab_key: 'title-requests', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 17, custom_title: 'Évolution', chart_type: 'area', col_span: 2 },
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
    label: 'Parcelles titrées',
    charts: [
      { tab_key: 'parcels-titled', item_key: 'title-type', item_type: 'chart', is_visible: true, display_order: 0, custom_title: 'Type titre', chart_type: 'bar-h' },
      { tab_key: 'parcels-titled', item_key: 'legal-status', item_type: 'chart', is_visible: true, display_order: 1, custom_title: 'Propriétaires', chart_type: 'donut' },
      { tab_key: 'parcels-titled', item_key: 'gender', item_type: 'chart', is_visible: true, display_order: 2, custom_title: 'Genre propriétaires', chart_type: 'pie' },
      { tab_key: 'parcels-titled', item_key: 'construction-type', item_type: 'chart', is_visible: true, display_order: 3, custom_title: 'Construction', chart_type: 'bar-h' },
      { tab_key: 'parcels-titled', item_key: 'construction-nature', item_type: 'chart', is_visible: true, display_order: 4, custom_title: 'Nature construction', chart_type: 'bar-h' },
      { tab_key: 'parcels-titled', item_key: 'construction-decade', item_type: 'chart', is_visible: true, display_order: 5, custom_title: 'Année construction', chart_type: 'bar-v' },
      { tab_key: 'parcels-titled', item_key: 'permits', item_type: 'chart', is_visible: true, display_order: 6, custom_title: 'Autorisation bâtir', chart_type: 'pie' },
      { tab_key: 'parcels-titled', item_key: 'permit-admin', item_type: 'chart', is_visible: true, display_order: 7, custom_title: 'Statut autoris.', chart_type: 'bar-v' },
      { tab_key: 'parcels-titled', item_key: 'permit-validity', item_type: 'chart', is_visible: true, display_order: 8, custom_title: 'Validité autoris.', chart_type: 'pie' },
      { tab_key: 'parcels-titled', item_key: 'permit-service', item_type: 'chart', is_visible: true, display_order: 9, custom_title: 'Service émetteur', chart_type: 'bar-h' },
      { tab_key: 'parcels-titled', item_key: 'usage', item_type: 'chart', is_visible: true, display_order: 10, custom_title: 'Usage déclaré', chart_type: 'bar-h' },
      { tab_key: 'parcels-titled', item_key: 'lease-type', item_type: 'chart', is_visible: true, display_order: 11, custom_title: 'Type bail', chart_type: 'donut' },
      { tab_key: 'parcels-titled', item_key: 'circonscription', item_type: 'chart', is_visible: true, display_order: 12, custom_title: 'Circonscription', chart_type: 'bar-h' },
      { tab_key: 'parcels-titled', item_key: 'surface', item_type: 'chart', is_visible: true, display_order: 13, custom_title: 'Superficie', chart_type: 'bar-v' },
      { tab_key: 'parcels-titled', item_key: 'geo', item_type: 'chart', is_visible: true, display_order: 16, custom_title: 'Géographie' },
      { tab_key: 'parcels-titled', item_key: 'taxes', item_type: 'chart', is_visible: true, display_order: 14, custom_title: 'Taxes', chart_type: 'donut' },
      { tab_key: 'parcels-titled', item_key: 'taxes-year', item_type: 'chart', is_visible: true, display_order: 15, custom_title: 'Taxes/année' },
      { tab_key: 'parcels-titled', item_key: 'taxes-amount', item_type: 'chart', is_visible: true, display_order: 16, custom_title: 'Montants taxes/an', chart_type: 'area' },
      { tab_key: 'parcels-titled', item_key: 'mortgages', item_type: 'chart', is_visible: true, display_order: 17, custom_title: 'Hypothèques', chart_type: 'pie' },
      { tab_key: 'parcels-titled', item_key: 'creditors', item_type: 'chart', is_visible: true, display_order: 18, custom_title: 'Créanciers', chart_type: 'bar-h' },
      { tab_key: 'parcels-titled', item_key: 'mortgage-status', item_type: 'chart', is_visible: true, display_order: 19, custom_title: 'Statut hyp.', chart_type: 'donut' },
      { tab_key: 'parcels-titled', item_key: 'mortgage-trend', item_type: 'chart', is_visible: true, display_order: 20, custom_title: 'Contrats hyp./an', chart_type: 'area' },
      { tab_key: 'parcels-titled', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 21, custom_title: 'Évolution', chart_type: 'area', col_span: 2 },
    ],
    kpis: [
      { tab_key: 'parcels-titled', item_key: 'kpi-parcels', item_type: 'kpi', is_visible: true, display_order: 0, custom_title: 'Parcelles' },
      { tab_key: 'parcels-titled', item_key: 'kpi-urban', item_type: 'kpi', is_visible: true, display_order: 1, custom_title: 'Urbaines' },
      { tab_key: 'parcels-titled', item_key: 'kpi-rural', item_type: 'kpi', is_visible: true, display_order: 2, custom_title: 'Rurales' },
      { tab_key: 'parcels-titled', item_key: 'kpi-surface', item_type: 'kpi', is_visible: true, display_order: 3, custom_title: 'Surface tot.' },
      { tab_key: 'parcels-titled', item_key: 'kpi-taxes', item_type: 'kpi', is_visible: true, display_order: 4, custom_title: 'Taxes payées' },
      { tab_key: 'parcels-titled', item_key: 'kpi-mortgages', item_type: 'kpi', is_visible: true, display_order: 5, custom_title: 'Hypothèques' },
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
      { tab_key: 'expertise', item_key: 'road-access', item_type: 'chart', is_visible: true, display_order: 7, custom_title: 'Accès routier', chart_type: 'pie' },
      { tab_key: 'expertise', item_key: 'proximity', item_type: 'chart', is_visible: true, display_order: 8, custom_title: 'Proximité moy.', chart_type: 'bar-h' },
      { tab_key: 'expertise', item_key: 'risk-zones', item_type: 'chart', is_visible: true, display_order: 9, custom_title: 'Zones à risque', chart_type: 'pie' },
      { tab_key: 'expertise', item_key: 'market-value', item_type: 'chart', is_visible: true, display_order: 10, custom_title: 'Valeur marchande', chart_type: 'bar-v' },
      { tab_key: 'expertise', item_key: 'floors', item_type: 'chart', is_visible: true, display_order: 11, custom_title: 'Nbre d\'étages', chart_type: 'bar-v' },
      { tab_key: 'expertise', item_key: 'garden', item_type: 'chart', is_visible: true, display_order: 12, custom_title: 'Surface jardin', chart_type: 'bar-v' },
      { tab_key: 'expertise', item_key: 'geo', item_type: 'chart', is_visible: true, display_order: 13, custom_title: 'Géographie' },
      { tab_key: 'expertise', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 14, custom_title: 'Évolution', chart_type: 'area', col_span: 2 },
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
      { tab_key: 'mutations', item_key: 'revenue-trend', item_type: 'chart', is_visible: true, display_order: 5, custom_title: 'Revenus/mois', chart_type: 'area' },
      { tab_key: 'mutations', item_key: 'geo', item_type: 'chart', is_visible: true, display_order: 6, custom_title: 'Géographie' },
      { tab_key: 'mutations', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 7, custom_title: 'Évolution', chart_type: 'area', col_span: 2 },
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
    label: 'Litiges',
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
      { tab_key: 'disputes', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 9, custom_title: 'Évolution', chart_type: 'area', col_span: 2 },
    ],
    kpis: [
      { tab_key: 'disputes', item_key: 'kpi-total', item_type: 'kpi', is_visible: true, display_order: 0, custom_title: 'Total' },
      { tab_key: 'disputes', item_key: 'kpi-en-cours', item_type: 'kpi', is_visible: true, display_order: 1, custom_title: 'En cours' },
      { tab_key: 'disputes', item_key: 'kpi-resolus', item_type: 'kpi', is_visible: true, display_order: 2, custom_title: 'Résolus' },
      { tab_key: 'disputes', item_key: 'kpi-rate', item_type: 'kpi', is_visible: true, display_order: 3, custom_title: 'Taux résolution' },
      { tab_key: 'disputes', item_key: 'kpi-duration', item_type: 'kpi', is_visible: true, display_order: 4, custom_title: 'Durée moy.' },
    ],
  },
  'lifting': {
    label: 'Levée litige',
    charts: [
      { tab_key: 'lifting', item_key: 'lifting-status', item_type: 'chart', is_visible: true, display_order: 0, custom_title: 'Statut levée', chart_type: 'pie' },
      { tab_key: 'lifting', item_key: 'resolution-level', item_type: 'chart', is_visible: true, display_order: 1, custom_title: 'Niveau résolution', chart_type: 'bar-h' },
      { tab_key: 'lifting', item_key: 'nature', item_type: 'chart', is_visible: true, display_order: 2, custom_title: 'Nature litige', chart_type: 'bar-h' },
      { tab_key: 'lifting', item_key: 'reason', item_type: 'chart', is_visible: true, display_order: 3, custom_title: 'Motif de levée', chart_type: 'bar-h' },
      { tab_key: 'lifting', item_key: 'geo', item_type: 'chart', is_visible: true, display_order: 4, custom_title: 'Géographie' },
      { tab_key: 'lifting', item_key: 'success-rate', item_type: 'chart', is_visible: true, display_order: 5, custom_title: 'Taux réussite %', chart_type: 'area', col_span: 2 },
      { tab_key: 'lifting', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 6, custom_title: 'Évolution', chart_type: 'area', col_span: 2 },
    ],
    kpis: [
      { tab_key: 'lifting', item_key: 'kpi-total', item_type: 'kpi', is_visible: true, display_order: 0, custom_title: 'Total levées' },
      { tab_key: 'lifting', item_key: 'kpi-approved', item_type: 'kpi', is_visible: true, display_order: 1, custom_title: 'Approuvées' },
      { tab_key: 'lifting', item_key: 'kpi-pending', item_type: 'kpi', is_visible: true, display_order: 2, custom_title: 'En attente' },
      { tab_key: 'lifting', item_key: 'kpi-rejected', item_type: 'kpi', is_visible: true, display_order: 3, custom_title: 'Rejetées' },
      { tab_key: 'lifting', item_key: 'kpi-success', item_type: 'kpi', is_visible: true, display_order: 4, custom_title: 'Taux réussite' },
    ],
  },
  'boundary': {
    label: 'Conflits limites',
    charts: [
      { tab_key: 'boundary', item_key: 'conflict-type', item_type: 'chart', is_visible: true, display_order: 0, custom_title: 'Type conflit', chart_type: 'bar-h' },
      { tab_key: 'boundary', item_key: 'status', item_type: 'chart', is_visible: true, display_order: 1, custom_title: 'Statut', chart_type: 'pie' },
      { tab_key: 'boundary', item_key: 'type-status-cross', item_type: 'chart', is_visible: true, display_order: 2, custom_title: 'Type × Statut' },
      { tab_key: 'boundary', item_key: 'resolution-rate', item_type: 'chart', is_visible: true, display_order: 3, custom_title: 'Taux résolution %', chart_type: 'area' },
      { tab_key: 'boundary', item_key: 'geo', item_type: 'chart', is_visible: true, display_order: 4, custom_title: 'Géographie' },
      { tab_key: 'boundary', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 5, custom_title: 'Évolution', chart_type: 'area', col_span: 2 },
    ],
    kpis: [
      { tab_key: 'boundary', item_key: 'kpi-total', item_type: 'kpi', is_visible: true, display_order: 0, custom_title: 'Total' },
      { tab_key: 'boundary', item_key: 'kpi-resolved', item_type: 'kpi', is_visible: true, display_order: 1, custom_title: 'Résolus' },
      { tab_key: 'boundary', item_key: 'kpi-pending', item_type: 'kpi', is_visible: true, display_order: 2, custom_title: 'En cours' },
      { tab_key: 'boundary', item_key: 'kpi-rate', item_type: 'kpi', is_visible: true, display_order: 3, custom_title: 'Taux résolution' },
      { tab_key: 'boundary', item_key: 'kpi-delay', item_type: 'kpi', is_visible: true, display_order: 4, custom_title: 'Délai moy.' },
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
      { tab_key: 'certificates', item_key: 'geo', item_type: 'chart', is_visible: true, display_order: 2, custom_title: 'Géographie' },
      { tab_key: 'certificates', item_key: 'evolution', item_type: 'chart', is_visible: true, display_order: 3, custom_title: 'Évolution', chart_type: 'area', col_span: 2 },
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
  'rdc-map': {
    label: 'Carte RDC',
    charts: [],
    kpis: [
      // Tooltip KPIs
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
      // Detail panel KPIs
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

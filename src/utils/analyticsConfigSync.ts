import { supabase } from '@/integrations/supabase/client';
import { ANALYTICS_TABS_REGISTRY } from '@/config/analyticsTabsRegistry';
import { buildFilterDefaults, ChartConfigItem } from '@/hooks/useAnalyticsChartsConfig';
import { CROSS_VARIABLE_REGISTRY } from '@/config/crossVariables';

/**
 * Returns DB rows whose tab_key is NOT in the code registry,
 * OR whose item_key (for non-tab/non-filter items) is not in the registry's items.
 */
export interface OrphanReport {
  orphanTabs: string[];               // tab_keys absent from registry
  orphanItems: { tab_key: string; item_key: string; item_type: string }[];
  missingTabs: string[];              // registry tabs absent from DB
  missingItems: { tab_key: string; item_key: string; item_type: 'kpi' | 'chart' }[];
}

export async function detectOrphansAndMissing(): Promise<OrphanReport> {
  const { data, error } = await supabase
    .from('analytics_charts_config')
    .select('tab_key,item_key,item_type');
  if (error) throw error;

  const rows = (data || []) as { tab_key: string; item_key: string; item_type: string }[];
  const registryTabs = new Set(Object.keys(ANALYTICS_TABS_REGISTRY));

  const orphanTabs: string[] = [];
  const orphanItems: OrphanReport['orphanItems'] = [];

  // Group rows per tab
  const dbTabKeys = new Set(rows.map(r => r.tab_key));
  dbTabKeys.forEach(tk => {
    if (!registryTabs.has(tk)) orphanTabs.push(tk);
  });

  rows.forEach(r => {
    if (!registryTabs.has(r.tab_key)) return; // counted as orphan tab
    const reg = ANALYTICS_TABS_REGISTRY[r.tab_key];
    if (!reg) return;
    if (r.item_type === 'tab' && r.item_key === '__tab__') return;
    if (r.item_type === 'filter') {
      const allowed = new Set(buildFilterDefaults(r.tab_key).map(f => f.item_key));
      if (!allowed.has(r.item_key)) orphanItems.push(r);
      return;
    }
    if (r.item_type === 'cross') {
      const chartKey = r.item_key.replace(/^cross-/, '');
      const ok = CROSS_VARIABLE_REGISTRY[r.tab_key]?.[chartKey];
      if (!ok) orphanItems.push(r);
      return;
    }
    if (r.item_type === 'kpi' || r.item_type === 'chart') {
      const allKeys = new Set([
        ...reg.kpis.map(k => k.item_key),
        ...reg.charts.map(c => c.item_key),
      ]);
      if (!allKeys.has(r.item_key)) orphanItems.push(r);
    }
  });

  // Missing
  const missingTabs: string[] = [];
  const missingItems: OrphanReport['missingItems'] = [];
  Object.entries(ANALYTICS_TABS_REGISTRY).forEach(([tk, reg]) => {
    const tabRow = rows.find(r => r.tab_key === tk && r.item_key === '__tab__');
    if (!tabRow) missingTabs.push(tk);
    const dbKeysInTab = new Set(rows.filter(r => r.tab_key === tk).map(r => r.item_key));
    reg.kpis.forEach(k => {
      if (!dbKeysInTab.has(k.item_key)) missingItems.push({ tab_key: tk, item_key: k.item_key, item_type: 'kpi' });
    });
    reg.charts.forEach(c => {
      if (!dbKeysInTab.has(c.item_key)) missingItems.push({ tab_key: tk, item_key: c.item_key, item_type: 'chart' });
    });
  });

  return { orphanTabs, orphanItems, missingTabs, missingItems };
}

/** Delete all orphan rows (tabs + items). Returns count deleted. */
export async function purgeOrphans(report: OrphanReport): Promise<number> {
  let count = 0;
  if (report.orphanTabs.length > 0) {
    const { error, count: c } = await supabase
      .from('analytics_charts_config')
      .delete({ count: 'exact' })
      .in('tab_key', report.orphanTabs);
    if (error) throw error;
    count += c || 0;
  }
  for (const it of report.orphanItems) {
    const { error } = await supabase
      .from('analytics_charts_config')
      .delete()
      .eq('tab_key', it.tab_key)
      .eq('item_key', it.item_key);
    if (error) throw error;
    count += 1;
  }
  return count;
}

/** Insert all missing tabs + items with registry defaults. Returns count inserted. */
export async function syncRegistryToDb(report: OrphanReport): Promise<number> {
  const toInsert: Partial<ChartConfigItem>[] = [];
  const tabKeys = Object.keys(ANALYTICS_TABS_REGISTRY);

  report.missingTabs.forEach(tk => {
    const idx = tabKeys.indexOf(tk);
    toInsert.push({
      tab_key: tk, item_key: '__tab__', item_type: 'tab',
      is_visible: true, display_order: idx >= 0 ? idx : 0,
    });
  });
  report.missingItems.forEach(it => {
    const reg = ANALYTICS_TABS_REGISTRY[it.tab_key];
    const def = [...(reg?.kpis || []), ...(reg?.charts || [])].find(d => d.item_key === it.item_key);
    if (def) {
      toInsert.push({
        tab_key: def.tab_key,
        item_key: def.item_key,
        item_type: def.item_type,
        is_visible: def.is_visible,
        display_order: def.display_order,
        custom_title: def.custom_title || null,
        chart_type: def.chart_type || null,
        col_span: def.col_span ?? 1,
      });
    }
  });

  if (toInsert.length === 0) return 0;
  const { error } = await supabase
    .from('analytics_charts_config')
    .upsert(toInsert as any, { onConflict: 'tab_key,item_key' });
  if (error) throw error;
  return toInsert.length;
}

/** Append a row to analytics_config_audit. Best-effort (never throws). */
export async function logConfigAudit(params: {
  action: string;
  tab_key?: string | null;
  item_count?: number;
  diff?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('analytics_config_audit').insert({
      admin_id: user.id,
      admin_name: user.email || null,
      action: params.action,
      tab_key: params.tab_key || null,
      item_count: params.item_count ?? 0,
      diff: (params.diff || null) as any,
    });
  } catch (e) {
    console.error('[analytics audit] failed', e);
  }
}

/** Validate a Lucide icon name exists. Lazy import to avoid bundle bloat. */
let _lucideKeys: Set<string> | null = null;
export async function isValidLucideIcon(name: string): Promise<boolean> {
  if (!name) return true;
  if (!_lucideKeys) {
    const lucide = await import('lucide-react');
    _lucideKeys = new Set(Object.keys(lucide).filter(k => /^[A-Z]/.test(k)));
  }
  return _lucideKeys.has(name);
}

import { useCallback, useMemo } from 'react';
import { ANALYTICS_TABS_REGISTRY } from '@/config/analyticsTabsRegistry';
import { useAnalyticsChartsConfig, useAnalyticsTabsConfig } from '@/hooks/useAnalyticsChartsConfig';
import { accessKey } from '@/hooks/useAnalyticsAccess';

/** Libellés configurés (titres admin) des onglets et visuels Données foncières. */
export function useVisualLabels() {
  const { tabs } = useAnalyticsTabsConfig();
  const { configs } = useAnalyticsChartsConfig();
  const titles = useMemo(() => {
    const m = new Map<string, string>();
    Object.entries(ANALYTICS_TABS_REGISTRY).forEach(([tab, reg]: [string, any]) => {
      [...(reg?.kpis ?? []), ...(reg?.charts ?? [])].forEach((it: any) => m.set(accessKey(tab, it.item_key), it.custom_title || it.item_key));
    });
    configs.forEach(c => { if (c.custom_title) m.set(accessKey(c.tab_key, c.item_key), c.custom_title); });
    return m;
  }, [configs]);
  const tabLabel = useCallback((k: string) => tabs.find(t => t.key === k)?.label ?? k, [tabs]);
  const visualTitle = useCallback((t: string, i: string) => titles.get(accessKey(t, i)) ?? i, [titles]);
  return { tabLabel, visualTitle };
}

export const DAY_MS = 86_400_000;
export const daysLeft = (iso: string, now = Date.now()) => Math.ceil((new Date(iso).getTime() - now) / DAY_MS);
export type AccessState = 'active' | 'expiring' | 'expired';
export const accessState = (iso: string, now = Date.now()): AccessState => {
  const d = daysLeft(iso, now);
  return d <= 0 ? 'expired' : d <= 7 ? 'expiring' : 'active';
};

import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PeriodType } from './usePeriodFilter';

const VALID_PERIODS: PeriodType[] = ['today', '7days', '30days', 'month', 'quarter', 'year', 'custom'];
const VALID_TABS = ['overview', 'business', 'comparative', 'cohort', 'reports'];

export const useDashboardUrlState = (
  periodType: PeriodType,
  setPeriodType: (p: PeriodType) => void,
  innerTab: string,
  setInnerTab: (t: string) => void
) => {
  const [params, setParams] = useSearchParams();

  // Read URL on mount
  useEffect(() => {
    const p = params.get('period') as PeriodType | null;
    const t = params.get('view');
    if (p && VALID_PERIODS.includes(p) && p !== periodType) setPeriodType(p);
    if (t && VALID_TABS.includes(t) && t !== innerTab) setInnerTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync state → URL
  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set('period', periodType);
    next.set('view', innerTab);
    if (next.toString() !== params.toString()) {
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodType, innerTab]);

  const updateUrl = useCallback((updates: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([k, v]) => next.set(k, v));
    setParams(next, { replace: true });
  }, [params, setParams]);

  return { updateUrl };
};

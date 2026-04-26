import React, { memo, useCallback, useContext, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { LucideIcon } from 'lucide-react';
import { ChartHeaderActions } from './ChartHeaderActions';
import { CHART_HEIGHT as BASE_CH } from '@/utils/analyticsConstants';
import { CHART_COLORS } from '@/utils/analyticsHelpers';
import { ChartInsight } from '@/utils/chartInsights';
import {
  ChartLogoIcon, ChartFilterSubtitle, ChartFooter, LogoWatermark, InsightText,
  FilterLabelContext, useChartImageBlob,
  tooltipStyle, gridStroke, colSpanClass,
} from './chartCardShared';

interface MultiAreaSeries { key: string; label: string; data: { name: string; value: number }[] }
interface MultiAreaChartCardProps {
  title: string;
  icon?: LucideIcon;
  iconColor?: string;
  colSpan?: number;
  series: MultiAreaSeries[];
  insight?: string | ChartInsight;
  /** Records bruts (avec champ `province`) pour la projection sur la carte RDC */
  rawRecords?: any[];
  /** Identifiant stable du visuel (clé registre) */
  projectionKey?: string;
  /** Onglet analytics propriétaire */
  projectionTab?: string;
  /** Source SQL principale */
  projectionSource?: string;
}

export const MultiAreaChartCard: React.FC<MultiAreaChartCardProps> = memo(({
  title, colSpan, series, insight,
  rawRecords, projectionKey, projectionTab, projectionSource,
}) => {
  const { ref, getBlob } = useChartImageBlob();
  const filterLabel = useContext(FilterLabelContext);
  const [focused, setFocused] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set(['all']));

  const toggle = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (key === 'all') {
        if (next.has('all')) { next.delete('all'); } else { return new Set(['all']); }
        return next;
      }
      next.delete('all');
      if (next.has(key)) next.delete(key); else next.add(key);
      if (next.size === 0) next.add('all');
      return next;
    });
  }, []);

  const visibleSeries = useMemo(() => {
    if (selectedKeys.has('all')) return series.filter((s) => s.key === 'all');
    return series.filter((s) => selectedKeys.has(s.key));
  }, [selectedKeys, series]);

  const mergedData = useMemo(() => {
    const allSeries = series.find((s) => s.key === 'all');
    const canonicalOrder = allSeries?.data.map((d) => d.name) || [];
    const allMonths = new Set<string>(canonicalOrder);
    visibleSeries.forEach((s) => s.data.forEach((pt) => allMonths.add(pt.name)));
    const sorted = canonicalOrder.concat(
      Array.from(allMonths).filter((m) => !canonicalOrder.includes(m)),
    );
    return sorted.map((month) => {
      const row: Record<string, any> = { name: month };
      visibleSeries.forEach((s, idx) => {
        const pt = s.data.find((d) => d.name === month);
        row[`v${idx}`] = pt?.value ?? 0;
      });
      return row;
    });
  }, [visibleSeries, series]);

  const allData = series.find((s) => s.key === 'all')?.data || [];
  if (allData.length === 0) return null;

  return (
    <Card
      ref={ref}
      onClick={() => setFocused((f) => !f)}
      className={`analytics-card border-0 cursor-pointer ${focused ? 'is-focused z-10' : ''} ${colSpan ? colSpanClass[colSpan] || '' : ''}`}
    >
      <CardHeader className="pb-1 px-2 pt-2">
        <div className="flex items-start gap-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <CardTitle className="text-xs font-semibold leading-tight break-words">{title}</CardTitle>
              <ChartLogoIcon />
            </div>
            {filterLabel && <ChartFilterSubtitle filterLabel={filterLabel} />}
          </div>
          <ChartHeaderActions
            title={title}
            getBlob={getBlob}
            rawRecords={rawRecords}
            projectionKey={projectionKey}
            projectionTab={projectionTab}
            projectionSource={projectionSource}
          />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5" onClick={(e) => e.stopPropagation()}>
          {series.map((s, i) => {
            const color = s.key === 'all' ? CHART_COLORS[0] : CHART_COLORS[i % CHART_COLORS.length];
            return (
              <label key={s.key} className="flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedKeys.has(s.key)}
                  onChange={() => toggle(s.key)}
                  className="h-3 w-3 rounded border-border accent-primary"
                />
                <span className="text-[9px] font-medium" style={{ color }}>{s.label}</span>
              </label>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2 relative">
        <LogoWatermark />
        <ResponsiveContainer width="100%" height={BASE_CH}>
          <AreaChart data={mergedData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="name" tick={{ fontSize: 8 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={tooltipStyle} />
            {visibleSeries.map((s, idx) => {
              const color = s.key === 'all' ? CHART_COLORS[0] : CHART_COLORS[series.findIndex((x) => x.key === s.key) % CHART_COLORS.length];
              return (
                <Area key={s.key} type="monotone" dataKey={`v${idx}`} name={s.label} stroke={color} fill={color} fillOpacity={0.12} />
              );
            })}
            {visibleSeries.length > 1 && <Legend wrapperStyle={{ fontSize: 9 }} />}
          </AreaChart>
        </ResponsiveContainer>
        <InsightText text={insight} />
        <ChartFooter />
      </CardContent>
    </Card>
  );
});

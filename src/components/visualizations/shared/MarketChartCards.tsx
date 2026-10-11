/**
 * Cartes complémentaires au format Analytics : nuage de points, barres groupées
 * avec courbe optionnelle (graphique combiné) et tableau de classement.
 * Même en-tête, filigrane, insight et partage que ChartCard.
 */
import React, { memo, useContext, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer, ScatterChart, Scatter, ComposedChart, Bar, Line, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { CHART_HEIGHT, NoData } from '@/utils/analyticsConstants';
import { CHART_COLORS } from '@/utils/analyticsHelpers';
import { ChartInsight } from '@/utils/chartInsights';
import { ChartHeaderActions } from './ChartHeaderActions';
import {
  ChartLogoIcon, ChartFilterSubtitle, ChartFooter, LogoWatermark, InsightText,
  FilterLabelContext, useChartImageBlob, tooltipStyle, gridStroke, colSpanClass,
} from './chartCardShared';

interface ShellProps {
  title: string; colSpan?: number; hidden?: boolean; empty: boolean;
  insight?: string | ChartInsight; children: React.ReactNode;
}

const Shell: React.FC<ShellProps> = ({ title, colSpan, hidden, empty, insight, children }) => {
  const { ref, getBlob } = useChartImageBlob();
  const filterLabel = useContext(FilterLabelContext);
  const [focused, setFocused] = useState(false);
  if (hidden) return null;
  return (
    <Card ref={ref} onClick={() => setFocused(f => !f)}
      className={`analytics-card border-0 cursor-pointer ${focused ? 'is-focused z-10' : ''} ${colSpan ? colSpanClass[colSpan] || '' : ''}`}>
      <CardHeader className="pb-1 px-2 pt-2">
        <div className="flex items-start gap-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <CardTitle className="text-xs font-semibold leading-tight break-words">{title}</CardTitle>
              <ChartLogoIcon />
            </div>
            {filterLabel && <ChartFilterSubtitle filterLabel={filterLabel} />}
          </div>
          <ChartHeaderActions title={title} getBlob={getBlob} />
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2 relative">
        <LogoWatermark />
        {empty ? <NoData /> : (<>{children}<InsightText text={insight} /><ChartFooter /></>)}
      </CardContent>
    </Card>
  );
};

const fmt = (n: number) => n.toLocaleString('fr-FR');

export const ScatterCard: React.FC<{
  title: string; data: { x: number; y: number; z?: number; name: string }[];
  xLabel: string; yLabel: string; zLabel?: string; colorIndex?: number; hidden?: boolean;
  insight?: string | ChartInsight; colSpan?: number;
}> = memo(({ title, data, xLabel, yLabel, zLabel, colorIndex = 0, hidden, insight, colSpan }) => (
  <Shell title={title} hidden={hidden} empty={data.length === 0} insight={insight} colSpan={colSpan}>
    <ResponsiveContainer width="100%" height={CHART_HEIGHT + 20}>
      <ScatterChart margin={{ left: 0, right: 8, top: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis type="number" dataKey="x" name={xLabel} tick={{ fontSize: 9 }} tickFormatter={fmt} />
        <YAxis type="number" dataKey="y" name={yLabel} tick={{ fontSize: 9 }} tickFormatter={fmt} width={48} />
        {zLabel && <ZAxis type="number" dataKey="z" name={zLabel} range={[20, 260]} />}
        <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} formatter={(v: number) => fmt(v)} />
        <Scatter data={data} fill={CHART_COLORS[colorIndex % CHART_COLORS.length]} fillOpacity={0.7} />
      </ScatterChart>
    </ResponsiveContainer>
    <p className="text-[8px] text-muted-foreground text-center">{xLabel} → · ↑ {yLabel}{zLabel ? ` · taille = ${zLabel}` : ''}</p>
  </Shell>
));

export const ComboBarCard: React.FC<{
  title: string; data: any[];
  bars: { dataKey: string; name: string; colorIndex: number }[];
  line?: { dataKey: string; name: string; colorIndex: number };
  hidden?: boolean; insight?: string | ChartInsight; colSpan?: number;
}> = memo(({ title, data, bars, line, hidden, insight, colSpan }) => (
  <Shell title={title} hidden={hidden} empty={data.length === 0} insight={insight} colSpan={colSpan}>
    <ResponsiveContainer width="100%" height={CHART_HEIGHT + 20}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-20} textAnchor="end" height={42} />
        <YAxis yAxisId="l" tick={{ fontSize: 9 }} tickFormatter={fmt} width={48} />
        {(line || bars.length > 1) && <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 9 }} tickFormatter={fmt} width={40} />}
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} />
        <Legend wrapperStyle={{ fontSize: 9 }} />
        {bars.map((b, i) => (
          <Bar key={b.dataKey} yAxisId={i === 0 || line ? 'l' : 'r'} dataKey={b.dataKey} name={b.name}
            fill={CHART_COLORS[b.colorIndex % CHART_COLORS.length]} radius={[3, 3, 0, 0]} />
        ))}
        {line && <Line yAxisId="r" type="monotone" dataKey={line.dataKey} name={line.name}
          stroke={CHART_COLORS[line.colorIndex % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 2 }} />}
      </ComposedChart>
    </ResponsiveContainer>
  </Shell>
));

export const RankingTableCard: React.FC<{
  title: string; rows: Record<string, string | number>[];
  columns: { key: string; label: string; align?: 'right'; format?: (v: any) => string }[];
  hidden?: boolean; insight?: string | ChartInsight; colSpan?: number;
}> = memo(({ title, rows, columns, hidden, insight, colSpan }) => (
  <Shell title={title} hidden={hidden} empty={rows.length === 0} insight={insight} colSpan={colSpan}>
    <div className="overflow-x-auto">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="py-1 pr-1 text-left font-medium">#</th>
            {columns.map(c => <th key={c.key} className={`py-1 px-1 font-medium ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="py-1 pr-1 text-muted-foreground">{i + 1}</td>
              {columns.map(c => (
                <td key={c.key} className={`py-1 px-1 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                  {c.format ? c.format(r[c.key]) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Shell>
));

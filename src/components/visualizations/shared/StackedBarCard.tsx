import React, { memo, useContext, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { LucideIcon } from 'lucide-react';
import { ChartHeaderActions } from './ChartHeaderActions';
import { CHART_HEIGHT as BASE_CH, NoData } from '@/utils/analyticsConstants';
import { ChartInsight } from '@/utils/chartInsights';
import {
  ChartLogoIcon, ChartFilterSubtitle, ChartFooter, LogoWatermark, InsightText,
  FilterLabelContext, useChartImageBlob,
  tooltipStyle, gridStroke, colSpanClass,
} from './chartCardShared';

interface StackedBarCardProps {
  title: string;
  icon?: LucideIcon;
  iconColor?: string;
  colSpan?: number;
  data: any[];
  bars: { dataKey: string; name: string; color: string }[];
  layout?: 'horizontal' | 'vertical';
  labelWidth?: number;
  maxItems?: number;
  hidden?: boolean;
  insight?: string | ChartInsight;
  /** Records bruts (avec champ `province`) pour la projection sur la carte RDC */
  rawRecords?: any[];
  /** Identifiant stable du visuel (ex: clé du registre) */
  projectionKey?: string;
  /** Onglet analytics propriétaire */
  projectionTab?: string;
  /** Source SQL principale (affichée dans le popover info) */
  projectionSource?: string;
}

export const StackedBarCard: React.FC<StackedBarCardProps> = memo(({
  title, colSpan, data, bars, layout = 'horizontal', labelWidth = 90, maxItems = 8, hidden = false, insight,
  rawRecords, projectionKey, projectionTab, projectionSource,
}) => {
  const { ref, getBlob } = useChartImageBlob();
  const filterLabel = useContext(FilterLabelContext);
  const [focused, setFocused] = useState(false);
  if (hidden) return null;

  const displayData = data.slice(0, maxItems);

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
      </CardHeader>
      <CardContent className="px-2 pb-2 relative">
        <LogoWatermark />
        {displayData.length === 0 ? <NoData /> : (
          <>
            <ResponsiveContainer width="100%" height={BASE_CH}>
              <BarChart data={displayData} layout={layout} margin={layout === 'vertical' ? { left: 5 } : undefined}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                {layout === 'vertical' ? (
                  <>
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis type="category" dataKey="name" width={labelWidth} tick={{ fontSize: 8 }} />
                  </>
                ) : (
                  <>
                    <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-20} textAnchor="end" height={40} />
                    <YAxis tick={{ fontSize: 9 }} />
                  </>
                )}
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                {bars.map((b) => (
                  <Bar key={b.dataKey} dataKey={b.dataKey} fill={b.color} name={b.name} stackId="a" radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <InsightText text={insight} />
            <ChartFooter />
          </>
        )}
      </CardContent>
    </Card>
  );
});

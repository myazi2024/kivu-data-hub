/**
 * Main ChartCard variant — bar (h/v), pie, donut, area + cross-variable mode.
 *
 * The shared building blocks (contexts, watermark, image hook, cross picker)
 * live in `./chartCardShared`. The other card variants are re-exported here
 * for backwards compatibility with existing imports.
 */
import React, { memo, useContext, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import { LucideIcon } from 'lucide-react';
import ShareButton from '@/components/shared/ShareButton';
import { ProjectOnMapButton } from './ProjectOnMapButton';
import { useProjectionTab } from './ProjectionTabContext';
import { CHART_HEIGHT as BASE_CH, NoData } from '@/utils/analyticsConstants';
import { CHART_COLORS } from '@/utils/analyticsHelpers';
import { CrossVariable } from '@/config/crossVariables';
import { ChartInsight } from '@/utils/chartInsights';
import {
  ChartLogoIcon, ChartFilterSubtitle, ChartFooter, LogoWatermark, InsightText,
  CrossVariablePicker, CrossStackedChart,
  FilterLabelContext, useChartImageBlob,
  tooltipStyle, gridStroke, colSpanClass, truncLabel,
} from './chartCardShared';

// Re-exports kept stable for downstream imports
export {
  FilterLabelContext, WatermarkContext, WatermarkConfigContext,
  type WatermarkConfig,
} from './chartCardShared';
export { StackedBarCard } from './StackedBarCard';
export { MultiAreaChartCard } from './MultiAreaChartCard';
export { ColorMappedPieCard } from './ColorMappedPieCard';

interface ChartCardProps {
  title: string;
  icon?: LucideIcon;
  iconColor?: string;
  colSpan?: number;
  data: { name: string; value: number }[];
  type: 'bar-h' | 'bar-v' | 'pie' | 'donut' | 'area';
  color?: string;
  colorIndex?: number;
  labelWidth?: number;
  maxItems?: number;
  hidden?: boolean;
  insight?: string | ChartInsight;
  crossVariables?: CrossVariable[];
  rawRecords?: any[];
  groupField?: string;
  /** Onglet analytics propriétaire (pour la projection sur la carte RDC) */
  projectionTab?: string;
  /** Source SQL principale (pour la projection) */
  projectionSource?: string;
}

export const ChartCard: React.FC<ChartCardProps> = memo(({
  title, colSpan, data, type, color, colorIndex = 0,
  labelWidth = 90, maxItems = 10, hidden = false, insight,
  crossVariables, rawRecords, groupField,
  projectionTab, projectionSource,
}) => {
  const { ref, getBlob } = useChartImageBlob();
  const filterLabel = useContext(FilterLabelContext);
  const ctxTab = useProjectionTab();
  const effectiveTab = projectionTab || ctxTab;
  const [crossField, setCrossField] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  if (hidden) return null;

  const hasCross = crossVariables && crossVariables.length > 0 && rawRecords && groupField;
  const isCrossMode = hasCross && crossField;

  const fill = color || CHART_COLORS[colorIndex % CHART_COLORS.length];
  const displayData = type === 'area' ? data : data.slice(0, maxItems);
  const truncated = type !== 'area' && data.length > maxItems;
  const CH = type === 'bar-h' && displayData.length > 5 ? Math.max(BASE_CH, displayData.length * 28) : BASE_CH;

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
          {truncated && !isCrossMode && (
            <span className="text-[8px] text-muted-foreground shrink-0 mt-0.5">Top {maxItems}/{data.length}</span>
          )}
          <div className="flex items-center gap-0.5 shrink-0">
            {hasCross && (
              <CrossVariablePicker
                variables={crossVariables!}
                selected={crossField}
                onSelect={setCrossField}
              />
            )}
            {rawRecords && effectiveTab && (
              <ProjectOnMapButton
                projectionId={`${effectiveTab}::${title}`}
                label={title}
                rawRecords={rawRecords}
                sourceTab={effectiveTab}
                dataSource={projectionSource}
              />
            )}
            <ShareButton getBlob={getBlob} title={title} variant="chart" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2 relative">
        <LogoWatermark />
        {isCrossMode ? (
          <>
            <CrossStackedChart
              records={rawRecords!}
              groupField={groupField!}
              crossField={crossField!}
              maxItems={maxItems}
            />
            <ChartFooter />
          </>
        ) : displayData.length === 0 ? <NoData /> : (
          <>
            <ResponsiveContainer width="100%" height={CH}>
              {type === 'bar-h' ? (
                <BarChart data={displayData} layout="vertical" margin={{ left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis type="number" tick={{ fontSize: 9 }} />
                  <YAxis type="category" dataKey="name" width={labelWidth} tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill={fill} radius={[0, 3, 3, 0]} />
                </BarChart>
              ) : type === 'bar-v' ? (
                <BarChart data={displayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={40} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill={fill} radius={[3, 3, 0, 0]} />
                </BarChart>
              ) : type === 'pie' ? (
                <PieChart>
                  <Pie
                    data={displayData} cx="50%" cy="50%" outerRadius={55} dataKey="value"
                    label={({ name, value }) => `${truncLabel(name)}: ${value}`}
                    labelLine={{ strokeWidth: 0.5 }}
                  >
                    {displayData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              ) : type === 'donut' ? (
                <PieChart>
                  <Pie
                    data={displayData} cx="50%" cy="50%" outerRadius={55} innerRadius={30} dataKey="value"
                    label={({ name, percent }) => `${truncLabel(name)} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {displayData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                </PieChart>
              ) : (
                <AreaChart data={displayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="value" stroke={fill} fill={fill} fillOpacity={0.15} />
                </AreaChart>
              )}
            </ResponsiveContainer>
            <InsightText text={insight} />
            <ChartFooter />
          </>
        )}
      </CardContent>
    </Card>
  );
});

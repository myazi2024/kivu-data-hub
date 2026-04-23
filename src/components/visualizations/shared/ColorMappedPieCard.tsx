import React, { memo, useContext, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { LucideIcon } from 'lucide-react';
import ShareButton from '@/components/shared/ShareButton';
import { CHART_HEIGHT as BASE_CH, NoData } from '@/utils/analyticsConstants';
import { CHART_COLORS } from '@/utils/analyticsHelpers';
import { CrossVariable } from '@/config/crossVariables';
import { ChartInsight } from '@/utils/chartInsights';
import {
  ChartLogoIcon, ChartFilterSubtitle, ChartFooter, LogoWatermark, InsightText,
  CrossVariablePicker, CrossStackedChart,
  FilterLabelContext, useChartImageBlob,
  tooltipStyle, truncLabel,
} from './chartCardShared';

interface ColorMappedPieProps {
  title: string;
  icon?: LucideIcon;
  iconColor?: string;
  data: { name: string; value: number }[];
  colorMap?: Record<string, string>;
  insight?: string | ChartInsight;
  crossVariables?: CrossVariable[];
  rawRecords?: any[];
  groupField?: string;
}

export const ColorMappedPieCard: React.FC<ColorMappedPieProps> = memo(({
  title, data, colorMap = {}, insight, crossVariables, rawRecords, groupField,
}) => {
  const { ref, getBlob } = useChartImageBlob();
  const filterLabel = useContext(FilterLabelContext);
  const [crossField, setCrossField] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const hasCross = crossVariables && crossVariables.length > 0 && rawRecords && groupField;
  const isCrossMode = hasCross && crossField;

  return (
    <Card
      ref={ref}
      onClick={() => setFocused((f) => !f)}
      className={`analytics-card border-0 cursor-pointer ${focused ? 'is-focused z-10' : ''}`}
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
          <div className="flex items-center gap-0.5 shrink-0">
            {hasCross && (
              <CrossVariablePicker
                variables={crossVariables!}
                selected={crossField}
                onSelect={setCrossField}
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
            <CrossStackedChart records={rawRecords!} groupField={groupField!} crossField={crossField!} />
            <ChartFooter />
          </>
        ) : data.length === 0 ? <NoData /> : (
          <>
            <ResponsiveContainer width="100%" height={BASE_CH}>
              <PieChart>
                <Pie
                  data={data} cx="50%" cy="50%" outerRadius={55} dataKey="value"
                  label={({ name, value }) => `${truncLabel(name)}: ${value}`}
                  labelLine={{ strokeWidth: 0.5 }}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={colorMap[entry.name] || CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <InsightText text={insight} />
            <ChartFooter />
          </>
        )}
      </CardContent>
    </Card>
  );
});

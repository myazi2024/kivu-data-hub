import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';
import { CHART_HEIGHT as CH, NoData } from '@/utils/analyticsConstants';
import { CHART_COLORS } from '@/utils/analyticsHelpers';
import { LucideIcon, Info } from 'lucide-react';

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
  insight?: string;
}

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
  insight?: string;
}

interface MultiDataPieProps {
  title: string;
  icon?: LucideIcon;
  iconColor?: string;
  data: { name: string; value: number }[];
  colorMap?: Record<string, string>;
  insight?: string;
}

const tooltipStyle = { fontSize: 10 };
const gridStroke = 'hsl(var(--border))';

const colSpanClass: Record<number, string> = { 2: 'md:col-span-2', 3: 'md:col-span-3' };

const truncLabel = (s: string, max = 12) => s.length > max ? s.slice(0, max) + '…' : s;

const InsightText: React.FC<{ text?: string }> = ({ text }) => {
  if (!text) return null;
  return (
    <div className="flex items-start gap-1 mt-1 px-0.5">
      <Info className="h-2.5 w-2.5 text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-[9px] text-muted-foreground leading-tight italic">{text}</p>
    </div>
  );
};

export const ChartCard: React.FC<ChartCardProps> = memo(({
  title, icon: Icon, iconColor, colSpan, data, type, color, colorIndex = 0, labelWidth = 90, maxItems = 10, hidden = false, insight
}) => {
  if (hidden) return null;
  const fill = color || CHART_COLORS[colorIndex % CHART_COLORS.length];
  const displayData = type === 'area' ? data : data.slice(0, maxItems);
  const truncated = type !== 'area' && data.length > maxItems;

  return (
    <Card className={`border-border/30 ${colSpan ? colSpanClass[colSpan] || '' : ''}`}>
      <CardHeader className="pb-1 px-2 pt-2">
        <CardTitle className="text-xs font-semibold flex items-center gap-1">
          {Icon && <Icon className={`h-3 w-3 ${iconColor || 'text-primary'}`} />}
          {title}
          {truncated && <span className="text-[8px] text-muted-foreground ml-auto">Top {maxItems}/{data.length}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        {displayData.length === 0 ? <NoData /> : (
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
                  <Pie data={displayData} cx="50%" cy="50%" outerRadius={55} dataKey="value"
                    label={({ name, value }) => `${truncLabel(name)}: ${value}`}
                    labelLine={{ strokeWidth: 0.5 }}>
                    {displayData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              ) : type === 'donut' ? (
                <PieChart>
                  <Pie data={displayData} cx="50%" cy="50%" outerRadius={55} innerRadius={30} dataKey="value"
                    label={({ name, percent }) => `${truncLabel(name)} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
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
          </>
        )}
      </CardContent>
    </Card>
  );
});

export const StackedBarCard: React.FC<StackedBarCardProps> = memo(({
  title, icon: Icon, iconColor, colSpan, data, bars, layout = 'horizontal', labelWidth = 90, maxItems = 8, hidden = false, insight,
}) => {
  if (hidden) return null;
  const displayData = data.slice(0, maxItems);
  return (
    <Card className={`border-border/30 ${colSpan ? colSpanClass[colSpan] || '' : ''}`}>
      <CardHeader className="pb-1 px-2 pt-2">
        <CardTitle className="text-xs font-semibold flex items-center gap-1">
          {Icon && <Icon className={`h-3 w-3 ${iconColor || 'text-primary'}`} />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        {displayData.length === 0 ? <NoData /> : (
          <>
            <ResponsiveContainer width="100%" height={CH}>
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
                {bars.map(b => <Bar key={b.dataKey} dataKey={b.dataKey} fill={b.color} name={b.name} stackId="a" radius={[3, 3, 0, 0]} />)}
              </BarChart>
            </ResponsiveContainer>
            <InsightText text={insight} />
          </>
        )}
      </CardContent>
    </Card>
  );
});

export const ColorMappedPieCard: React.FC<MultiDataPieProps> = memo(({
  title, icon: Icon, iconColor, data, colorMap = {}, insight,
}) => {
  return (
    <Card className="border-border/30">
      <CardHeader className="pb-1 px-2 pt-2">
        <CardTitle className="text-xs font-semibold flex items-center gap-1">
          {Icon && <Icon className={`h-3 w-3 ${iconColor || 'text-primary'}`} />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        {data.length === 0 ? <NoData /> : (
          <>
            <ResponsiveContainer width="100%" height={CH}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" outerRadius={55} dataKey="value"
                  label={({ name, value }) => `${truncLabel(name)}: ${value}`}
                  labelLine={{ strokeWidth: 0.5 }}>
                  {data.map((entry, i) => (
                    <Cell key={i} fill={colorMap[entry.name] || CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <InsightText text={insight} />
          </>
        )}
      </CardContent>
    </Card>
  );
});

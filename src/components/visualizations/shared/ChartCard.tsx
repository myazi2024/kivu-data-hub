import React, { memo, useRef, useCallback, useContext, createContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';
import { CHART_HEIGHT as BASE_CH, NoData } from '@/utils/analyticsConstants';
import { CHART_COLORS } from '@/utils/analyticsHelpers';
import { LucideIcon, Info, Copy, Check } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';

/** Context providing the active filter label string to all chart cards */
export const FilterLabelContext = createContext<string>('');

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

const truncLabel = (s: string, max = 16) => s.length > max ? s.slice(0, max) + '…' : s;

const InsightText: React.FC<{ text?: string }> = ({ text }) => {
  if (!text) return null;
  return (
    <div className="flex items-start gap-1 mt-1 px-0.5">
      <Info className="h-2.5 w-2.5 text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-[9px] text-muted-foreground leading-tight italic">{text}</p>
    </div>
  );
};

/** Context providing configurable watermark text */
export const WatermarkContext = createContext<string>('BIC - Tous droits réservés');

const ChartFooter: React.FC = () => {
  const watermark = useContext(WatermarkContext);
  const today = new Date();
  const formatted = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  return (
    <p className="text-[7px] text-muted-foreground text-right mt-1 select-none">
      {formatted} · {watermark}
    </p>
  );
};

const ChartFilterSubtitle: React.FC<{ filterLabel: string }> = ({ filterLabel }) => (
  <p className="block text-[9px] italic leading-tight text-muted-foreground mt-0.5 break-words">({filterLabel})</p>
);

const roundCorners = (dataUrl: string, radius: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas context'));
      ctx.beginPath();
      const r = radius;
      const w = img.width;
      const h = img.height;
      ctx.moveTo(r, 0);
      ctx.arcTo(w, 0, w, h, r);
      ctx.arcTo(w, h, 0, h, r);
      ctx.arcTo(0, h, 0, 0, r);
      ctx.arcTo(0, 0, w, 0, r);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png');
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
};

const useCopyAsImage = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  const copy = useCallback(async () => {
    if (!ref.current) return;
    try {
      const dataUrl = await toPng(ref.current, { backgroundColor: 'white', pixelRatio: 2 });
      const blob = await roundCorners(dataUrl, 24); // 12px * pixelRatio(2)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      toast.success('Image copiée dans le presse-papiers');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const dataUrl = await toPng(ref.current!, { backgroundColor: 'white', pixelRatio: 2 });
        const blob = await roundCorners(dataUrl, 24);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'chart.png';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Image téléchargée');
      } catch {
        toast.error('Impossible de copier l\'image');
      }
    }
  }, []);

  return { ref, copied, copy };
};

const CopyButton: React.FC<{ onClick: () => void; copied: boolean }> = ({ onClick, copied }) => (
  <button
    onClick={onClick}
    className="ml-auto p-0.5 rounded hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
    title="Copier en image"
  >
    {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
  </button>
);

export const ChartCard: React.FC<ChartCardProps> = memo(({
  title, icon: Icon, iconColor, colSpan, data, type, color, colorIndex = 0, labelWidth = 90, maxItems = 10, hidden = false, insight
}) => {
  const { ref, copied, copy } = useCopyAsImage();
  const filterLabel = useContext(FilterLabelContext);
  if (hidden) return null;

  const fill = color || CHART_COLORS[colorIndex % CHART_COLORS.length];
  const displayData = type === 'area' ? data : data.slice(0, maxItems);
  const truncated = type !== 'area' && data.length > maxItems;
  const CH = type === 'bar-h' && displayData.length > 5 ? Math.max(BASE_CH, displayData.length * 28) : BASE_CH;

  return (
    <Card ref={ref} className={`border-border/30 ${colSpan ? colSpanClass[colSpan] || '' : ''}`}>
      <CardHeader className="pb-1 px-2 pt-2">
        <div className="flex items-start gap-1">
          {Icon && <Icon className={`h-3 w-3 ${iconColor || 'text-primary'} shrink-0 mt-0.5`} />}
          <div className="min-w-0 flex-1">
            <CardTitle className="text-xs font-semibold leading-tight break-words">{title}</CardTitle>
            {filterLabel && <ChartFilterSubtitle filterLabel={filterLabel} />}
          </div>
          {truncated && <span className="text-[8px] text-muted-foreground shrink-0 mt-0.5">Top {maxItems}/{data.length}</span>}
          <CopyButton onClick={copy} copied={copied} />
        </div>
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
            <ChartFooter />
          </>
        )}
      </CardContent>
    </Card>
  );
});

export const StackedBarCard: React.FC<StackedBarCardProps> = memo(({
  title, icon: Icon, iconColor, colSpan, data, bars, layout = 'horizontal', labelWidth = 90, maxItems = 8, hidden = false, insight,
}) => {
  const { ref, copied, copy } = useCopyAsImage();
  const filterLabel = useContext(FilterLabelContext);
  if (hidden) return null;

  const displayData = data.slice(0, maxItems);

  return (
    <Card ref={ref} className={`border-border/30 ${colSpan ? colSpanClass[colSpan] || '' : ''}`}>
      <CardHeader className="pb-1 px-2 pt-2">
        <div className="flex items-start gap-1">
          {Icon && <Icon className={`h-3 w-3 ${iconColor || 'text-primary'} shrink-0 mt-0.5`} />}
          <div className="min-w-0 flex-1">
            <CardTitle className="text-xs font-semibold leading-tight break-words">{title}</CardTitle>
            {filterLabel && <ChartFilterSubtitle filterLabel={filterLabel} />}
          </div>
          <CopyButton onClick={copy} copied={copied} />
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2">
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
                {bars.map(b => <Bar key={b.dataKey} dataKey={b.dataKey} fill={b.color} name={b.name} stackId="a" radius={[3, 3, 0, 0]} />)}
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

export const ColorMappedPieCard: React.FC<MultiDataPieProps> = memo(({
  title, icon: Icon, iconColor, data, colorMap = {}, insight,
}) => {
  const { ref, copied, copy } = useCopyAsImage();
  const filterLabel = useContext(FilterLabelContext);
  
  return (
    <Card ref={ref} className="border-border/30">
      <CardHeader className="pb-1 px-2 pt-2">
        <div className="flex items-start gap-1">
          {Icon && <Icon className={`h-3 w-3 ${iconColor || 'text-primary'} shrink-0 mt-0.5`} />}
          <div className="min-w-0 flex-1">
            <CardTitle className="text-xs font-semibold leading-tight break-words">{title}</CardTitle>
            {filterLabel && <ChartFilterSubtitle filterLabel={filterLabel} />}
          </div>
          <CopyButton onClick={copy} copied={copied} />
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        {data.length === 0 ? <NoData /> : (
          <>
             <ResponsiveContainer width="100%" height={BASE_CH}>
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
            <ChartFooter />
          </>
        )}
      </CardContent>
    </Card>
  );
});
/**
 * Shared building blocks for the analytics chart cards (contexts, watermark,
 * footer, image-export hook, cross-variable picker + chart).
 *
 * Extracted from the historical monolithic ChartCard.tsx to keep each chart
 * variant under the maintainability threshold.
 */
import React, { createContext, useContext, useCallback, useMemo, useRef, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { GitBranch, X, Info, BookOpen, TrendingUp } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAppAppearance } from '@/hooks/useAppAppearance';
import { CHART_HEIGHT as BASE_CH, NoData } from '@/utils/analyticsConstants';
import { CHART_COLORS, crossBy } from '@/utils/analyticsHelpers';
import type { CrossVariable } from '@/config/crossVariables';
import type { ChartInsight } from '@/utils/chartInsights';
import { toPng } from 'html-to-image';

// ────────────────────────────────────────────────────────────
// Contexts (kept identical to legacy API)
// ────────────────────────────────────────────────────────────

/** Active filter label used as a chart subtitle. */
export const FilterLabelContext = createContext<string>('');

/** Configurable watermark text for chart exports. */
export const WatermarkContext = createContext<string>('BIC - Tous droits réservés');

export interface WatermarkConfig {
  opacity: number;
  size: number;
  position: string;
  logoUrl?: string;
}
export const WatermarkConfigContext = createContext<WatermarkConfig>({
  opacity: 0.06, size: 80, position: 'center',
});

// ────────────────────────────────────────────────────────────
// Style tokens
// ────────────────────────────────────────────────────────────

export const tooltipStyle = { fontSize: 10 } as const;
export const gridStroke = 'hsl(var(--border))';
export const colSpanClass: Record<number, string> = { 2: 'md:col-span-2', 3: 'md:col-span-3' };
export const truncLabel = (s: string, max = 16) => (s.length > max ? s.slice(0, max) + '…' : s);

// ────────────────────────────────────────────────────────────
// Tiny presentational helpers
// ────────────────────────────────────────────────────────────

export const ChartLogoIcon: React.FC = () => {
  const { config } = useAppAppearance();
  const logoUrl = typeof config.logo_url === 'string' ? config.logo_url : '';
  if (!logoUrl) return null;
  return <img src={logoUrl} className="h-6 w-6 object-contain shrink-0 opacity-80" alt="" />;
};

export const ChartFilterSubtitle: React.FC<{ filterLabel: string }> = ({ filterLabel }) => (
  <p className="block text-[9px] italic leading-tight text-muted-foreground mt-0.5 break-words">
    ({filterLabel})
  </p>
);

export const InsightText: React.FC<{ text?: string | ChartInsight }> = ({ text }) => {
  if (!text) return null;
  if (typeof text === 'string') {
    return (
      <div className="flex items-start gap-1 mt-1 px-0.5">
        <Info className="h-2.5 w-2.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[9px] text-muted-foreground leading-tight italic">{text}</p>
      </div>
    );
  }
  return (
    <div className="mt-1.5 px-0.5 space-y-1">
      <div className="flex items-start gap-1">
        <BookOpen className="h-2.5 w-2.5 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-[9px] text-muted-foreground leading-tight italic">{text.definition}</p>
      </div>
      <div className="flex items-start gap-1">
        <TrendingUp className="h-2.5 w-2.5 text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-[9px] text-muted-foreground leading-tight italic">{text.interpretation}</p>
      </div>
    </div>
  );
};

export const LogoWatermark: React.FC = () => {
  const config = useContext(WatermarkConfigContext);
  const positionStyles: Record<string, React.CSSProperties> = {
    'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    'top-left': { top: '8px', left: '8px' },
    'top-right': { top: '8px', right: '8px' },
    'bottom-left': { bottom: '24px', left: '8px' },
    'bottom-right': { bottom: '24px', right: '8px' },
  };
  return (
    <img
      src={config.logoUrl || '/bic-logo.png'}
      alt=""
      className="absolute pointer-events-none select-none"
      style={{
        width: config.size,
        height: config.size,
        objectFit: 'contain',
        opacity: config.opacity,
        filter: 'brightness(0) sepia(1) saturate(5) hue-rotate(185deg)',
        ...(positionStyles[config.position] || positionStyles['center']),
      }}
    />
  );
};

export const ChartFooter: React.FC = () => {
  const watermark = useContext(WatermarkContext);
  const config = useContext(WatermarkConfigContext);
  const today = new Date();
  const formatted = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  return (
    <p className="text-[7px] text-muted-foreground text-right mt-1 select-none flex items-center justify-end gap-0.5">
      <span>{formatted} · {watermark}</span>
      {config.logoUrl && (
        <img src={config.logoUrl} alt="" className="h-2.5 w-2.5 inline-block object-contain opacity-60" />
      )}
    </p>
  );
};

// ────────────────────────────────────────────────────────────
// Image export hook
// ────────────────────────────────────────────────────────────

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
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
};

export const useChartImageBlob = () => {
  const ref = useRef<HTMLDivElement>(null);
  const getBlob = useCallback(async (): Promise<Blob> => {
    if (!ref.current) throw new Error('No ref');
    const dataUrl = await toPng(ref.current, { backgroundColor: 'white', pixelRatio: 2 });
    return roundCorners(dataUrl, 24);
  }, []);
  return { ref, getBlob };
};

// ────────────────────────────────────────────────────────────
// Cross-variable interactivity
// ────────────────────────────────────────────────────────────

export const CrossVariablePicker: React.FC<{
  variables: CrossVariable[];
  selected: string | null;
  onSelect: (field: string | null) => void;
}> = ({ variables, selected, onSelect }) => {
  const [open, setOpen] = useState(false);
  if (variables.length === 0) return null;

  if (selected) {
    const active = variables.find((v) => v.field === selected);
    return (
      <button
        onClick={() => onSelect(null)}
        className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-medium hover:bg-primary/20 transition-colors"
        title="Retirer le croisement"
      >
        <span className="truncate max-w-[50px]">{active?.label || selected}</span>
        <X className="h-2.5 w-2.5 shrink-0" />
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="p-0.5 rounded hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
          title="Croiser avec une variable"
        >
          <GitBranch className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-[120px] p-1" align="end" sideOffset={4}>
        <p className="text-[9px] font-medium text-muted-foreground px-1.5 py-1">Croiser par :</p>
        {variables.map((v) => (
          <button
            key={v.field}
            onClick={() => { onSelect(v.field); setOpen(false); }}
            className="w-full text-left px-1.5 py-1 text-[10px] rounded hover:bg-muted/80 transition-colors"
          >
            {v.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

export const CrossStackedChart: React.FC<{
  records: any[];
  groupField: string;
  crossField: string;
  maxCross?: number;
  maxItems?: number;
}> = ({ records, groupField, crossField, maxCross = 5, maxItems = 8 }) => {
  const { data, keys } = useMemo(
    () => crossBy(records, groupField, crossField, maxCross),
    [records, groupField, crossField, maxCross],
  );
  const displayData = data.slice(0, maxItems);
  if (displayData.length === 0) return <NoData />;

  const maxLabelLen = Math.max(...displayData.map((d) => String(d.name).length));
  const labelW = Math.min(Math.max(maxLabelLen * 6, 60), 120);
  const CH = displayData.length > 5 ? Math.max(BASE_CH, displayData.length * 28) : BASE_CH;

  return (
    <ResponsiveContainer width="100%" height={CH}>
      <BarChart data={displayData} layout="vertical" margin={{ left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis type="number" tick={{ fontSize: 9 }} />
        <YAxis type="category" dataKey="name" width={labelW} tick={{ fontSize: 8 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 9 }} />
        {keys.map((k, i) => (
          <Bar
            key={k}
            dataKey={k}
            name={k}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            stackId="cross"
            radius={i === keys.length - 1 ? [0, 3, 3, 0] : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

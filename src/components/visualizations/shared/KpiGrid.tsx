import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface KpiItem {
  label: string;
  value: string | number;
  cls: string;
  /** Optional tooltip showing delta or extra info */
  tooltip?: string;
}

interface Props {
  items: KpiItem[];
  cols?: number;
}

/**
 * #2 fix: Use responsive Tailwind grid classes instead of inline style.
 * On mobile (< md), show 2 or 3 cols; on md+, show up to items.length (max 6).
 */
const gridClass: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
  5: 'grid-cols-3 md:grid-cols-5',
  6: 'grid-cols-3 md:grid-cols-6',
};

export const KpiGrid: React.FC<Props> = memo(({ items, cols }) => {
  const n = cols || items.length;
  const cls = gridClass[Math.min(n, 6)] || 'grid-cols-2 md:grid-cols-4';
  return (
    <TooltipProvider>
      <div className={`grid gap-1.5 ${cls}`}>
        {items.map((kpi, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <Card className="border-border/30 cursor-default">
                <CardContent className="p-2">
                  <p className="text-[9px] text-muted-foreground truncate">{kpi.label}</p>
                  <p className={`text-lg font-bold ${kpi.cls}`}>{kpi.value}</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            {kpi.tooltip && (
              <TooltipContent side="bottom" className="text-xs">
                {kpi.tooltip}
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
});

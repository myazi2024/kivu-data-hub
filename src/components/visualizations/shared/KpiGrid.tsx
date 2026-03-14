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

export const KpiGrid: React.FC<Props> = memo(({ items, cols }) => {
  const gridCols = cols || items.length;
  return (
    <TooltipProvider>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${Math.min(gridCols, 5)}, minmax(0, 1fr))` }}
      >
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

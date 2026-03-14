import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export interface KpiItem {
  label: string;
  value: string | number;
  cls: string;
}

interface Props {
  items: KpiItem[];
  cols?: number;
}

export const KpiGrid: React.FC<Props> = ({ items, cols }) => {
  const gridCols = cols || items.length;
  return (
    <div className={`grid gap-1.5`} style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
      {items.map((kpi, i) => (
        <Card key={i} className="border-border/30">
          <CardContent className="p-2">
            <p className="text-[9px] text-muted-foreground truncate">{kpi.label}</p>
            <p className={`text-lg font-bold ${kpi.cls}`}>{kpi.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

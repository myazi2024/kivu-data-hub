import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

interface DayPoint { date: string; revenue: number; count?: number }

interface Props {
  loading: boolean;
  current: DayPoint[];
  previous?: DayPoint[];
}

export function RevenueChartEnhanced({ loading, current, previous = [] }: Props) {
  const data = useMemo(() => {
    // Compute MA(7) on current
    const enriched = current.map((d, i) => {
      const window = current.slice(Math.max(0, i - 6), i + 1);
      const ma7 = window.reduce((s, x) => s + (x.revenue || 0), 0) / window.length;
      const prev = previous[i]?.revenue;
      return { ...d, ma7, prev };
    });
    return enriched;
  }, [current, previous]);

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-sm md:text-base">Évolution des revenus</CardTitle>
        <p className="text-xs text-muted-foreground">Quotidien · moyenne 7j · comparatif période précédente</p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        {loading ? (
          <Skeleton className="h-48 md:h-64 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => {
                  const d = new Date(v);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name="Revenus"
              />
              <Line
                type="monotone"
                dataKey="ma7"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
                name="Moyenne 7j"
              />
              {previous.length > 0 && (
                <Line
                  type="monotone"
                  dataKey="prev"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  dot={false}
                  name="Période précédente"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

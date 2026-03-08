import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { LandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { Landmark } from 'lucide-react';

const TYPE_COLORS = [
  'hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(142, 71%, 45%)',
  'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--secondary))',
  'hsl(var(--muted-foreground))', 'hsl(280, 60%, 50%)', 'hsl(200, 70%, 50%)',
  'hsl(30, 80%, 50%)', 'hsl(160, 60%, 40%)'
];

export const ConstructionTypesViz: React.FC<{ data: LandDataAnalytics }> = ({ data }) => {
  const total = data.constructionTypes.reduce((s, t) => s + t.count, 0);
  const chartData = data.constructionTypes.map((t, i) => ({
    name: t.type.length > 15 ? t.type.substring(0, 14) + '…' : t.type,
    fullName: t.type,
    count: t.count,
    percentage: total > 0 ? ((t.count / total) * 100).toFixed(1) : '0',
    color: TYPE_COLORS[i % TYPE_COLORS.length]
  }));

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs">
            <Landmark className="h-4 w-4 text-primary" />
            Types de bâtiments ({total} enregistrés)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {chartData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Aucune donnée</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 5 }} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '12px' }}
                    formatter={(value: number) => [value, 'Parcelles']}
                    labelFormatter={(_, payload: any[]) => payload?.[0]?.payload?.fullName || ''}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { LandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { FileText } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))'];

export const TitleTypesViz: React.FC<{ data: LandDataAnalytics }> = ({ data }) => {
  const total = data.titleTypes.reduce((s, t) => s + t.count, 0);
  const chartData = data.titleTypes.map((t, i) => ({
    name: t.type,
    value: t.count,
    percentage: total > 0 ? ((t.count / total) * 100).toFixed(1) : '0',
    color: COLORS[i % COLORS.length]
  }));

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs">
            <FileText className="h-4 w-4 text-primary" />
            Répartition des types de titres fonciers
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {chartData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Aucune donnée</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Parcelles']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {chartData.map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded border text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: t.color }} />
                      <span className="font-medium">{t.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold">{t.value}</span>
                      <span className="text-muted-foreground ml-1">({t.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

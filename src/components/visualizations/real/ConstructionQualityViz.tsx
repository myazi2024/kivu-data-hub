import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { LandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { Building, Info } from 'lucide-react';

const NATURE_COLORS: Record<string, string> = {
  'Durable': 'hsl(142, 71%, 45%)',
  'Semi-durable': 'hsl(var(--warning))',
  'Précaire': 'hsl(var(--destructive))',
};

export const ConstructionQualityViz: React.FC<{ data: LandDataAnalytics }> = ({ data }) => {
  const total = data.constructionNatures.reduce((s, n) => s + n.count, 0);
  const chartData = data.constructionNatures.map(n => ({
    name: n.nature,
    value: n.count,
    percentage: total > 0 ? ((n.count / total) * 100).toFixed(1) : '0',
    color: NATURE_COLORS[n.nature] || 'hsl(var(--muted-foreground))'
  }));

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs">
            <Building className="h-4 w-4 text-primary" />
            Qualité des constructions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {chartData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Aucune donnée</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Parcelles']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {chartData.map((n, i) => (
                  <div key={i} className="p-3 rounded border" style={{ borderLeftColor: n.color, borderLeftWidth: 3 }}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">{n.name}</span>
                      <span className="font-bold text-primary">{n.value} ({n.percentage}%)</span>
                    </div>
                    <div className="mt-1 w-full bg-muted rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${n.percentage}%`, backgroundColor: n.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 p-2 bg-muted/20 rounded text-xs text-muted-foreground">
            <Info className="h-3 w-3 inline mr-1" />
            <strong>Durable</strong> = béton/brique • <strong>Semi-durable</strong> = tôle/bois traité • <strong>Précaire</strong> = matériaux temporaires
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

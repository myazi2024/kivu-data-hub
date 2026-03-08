import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { LandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { Home } from 'lucide-react';

const USAGE_COLORS: Record<string, string> = {
  'Résidentiel': 'hsl(var(--primary))',
  'Commercial': 'hsl(var(--accent))',
  'Agricole': 'hsl(142, 71%, 45%)',
  'Industriel': 'hsl(var(--warning))',
  'Mixte': 'hsl(var(--secondary))',
  'Institutionnel': 'hsl(var(--destructive))',
};

export const UsageDistributionViz: React.FC<{ data: LandDataAnalytics }> = ({ data }) => {
  const total = data.usageDistribution.reduce((s, u) => s + u.count, 0);
  const chartData = data.usageDistribution.map(u => ({
    name: u.usage,
    count: u.count,
    percentage: total > 0 ? ((u.count / total) * 100).toFixed(1) : '0',
    color: USAGE_COLORS[u.usage] || 'hsl(var(--muted-foreground))'
  }));

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs">
            <Home className="h-4 w-4 text-primary" />
            Usage déclaré des parcelles
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {chartData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Aucune donnée d'usage</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 10 }} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '12px' }}
                    formatter={(value: number) => [value, 'Parcelles']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {chartData.map((u, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: u.color }} />
                    <span>{u.name}: <strong>{u.count}</strong> ({u.percentage}%)</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

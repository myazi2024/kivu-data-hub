import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { LandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { Map, Info } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))'];

export const ParcelDistributionViz: React.FC<{ data: LandDataAnalytics }> = ({ data }) => {
  const chartData = data.parcelsByProvince.map(p => ({
    name: p.province.length > 12 ? p.province.substring(0, 11) + '…' : p.province,
    fullName: p.province,
    total: p.count,
    su: p.suCount,
    sr: p.srCount,
    gps: p.withGps,
    avgArea: p.avgArea,
  }));

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs">
            <Map className="h-4 w-4 text-primary" />
            Parcelles enregistrées par province
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {chartData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Aucune parcelle enregistrée</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 40 }} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-30} textAnchor="end" height={50} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '12px' }}
                  formatter={(value: number, name: string) => [value, name === 'su' ? 'Section Urbaine' : name === 'sr' ? 'Section Rurale' : name]}
                  labelFormatter={(_, payload: any[]) => payload?.[0]?.payload?.fullName || ''}
                />
                <Bar dataKey="su" stackId="type" fill="hsl(var(--primary))" name="su" radius={[0, 0, 0, 0]} />
                <Bar dataKey="sr" stackId="type" fill="hsl(var(--accent))" name="sr" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          <div className="mt-3 flex gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-primary" />
              <span>Section Urbaine (SU)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-accent" />
              <span>Section Rurale (SR)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats par province */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs">Détail par province</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {data.parcelsByProvince.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded border text-xs">
                <div>
                  <span className="font-medium">{p.province}</span>
                  <span className="text-muted-foreground ml-2">({p.suCount} SU, {p.srCount} SR)</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-primary">{p.count}</span>
                  <span className="text-muted-foreground ml-1">parcelles</span>
                  <div className="text-[10px] text-muted-foreground">moy. {(p.avgArea / 10000).toFixed(2)} ha • {p.withGps} GPS</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

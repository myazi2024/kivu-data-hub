import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { Map } from 'lucide-react';

export const ParcelAnalyticsViz: React.FC<{ data: LandDataAnalytics }> = ({ data }) => {
  const chartData = data.parcelsByProvince.map(p => ({
    name: p.province.length > 12 ? p.province.substring(0, 11) + '…' : p.province,
    fullName: p.province,
    su: p.suCount,
    sr: p.srCount,
    gps: p.withGps,
  }));

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Map className="h-4 w-4 text-primary" />
            Parcelles par province (SU / SR)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {chartData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Aucune parcelle</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 10, right: 5, left: 0, bottom: 50 }} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number, name: string) => [v, name === 'su' ? 'Section Urbaine' : 'Section Rurale']}
                  labelFormatter={(_, p: any[]) => p?.[0]?.payload?.fullName || ''}
                />
                <Bar dataKey="su" stackId="t" fill="hsl(var(--primary))" name="su" />
                <Bar dataKey="sr" stackId="t" fill="hsl(var(--accent))" name="sr" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="mt-2 flex gap-4 text-xs">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-primary" /><span>Urbaine (SU)</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-accent" /><span>Rurale (SR)</span></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {data.parcelsByProvince.slice(0, 6).map((p, i) => (
          <Card key={i} className="p-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-sm">{p.province}</div>
                <div className="text-xs text-muted-foreground">{p.suCount} SU • {p.srCount} SR • {p.withGps} GPS</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-primary">{p.count}</div>
                <div className="text-[10px] text-muted-foreground">{(p.avgArea / 10000).toFixed(2)} ha moy.</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

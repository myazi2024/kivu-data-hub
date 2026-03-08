import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { LandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { Activity, Info } from 'lucide-react';

export const AreaDistributionViz: React.FC<{ data: LandDataAnalytics }> = ({ data }) => {
  // Create area buckets from parcelsByProvince avgArea
  const avgArea = data.totals.avgArea;

  // Use province data to show area comparison
  const chartData = data.parcelsByProvince.map(p => ({
    name: p.province.length > 12 ? p.province.substring(0, 11) + '…' : p.province,
    fullName: p.province,
    avgArea: p.avgArea,
    hectares: (p.avgArea / 10000).toFixed(2),
    count: p.count,
  })).sort((a, b) => b.avgArea - a.avgArea);

  const getColor = (area: number) => {
    if (area > 50000) return 'hsl(var(--primary))';
    if (area > 10000) return 'hsl(var(--accent))';
    if (area > 1000) return 'hsl(var(--warning))';
    return 'hsl(var(--muted-foreground))';
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-primary">{(avgArea / 10000).toFixed(2)}</div>
          <div className="text-[10px] text-muted-foreground">Superficie moy. (ha)</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-foreground">{data.totals.totalParcels}</div>
          <div className="text-[10px] text-muted-foreground">Parcelles totales</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-accent-foreground">{data.totals.withGps}</div>
          <div className="text-[10px] text-muted-foreground">Avec GPS</div>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs">
            <Activity className="h-4 w-4 text-primary" />
            Superficie moyenne par province (m²)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {chartData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Aucune donnée</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 40 }} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => v > 10000 ? `${(v/10000).toFixed(1)}ha` : `${v}m²`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '12px' }}
                    formatter={(value: number) => [`${value.toLocaleString()} m² (${(value/10000).toFixed(2)} ha)`, 'Superficie moyenne']}
                    labelFormatter={(_, payload: any[]) => `${payload?.[0]?.payload?.fullName} (${payload?.[0]?.payload?.count} parcelles)`}
                  />
                  <Bar dataKey="avgArea" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={getColor(entry.avgArea)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}

          <div className="mt-3 p-2 bg-muted/20 rounded text-xs text-muted-foreground">
            <Info className="h-3 w-3 inline mr-1" />
            Superficie calculée à partir des données enregistrées (area_sqm) des parcelles cadastrales.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

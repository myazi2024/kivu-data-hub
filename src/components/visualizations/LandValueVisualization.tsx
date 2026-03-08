import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ComposedChart, Line } from 'recharts';
import { ProvinceData } from '@/types/province';
import { MapPin, Info } from 'lucide-react';

interface LandValueVisualizationProps {
  provinces: ProvinceData[];
  selectedProvince?: ProvinceData | null;
}

export const LandValueVisualization: React.FC<LandValueVisualizationProps> = ({
  provinces,
  selectedProvince
}) => {
  const sorted = [...provinces].sort((a, b) => b.valeurFonciereParcelleUsd - a.valeurFonciereParcelleUsd);

  const chartData = sorted.map(p => ({
    name: p.name.length > 10 ? p.name.substring(0, 9) + '…' : p.name,
    fullName: p.name,
    valeur: p.valeurFonciereParcelleUsd,
    prixM2: p.prixMoyenVenteM2,
    zone: p.zone
  }));

  const avgValue = provinces.reduce((s, p) => s + p.valeurFonciereParcelleUsd, 0) / provinces.length;
  const maxValue = Math.max(...provinces.map(p => p.valeurFonciereParcelleUsd));
  const minValue = Math.min(...provinces.map(p => p.valeurFonciereParcelleUsd));

  // Grouped by zone
  const zoneData = ['Urbaine', 'Semi-urbaine', 'Rurale', 'Mixte'].map(zone => {
    const zoneProvinces = provinces.filter(p => p.zone === zone);
    if (zoneProvinces.length === 0) return null;
    return {
      zone,
      avgValue: Math.round(zoneProvinces.reduce((s, p) => s + p.valeurFonciereParcelleUsd, 0) / zoneProvinces.length),
      avgPrixM2: Math.round(zoneProvinces.reduce((s, p) => s + p.prixMoyenVenteM2, 0) / zoneProvinces.length),
      count: zoneProvinces.length
    };
  }).filter(Boolean);

  return (
    <div className="space-y-1 charts-compact">
      {/* Valeur foncière par province */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-1 text-xs">
            <MapPin className="h-2.5 w-2.5 text-primary" />
            Valeur foncière moyenne par parcelle (USD)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 60 }} barSize={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} angle={-45} textAnchor="end" height={50} interval={0} />
              <YAxis yAxisId="left" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '11px' }}
                formatter={(value: number, name: string) => [
                  `$${value.toLocaleString()}`,
                  name === 'valeur' ? 'Valeur parcelle' : 'Prix/m²'
                ]}
                labelFormatter={(_, payload: any[]) => payload?.[0]?.payload?.fullName || ''}
              />
              <Bar yAxisId="left" dataKey="valeur" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={
                    entry.valeur > 10000 ? 'hsl(var(--primary))' :
                    entry.valeur > 5000 ? 'hsl(var(--accent))' :
                    'hsl(var(--muted-foreground))'
                  } />
                ))}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="prixM2" stroke="hsl(var(--destructive))" strokeWidth={1.5} dot={{ r: 2 }} name="prixM2" />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="mt-2 p-1.5 bg-muted/20 rounded">
            <div className="flex items-start gap-1">
              <Info className="h-2.5 w-2.5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-[10px] text-foreground/80 leading-tight">
                <span className="font-medium">Barres : </span>valeur foncière/parcelle •{' '}
                <span className="font-medium" style={{ color: 'hsl(var(--destructive))' }}>Ligne : </span>prix de vente/m²
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Par zone */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs">Moyenne par type de zone</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1">
            {zoneData.map((z: any, i) => (
              <div key={i} className="flex items-center justify-between p-1.5 rounded border text-[9px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded" style={{ backgroundColor: z.zone === 'Urbaine' ? 'hsl(var(--primary))' : z.zone === 'Semi-urbaine' ? 'hsl(var(--accent))' : 'hsl(var(--muted-foreground))' }} />
                  <span className="font-medium">{z.zone}</span>
                  <span className="text-muted-foreground">({z.count} prov.)</span>
                </div>
                <div className="text-right">
                  <span className="font-bold">${z.avgValue.toLocaleString()}</span>
                  <span className="text-muted-foreground ml-1">({z.avgPrixM2}$/m²)</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats globales */}
      <div className="grid grid-cols-3 gap-1">
        <Card className="p-2 text-center">
          <div className="text-xs font-bold text-primary">${(avgValue / 1000).toFixed(1)}k</div>
          <div className="text-[8px] text-muted-foreground">Moy. nationale</div>
        </Card>
        <Card className="p-2 text-center">
          <div className="text-xs font-bold">${(maxValue / 1000).toFixed(0)}k</div>
          <div className="text-[8px] text-muted-foreground">Maximum</div>
        </Card>
        <Card className="p-2 text-center">
          <div className="text-xs font-bold text-muted-foreground">${(minValue / 1000).toFixed(1)}k</div>
          <div className="text-[8px] text-muted-foreground">Minimum</div>
        </Card>
      </div>

      {selectedProvince && (
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs">Focus : {selectedProvince.name}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <div className="p-2 bg-muted/20 rounded text-center">
                <div className="text-muted-foreground text-[9px]">Val. parcelle</div>
                <div className="font-bold text-primary">${selectedProvince.valeurFonciereParcelleUsd.toLocaleString()}</div>
              </div>
              <div className="p-2 bg-muted/20 rounded text-center">
                <div className="text-muted-foreground text-[9px]">Prix/m²</div>
                <div className="font-bold">${selectedProvince.prixMoyenVenteM2}</div>
              </div>
              <div className="p-2 bg-muted/20 rounded text-center">
                <div className="text-muted-foreground text-[9px]">Zone</div>
                <div className="font-bold">{selectedProvince.zone}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

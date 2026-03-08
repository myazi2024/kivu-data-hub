import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ProvinceData } from '@/types/province';
import { Users, Info } from 'lucide-react';

interface OwnershipRateVisualizationProps {
  provinces: ProvinceData[];
  selectedProvince?: ProvinceData | null;
}

export const OwnershipRateVisualization: React.FC<OwnershipRateVisualizationProps> = ({
  provinces,
  selectedProvince
}) => {
  const sortedByOwnership = [...provinces]
    .filter(p => p.tauxPropriete !== undefined)
    .sort((a, b) => (b.tauxPropriete || 0) - (a.tauxPropriete || 0));

  const chartData = sortedByOwnership.map(p => ({
    name: p.name.length > 10 ? p.name.substring(0, 9) + '…' : p.name,
    fullName: p.name,
    propriete: p.tauxPropriete || 0,
    location: 100 - (p.tauxPropriete || 0),
    zone: p.zone
  }));

  const avgOwnership = provinces.reduce((sum, p) => sum + (p.tauxPropriete || 0), 0) / provinces.length;

  const categories = [
    { range: '> 80%', count: provinces.filter(p => (p.tauxPropriete || 0) > 80).length, label: 'Très propriétaire', color: 'hsl(142, 71%, 45%)' },
    { range: '60-80%', count: provinces.filter(p => (p.tauxPropriete || 0) > 60 && (p.tauxPropriete || 0) <= 80).length, label: 'Propriétaire', color: 'hsl(var(--primary))' },
    { range: '40-60%', count: provinces.filter(p => (p.tauxPropriete || 0) > 40 && (p.tauxPropriete || 0) <= 60).length, label: 'Mixte', color: 'hsl(var(--warning))' },
    { range: '< 40%', count: provinces.filter(p => (p.tauxPropriete || 0) <= 40).length, label: 'Locataire', color: 'hsl(var(--destructive))' },
  ];

  const getBarColor = (rate: number) => {
    if (rate > 80) return 'hsl(142, 71%, 45%)';
    if (rate > 60) return 'hsl(var(--primary))';
    if (rate > 40) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  return (
    <div className="space-y-1 charts-compact">
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-1 text-xs">
            <Users className="h-2.5 w-2.5 text-primary" />
            Taux de propriété par province
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 60 }} barSize={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} angle={-45} textAnchor="end" height={50} interval={0} />
              <YAxis tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '11px' }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Propriété']}
                labelFormatter={(_, payload: any[]) => payload?.[0]?.payload?.fullName || ''}
              />
              <Bar dataKey="propriete" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.propriete)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-2 p-1.5 bg-muted/20 rounded">
            <div className="flex items-start gap-1">
              <Info className="h-2.5 w-2.5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-[10px] text-foreground/80 leading-tight">
                <span className="font-medium">Interprétation : </span>
                Un taux élevé ({">"} 80%) indique un marché dominé par la propriété privée. Un taux bas ({"<"} 40%) signale un marché locatif dynamique.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-1">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs">Répartition par catégorie</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {categories.map((cat, i) => (
                <div key={i} className="flex items-center justify-between p-1 rounded border text-[8px]">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded" style={{ backgroundColor: cat.color }} />
                    <span className="font-medium">{cat.range}</span>
                    <span className="text-muted-foreground">({cat.label})</span>
                  </div>
                  <span className="text-muted-foreground">{cat.count} prov.</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-center p-1.5 bg-primary/5 rounded">
              <div className="text-sm font-bold text-primary">{avgOwnership.toFixed(1)}%</div>
              <div className="text-[8px] text-muted-foreground">Moyenne nationale</div>
            </div>
          </CardContent>
        </Card>

        {selectedProvince && selectedProvince.tauxPropriete !== undefined && (
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs">Focus : {selectedProvince.name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-muted/20 rounded text-center">
                  <div className="text-muted-foreground">Propriétaires</div>
                  <div className="font-bold text-primary">{selectedProvince.tauxPropriete}%</div>
                </div>
                <div className="p-2 bg-muted/20 rounded text-center">
                  <div className="text-muted-foreground">Locataires</div>
                  <div className="font-bold">{(100 - selectedProvince.tauxPropriete).toFixed(1)}%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

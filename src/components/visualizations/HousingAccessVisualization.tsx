import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';
import { ProvinceData } from '@/types/province';
import { Home, Info, TrendingUp } from 'lucide-react';

interface HousingAccessVisualizationProps {
  provinces: ProvinceData[];
  selectedProvince?: ProvinceData | null;
}

export const HousingAccessVisualization: React.FC<HousingAccessVisualizationProps> = ({
  provinces,
  selectedProvince
}) => {
  const withAccess = provinces.filter(p => p.tauxAccessibiliteLogement !== undefined);
  const sorted = [...withAccess].sort((a, b) => (a.tauxAccessibiliteLogement || 0) - (b.tauxAccessibiliteLogement || 0));

  const chartData = sorted.map(p => ({
    name: p.name.length > 10 ? p.name.substring(0, 9) + '…' : p.name,
    fullName: p.name,
    accessibilite: p.tauxAccessibiliteLogement || 0,
    loyer: p.prixMoyenLoyer,
    croissance: p.tauxCroissancePrixAnnuel || 0,
    zone: p.zone
  }));

  const avgAccess = withAccess.reduce((s, p) => s + (p.tauxAccessibiliteLogement || 0), 0) / withAccess.length;

  // Scatter: accessibilité vs prix
  const scatterData = withAccess.map(p => ({
    x: p.prixMoyenLoyer,
    y: p.tauxAccessibiliteLogement || 0,
    z: p.populationLocativeEstimee / 10000,
    name: p.name
  }));

  const getColor = (rate: number) => {
    if (rate >= 70) return 'hsl(142, 71%, 45%)';
    if (rate >= 50) return 'hsl(var(--primary))';
    if (rate >= 35) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  return (
    <div className="space-y-1 charts-compact">
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-1 text-xs">
            <Home className="h-2.5 w-2.5 text-primary" />
            Accessibilité au logement par province
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
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Accessibilité']}
                labelFormatter={(_, payload: any[]) => payload?.[0]?.payload?.fullName || ''}
              />
              <Bar dataKey="accessibilite" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(entry.accessibilite)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-2 p-1.5 bg-muted/20 rounded">
            <div className="flex items-start gap-1">
              <Info className="h-2.5 w-2.5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-[10px] text-foreground/80 leading-tight">
                <span className="font-medium">Interprétation : </span>
                <span style={{ color: 'hsl(142, 71%, 45%)' }}>≥70%</span> accessible,{' '}
                <span style={{ color: 'hsl(var(--warning))' }}>35-50%</span> tendu,{' '}
                <span style={{ color: 'hsl(var(--destructive))' }}>{"<"}35%</span> critique
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Croissance des prix */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-1 text-xs">
            <TrendingUp className="h-2.5 w-2.5 text-primary" />
            Croissance annuelle des prix
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={[...chartData].sort((a, b) => b.croissance - a.croissance).slice(0, 12)} margin={{ top: 10, right: 0, left: 0, bottom: 60 }} barSize={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} angle={-45} textAnchor="end" height={50} interval={0} />
              <YAxis tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '11px' }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Croissance']}
                labelFormatter={(_, payload: any[]) => payload?.[0]?.payload?.fullName || ''}
              />
              <Bar dataKey="croissance" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]}>
                {[...chartData].sort((a, b) => b.croissance - a.croissance).slice(0, 12).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.croissance > 3 ? 'hsl(var(--destructive))' : entry.croissance > 2 ? 'hsl(var(--warning))' : 'hsl(var(--primary))'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1">
        <Card className="p-2 text-center">
          <div className="text-xs font-bold text-primary">{avgAccess.toFixed(0)}%</div>
          <div className="text-[8px] text-muted-foreground">Moy. nationale</div>
        </Card>
        <Card className="p-2 text-center">
          <div className="text-xs font-bold" style={{ color: 'hsl(var(--destructive))' }}>
            {withAccess.filter(p => (p.tauxAccessibiliteLogement || 0) < 40).length}
          </div>
          <div className="text-[8px] text-muted-foreground">Prov. critiques</div>
        </Card>
        <Card className="p-2 text-center">
          <div className="text-xs font-bold" style={{ color: 'hsl(142, 71%, 45%)' }}>
            {withAccess.filter(p => (p.tauxAccessibiliteLogement || 0) >= 70).length}
          </div>
          <div className="text-[8px] text-muted-foreground">Prov. accessibles</div>
        </Card>
      </div>

      {selectedProvince && selectedProvince.tauxAccessibiliteLogement !== undefined && (
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs">Focus : {selectedProvince.name}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <div className="p-2 bg-muted/20 rounded text-center">
                <div className="text-muted-foreground text-[9px]">Accessibilité</div>
                <div className="font-bold text-primary">{selectedProvince.tauxAccessibiliteLogement}%</div>
              </div>
              <div className="p-2 bg-muted/20 rounded text-center">
                <div className="text-muted-foreground text-[9px]">Croissance</div>
                <div className="font-bold">{selectedProvince.tauxCroissancePrixAnnuel || 0}%/an</div>
              </div>
              <div className="p-2 bg-muted/20 rounded text-center">
                <div className="text-muted-foreground text-[9px]">Permis/mois</div>
                <div className="font-bold">{selectedProvince.permisConstruireMois || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

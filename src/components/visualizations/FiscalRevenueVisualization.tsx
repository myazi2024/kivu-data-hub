import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { ProvinceData } from '@/types/province';
import { DollarSign, Info } from 'lucide-react';

interface FiscalRevenueVisualizationProps {
  provinces: ProvinceData[];
  selectedProvince?: ProvinceData | null;
}

export const FiscalRevenueVisualization: React.FC<FiscalRevenueVisualizationProps> = ({
  provinces,
  selectedProvince
}) => {
  const sortedByRevenue = [...provinces]
    .sort((a, b) => b.recettesFiscalesUsd - a.recettesFiscalesUsd)
    .slice(0, 15);

  const totalFiscal = provinces.reduce((sum, p) => sum + p.recettesFiscalesUsd, 0);
  const totalLocatif = provinces.reduce((sum, p) => sum + p.recettesLocativesUsd, 0);

  const revenueComparison = sortedByRevenue.map(p => ({
    name: p.name.length > 10 ? p.name.substring(0, 9) + '…' : p.name,
    fullName: p.name,
    fiscal: p.recettesFiscalesUsd,
    locatif: p.recettesLocativesUsd,
    ratio: p.recettesFiscalesUsd > 0 ? ((p.recettesFiscalesUsd / p.recettesLocativesUsd) * 100).toFixed(1) : 0
  }));

  const pieData = [
    { name: 'Recettes fiscales', value: totalFiscal, color: 'hsl(var(--primary))' },
    { name: 'Recettes locatives', value: totalLocatif, color: 'hsl(var(--accent))' }
  ];

  return (
    <div className="space-y-1 charts-compact">
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-1 text-xs">
            <DollarSign className="h-2.5 w-2.5 text-primary" />
            Recettes fiscales vs locatives (Top 15)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={revenueComparison} margin={{ top: 10, right: 0, left: 0, bottom: 60 }} barSize={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} angle={-45} textAnchor="end" height={50} interval={0} />
              <YAxis tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '11px' }}
                formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name === 'fiscal' ? 'Fiscal' : 'Locatif']}
                labelFormatter={(label: string, payload: any[]) => payload?.[0]?.payload?.fullName || label}
              />
              <Bar dataKey="fiscal" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="fiscal" />
              <Bar dataKey="locatif" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} name="locatif" />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-2 p-1.5 bg-muted/20 rounded">
            <div className="flex items-start gap-1">
              <Info className="h-2.5 w-2.5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-[10px] text-foreground/80 leading-tight">
                <span className="font-medium">Interprétation : </span>
                Le ratio fiscal/locatif indique l'efficacité de la collecte fiscale. Un faible ratio peut signaler un potentiel fiscal inexploité.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Totaux agrégés */}
      <div className="grid grid-cols-3 gap-1">
        <Card className="p-2 text-center">
          <div className="text-xs font-bold text-primary">${(totalFiscal / 1000).toFixed(0)}k</div>
          <div className="text-[8px] text-muted-foreground">Fiscal total</div>
        </Card>
        <Card className="p-2 text-center">
          <div className="text-xs font-bold text-accent-foreground">${(totalLocatif / 1000).toFixed(0)}k</div>
          <div className="text-[8px] text-muted-foreground">Locatif total</div>
        </Card>
        <Card className="p-2 text-center">
          <div className="text-xs font-bold text-foreground">{((totalFiscal / totalLocatif) * 100).toFixed(1)}%</div>
          <div className="text-[8px] text-muted-foreground">Ratio F/L</div>
        </Card>
      </div>

      {selectedProvince && (
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs">Focus : {selectedProvince.name}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-muted/20 rounded text-center">
                <div className="text-muted-foreground">Fiscal</div>
                <div className="font-bold text-primary">${selectedProvince.recettesFiscalesUsd.toLocaleString()}</div>
              </div>
              <div className="p-2 bg-muted/20 rounded text-center">
                <div className="text-muted-foreground">Locatif</div>
                <div className="font-bold">${selectedProvince.recettesLocativesUsd.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

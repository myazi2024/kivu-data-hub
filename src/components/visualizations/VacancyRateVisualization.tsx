import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts';
import { ProvinceData } from '@/types/province';
import { Home, Info } from 'lucide-react';

interface VacancyRateVisualizationProps {
  provinces: ProvinceData[];
  selectedProvince?: ProvinceData | null;
}

export const VacancyRateVisualization: React.FC<VacancyRateVisualizationProps> = ({
  provinces,
  selectedProvince
}) => {
  // Préparer les données pour l'histogramme comparatif
  const sortedProvinces = [...provinces]
    .sort((a, b) => b.tauxVacanceLocative - a.tauxVacanceLocative)
    .slice(0, 8);

  // Données pour la carte choroplèthe (simulée avec des catégories)
  const vacancyCategories = [
    { range: '0-15%', count: provinces.filter(p => p.tauxVacanceLocative <= 15).length, color: '#22c55e' },
    { range: '15-25%', count: provinces.filter(p => p.tauxVacanceLocative > 15 && p.tauxVacanceLocative <= 25).length, color: '#eab308' },
    { range: '25-35%', count: provinces.filter(p => p.tauxVacanceLocative > 25 && p.tauxVacanceLocative <= 35).length, color: '#f97316' },
    { range: '>35%', count: provinces.filter(p => p.tauxVacanceLocative > 35).length, color: '#ef4444' }
  ];

  const formatTooltip = (value: any, name: string) => {
    if (name === 'tauxVacanceLocative') {
      return [`${value.toFixed(1)}%`, 'Taux'];
    }
    return [value, name];
  };

  return (
    <div className="space-y-2">
      {/* Histogramme des taux de vacance par province */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-1 text-xs">
            <Home className="h-2.5 w-2.5 text-primary" />
            Taux de Vacance par Province
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={sortedProvinces} margin={{ top: 5, right: 5, left: 5, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 6, fill: 'hsl(var(--muted-foreground))' }}
                angle={-45}
                textAnchor="end"
                height={20}
                interval={0}
              />
              <YAxis 
                tick={{ fontSize: 6, fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: '%', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '6px' } }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '4px',
                  fontSize: '8px'
                }}
                formatter={formatTooltip}
              />
              <Bar 
                dataKey="tauxVacanceLocative"
                fill="#3b82f6"
                radius={[1, 1, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          
          <div className="mt-1 p-1 bg-muted/20 rounded">
            <div className="flex items-start gap-1">
              <Info className="h-2 w-2 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-[7px] text-foreground/80 leading-tight">
                <span className="font-medium">Interprétation: </span>
                <span className="text-green-600">0-15%</span> tendu, 
                <span className="text-yellow-600"> 15-25%</span> équilibré, 
                <span className="text-orange-600"> 25-35%</span> excédentaire, 
                <span className="text-red-600"> {'>'} 35%</span> saturé
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Répartition par catégories */}
      <div className="grid grid-cols-1 gap-1">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs">Répartition par Niveau</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {vacancyCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-1 rounded border text-[8px]">
                  <div className="flex items-center gap-1">
                    <div 
                      className="w-2 h-2 rounded" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium">{category.range}</span>
                  </div>
                  <span className="text-muted-foreground">{category.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Détail province sélectionnée */}
        {selectedProvince && (
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs">Focus: {selectedProvince.name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                <div className="text-center p-2 bg-muted/30 rounded">
                  <div className="text-lg font-bold text-primary">
                    {selectedProvince.tauxVacanceLocative.toFixed(1)}%
                  </div>
                  <div className="text-[7px] text-muted-foreground">Taux actuel</div>
                </div>
                
                <div className="grid grid-cols-2 gap-1 text-[7px]">
                  <div className="p-1 bg-muted/20 rounded">
                    <div className="text-muted-foreground">Occupation</div>
                    <div className="text-green-600 font-semibold">
                      {selectedProvince.tauxOccupationLocatif.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-1 bg-muted/20 rounded">
                    <div className="text-muted-foreground">Durée</div>
                    <div className="font-semibold">
                      {selectedProvince.dureeMoyenneMiseLocationJours}j
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
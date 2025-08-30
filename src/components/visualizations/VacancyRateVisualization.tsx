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
    .slice(0, 10);

  // Données pour la carte choroplèthe (simulée avec des catégories)
  const vacancyCategories = [
    { range: '0-15%', count: provinces.filter(p => p.tauxVacanceLocative <= 15).length, color: '#22c55e' },
    { range: '15-25%', count: provinces.filter(p => p.tauxVacanceLocative > 15 && p.tauxVacanceLocative <= 25).length, color: '#eab308' },
    { range: '25-35%', count: provinces.filter(p => p.tauxVacanceLocative > 25 && p.tauxVacanceLocative <= 35).length, color: '#f97316' },
    { range: '>35%', count: provinces.filter(p => p.tauxVacanceLocative > 35).length, color: '#ef4444' }
  ];

  const formatTooltip = (value: any, name: string) => {
    if (name === 'tauxVacanceLocative') {
      return [`${value.toFixed(1)}%`, 'Taux de vacance'];
    }
    return [value, name];
  };

  const getVacancyColor = (rate: number) => {
    if (rate <= 15) return '#22c55e'; // Vert - faible vacance
    if (rate <= 25) return '#eab308'; // Jaune - vacance modérée
    if (rate <= 35) return '#f97316'; // Orange - vacance élevée
    return '#ef4444'; // Rouge - vacance très élevée
  };

  return (
    <div className="space-y-6">
      {/* Histogramme des taux de vacance par province */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Home className="h-4 w-4 text-primary" />
            Taux de Vacance par Province
            <span className="text-sm font-normal text-muted-foreground">(Top 10)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sortedProvinces} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                angle={-45}
                textAnchor="end"
                height={70}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Taux de vacance (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
                formatter={formatTooltip}
              />
              <Bar 
                dataKey="tauxVacanceLocative"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          
          <div className="mt-4 p-3 bg-muted/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-xs text-foreground/80 leading-relaxed">
                <p className="font-medium mb-1">Interprétation du taux de vacance locative :</p>
                <ul className="space-y-1 ml-2">
                  <li>• <span className="text-green-600 font-medium">0-15%</span> : Marché tendu, forte demande</li>
                  <li>• <span className="text-yellow-600 font-medium">15-25%</span> : Marché équilibré</li>
                  <li>• <span className="text-orange-600 font-medium">25-35%</span> : Offre excédentaire</li>
                  <li>• <span className="text-red-600 font-medium">{'>'} 35%</span> : Marché saturé</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Répartition par catégories de vacance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition des Provinces par Niveau de Vacance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vacancyCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm font-medium">{category.range}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{category.count}</div>
                    <div className="text-xs text-muted-foreground">
                      {((category.count / provinces.length) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Détail province sélectionnée */}
        {selectedProvince && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Focus : {selectedProvince.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <div className="text-3xl font-bold text-primary">
                    {selectedProvince.tauxVacanceLocative.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Taux de vacance actuel</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2 bg-muted/20 rounded">
                    <div className="font-medium text-muted-foreground">Taux d'occupation</div>
                    <div className="text-green-600 font-semibold">
                      {selectedProvince.tauxOccupationLocatif.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-2 bg-muted/20 rounded">
                    <div className="font-medium text-muted-foreground">Durée de location</div>
                    <div className="font-semibold">
                      {selectedProvince.dureeMoyenneMiseLocationJours} jours
                    </div>
                  </div>
                  <div className="p-2 bg-muted/20 rounded">
                    <div className="font-medium text-muted-foreground">Population locative</div>
                    <div className="font-semibold text-blue-600">
                      {(selectedProvince.populationLocativeEstimee / 1000).toFixed(0)}k hab.
                    </div>
                  </div>
                  <div className="p-2 bg-muted/20 rounded">
                    <div className="font-medium text-muted-foreground">Volume annonces</div>
                    <div className="font-semibold">
                      {selectedProvince.volumeAnnoncesImmobilieres.toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="text-xs font-medium text-primary mb-1">Utilité pour les acteurs :</div>
                  <ul className="text-xs text-foreground/80 space-y-1">
                    <li>• <strong>Investisseurs</strong> : Évaluer la rentabilité potentielle</li>
                    <li>• <strong>Promoteurs</strong> : Identifier les opportunités de développement</li>
                    <li>• <strong>Pouvoirs publics</strong> : Orienter les politiques de logement</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
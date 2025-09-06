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
  ScatterChart,
  Scatter,
  ComposedChart,
  Area
} from 'recharts';
import { ProvinceData } from '@/types/province';
import { DollarSign, TrendingUp, Calculator, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RentalYieldVisualizationProps {
  provinces: ProvinceData[];
  selectedProvince?: ProvinceData | null;
}

export const RentalYieldVisualization: React.FC<RentalYieldVisualizationProps> = ({
  provinces,
  selectedProvince
}) => {
  // Calculer et enrichir les données de rendement
  const enrichedProvinces = provinces.map(province => {
    // Calcul du rendement locatif brut : (Loyer annuel / Prix d'achat) * 100
    const rendementBrut = (province.prixMoyenLoyer * 12 / province.prixMoyenVenteM2) * 100;
    
    // Rendement net estimé (brut - charges estimées à 20%)
    const rendementNet = rendementBrut * 0.8;
    
    // Classification du rendement
    let categorieRendement = 'Faible';
    if (rendementBrut >= 8) categorieRendement = 'Excellent';
    else if (rendementBrut >= 6) categorieRendement = 'Bon';
    else if (rendementBrut >= 4) categorieRendement = 'Moyen';
    
    return {
      ...province,
      rendementBrut: Number(rendementBrut.toFixed(2)),
      rendementNet: Number(rendementNet.toFixed(2)),
      categorieRendement,
      ratioLoyer: province.prixMoyenLoyer / province.prixMoyenVenteM2,
      potentielInvestissement: rendementBrut * (100 - province.tauxVacanceLocative) / 100
    };
  });

  // Top provinces par rendement
  const topRendementProvinces = [...enrichedProvinces]
    .sort((a, b) => b.rendementBrut - a.rendementBrut)
    .slice(0, 10);

  // Répartition par catégorie de rendement
  const rendementCategories = [
    { 
      categorie: 'Excellent (≥8%)', 
      count: enrichedProvinces.filter(p => p.rendementBrut >= 8).length,
      color: '#22c55e'
    },
    { 
      categorie: 'Bon (6-8%)', 
      count: enrichedProvinces.filter(p => p.rendementBrut >= 6 && p.rendementBrut < 8).length,
      color: '#3b82f6'
    },
    { 
      categorie: 'Moyen (4-6%)', 
      count: enrichedProvinces.filter(p => p.rendementBrut >= 4 && p.rendementBrut < 6).length,
      color: '#f59e0b'
    },
    { 
      categorie: 'Faible (<4%)', 
      count: enrichedProvinces.filter(p => p.rendementBrut < 4).length,
      color: '#ef4444'
    }
  ];

  // Données de corrélation rendement vs prix
  const correlationData = enrichedProvinces.map(province => ({
    name: province.name.substring(0, 8),
    prixVente: province.prixMoyenVenteM2,
    rendement: province.rendementBrut,
    tauxVacance: province.tauxVacanceLocative
  }));

  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;
  const formatCurrency = (value: number) => `$${Math.round(value)}`;

  const formatTooltip = (value: any, name: string) => {
    if (name === 'rendementBrut') return [formatPercentage(value), 'Rendement brut'];
    if (name === 'rendementNet') return [formatPercentage(value), 'Rendement net'];
    if (name === 'prixVente') return [formatCurrency(value), 'Prix vente/m²'];
    if (name === 'rendement') return [formatPercentage(value), 'Rendement'];
    if (name === 'tauxVacance') return [formatPercentage(value), 'Taux vacance'];
    return [value, name];
  };

  return (
    <div className="space-y-6">
      {/* Rendement par province */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-primary" />
            Rendement Locatif Brut par Province
            <span className="text-sm font-normal text-muted-foreground">(Top 10)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={topRendementProvinces} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
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
                label={{ value: 'Rendement (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
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
                dataKey="rendementBrut" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="rendementNet" 
                fill="hsl(var(--primary) / 0.6)"
                radius={[4, 4, 0, 0]}
              />
            </ComposedChart>
          </ResponsiveContainer>
          
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-primary rounded"></div>
              <span>Rendement brut (avant charges)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-primary/60 rounded"></div>
              <span>Rendement net (après charges estimées)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analyse de corrélation et répartition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Corrélation prix vs rendement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Corrélation Prix-Rendement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart data={correlationData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  type="number" 
                  dataKey="prixVente" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: 'Prix vente (USD/m²)', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="rendement"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: 'Rendement (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
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
                <Scatter 
                  dataKey="rendement" 
                  fill="hsl(var(--accent))"
                />
              </ScatterChart>
            </ResponsiveContainer>
            
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Observation :</strong> Généralement, plus les prix d'achat sont élevés, plus les rendements locatifs diminuent. 
                Les provinces rurales offrent souvent de meilleurs rendements.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Répartition par catégorie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4 text-green-600" />
              Répartition par Niveau de Rendement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rendementCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm font-medium">{category.categorie}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{category.count} provinces</div>
                    <div className="text-xs text-muted-foreground">
                      {((category.count / provinces.length) * 100).toFixed(0)}% du total
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-700 dark:text-green-300 font-medium mb-1">
                Recommandations d'investissement :
              </p>
              <ul className="text-xs text-green-600 dark:text-green-200 space-y-1">
                <li>• <strong>≥8%</strong> : Très attractif pour investisseurs</li>
                <li>• <strong>6-8%</strong> : Équilibre rentabilité/sécurité</li>
                <li>• <strong>4-6%</strong> : Acceptable selon profil risque</li>
                <li>• <strong>&lt;4%</strong> : Privilégier plus-values foncières</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Détail province sélectionnée */}
      {selectedProvince && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Analyse Rendement : {selectedProvince.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const provinceData = enrichedProvinces.find(p => p.id === selectedProvince.id);
              if (!provinceData) return null;

              return (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="text-3xl font-bold text-primary">
                      {formatPercentage(provinceData.rendementBrut)}
                    </div>
                    <div className="text-sm text-muted-foreground">Rendement brut</div>
                    <Badge 
                      variant={
                        provinceData.rendementBrut >= 8 ? 'default' :
                        provinceData.rendementBrut >= 6 ? 'secondary' :
                        provinceData.rendementBrut >= 4 ? 'outline' : 'destructive'
                      }
                      className="mt-2 text-xs"
                    >
                      {provinceData.categorieRendement}
                    </Badge>
                  </div>
                  
                  <div className="text-center p-4 bg-accent/10 rounded-lg border border-accent/20">
                    <div className="text-2xl font-bold text-accent">
                      {formatPercentage(provinceData.rendementNet)}
                    </div>
                    <div className="text-sm text-muted-foreground">Rendement net estimé</div>
                    <div className="text-xs text-muted-foreground mt-1">(après charges 20%)</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="p-2 bg-muted/20 rounded text-xs">
                      <div className="font-medium text-muted-foreground">Loyer mensuel/m²</div>
                      <div className="font-semibold">{formatCurrency(selectedProvince.prixMoyenLoyer)}</div>
                    </div>
                    <div className="p-2 bg-muted/20 rounded text-xs">
                      <div className="font-medium text-muted-foreground">Prix achat/m²</div>
                      <div className="font-semibold">{formatCurrency(selectedProvince.prixMoyenVenteM2)}</div>
                    </div>
                    <div className="p-2 bg-muted/20 rounded text-xs">
                      <div className="font-medium text-muted-foreground">Taux vacance</div>
                      <div className="font-semibold">{formatPercentage(selectedProvince.tauxVacanceLocative)}</div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                      Calcul du rendement :
                    </div>
                    <div className="text-xs text-yellow-600 dark:text-yellow-200 space-y-1">
                      <div>Loyer annuel : {formatCurrency(selectedProvince.prixMoyenLoyer * 12)}</div>
                      <div>÷ Prix achat : {formatCurrency(selectedProvince.prixMoyenVenteM2)}</div>
                      <div className="font-semibold">= {formatPercentage(provinceData.rendementBrut)}</div>
                      <div className="mt-2 pt-2 border-t border-yellow-300 dark:border-yellow-700">
                        <strong>Potentiel ajusté :</strong> {formatPercentage(provinceData.potentielInvestissement)}
                        <br />
                        <span className="text-xs">(rendement × taux occupation)</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            
            <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                Applications métier du rendement locatif :
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-purple-600 dark:text-purple-200">
                <ul className="space-y-1">
                  <li>• <strong>Investisseurs</strong> : Comparaison inter-régionale des opportunités</li>
                  <li>• <strong>Conseillers patrimoniaux</strong> : Recommandations clients</li>
                </ul>
                <ul className="space-y-1">
                  <li>• <strong>Banques</strong> : Évaluation risque crédit immobilier</li>
                  <li>• <strong>Gestionnaires</strong> : Optimisation portefeuilles locatifs</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
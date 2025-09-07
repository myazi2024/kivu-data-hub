import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
  ComposedChart,
  Line
} from 'recharts';
import { ProvinceData } from '@/types/province';
import { Map, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LandPressureVisualizationProps {
  provinces: ProvinceData[];
  selectedProvince?: ProvinceData | null;
}

export const LandPressureVisualization: React.FC<LandPressureVisualizationProps> = ({
  provinces,
  selectedProvince
}) => {
  // Enrichir les données avec l'indice de pression foncière calculé
  const enrichedProvinces = provinces.map(province => {
    // Calcul de l'indice basé sur plusieurs facteurs
    const demandeFactor = (100 - province.tauxVacanceLocative) / 100;
    const prixFactor = province.prixMoyenVenteM2 / 500; // Normalisation
    const populationFactor = province.populationLocativeEstimee / 100000;
    const transactionFactor = province.nombreTransactionsEstimees / 1000;
    
    const indicePression = Math.min(
      (demandeFactor * 0.3 + prixFactor * 0.3 + populationFactor * 0.2 + transactionFactor * 0.2),
      5
    );
    
    // Classification de la pression
    let niveauPression = 'Faible';
    let couleurPression = 'hsl(var(--success))';
    if (indicePression >= 2.5) {
      niveauPression = 'Très élevé';
      couleurPression = 'hsl(var(--destructive))';
    } else if (indicePression >= 2) {
      niveauPression = 'Élevé';
      couleurPression = 'hsl(var(--accent))';
    } else if (indicePression >= 1.5) {
      niveauPression = 'Modéré';
      couleurPression = 'hsl(var(--warning))';
    }
    
    return {
      ...province,
      indicePressionCalcule: Number(indicePression.toFixed(2)),
      niveauPression,
      couleurPression,
      ratioDemandeOffre: Number((province.nombreTransactionsEstimees / province.volumeAnnoncesImmobilieres).toFixed(2))
    };
  });

  // Données pour l'évolution temporelle simulée
  const generatePressureEvolution = () => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const avgPressure = enrichedProvinces.reduce((sum, p) => sum + p.indicePressionCalcule, 0) / enrichedProvinces.length;
    
    return months.map((month, index) => {
      // Simulation d'évolution avec tendance croissante
      const seasonalVariation = Math.sin(index / 12 * 2 * Math.PI) * 0.2;
      const trend = index * 0.02;
      
      return {
        month,
        pressionMoyenne: Number((avgPressure + seasonalVariation + trend).toFixed(2)),
        demandeOffre: Number((avgPressure * 0.8 + seasonalVariation + trend).toFixed(2)),
        zonesTondues: Math.max(0, Math.round(enrichedProvinces.filter(p => p.indicePressionCalcule > 2).length + seasonalVariation * 2))
      };
    });
  };

  const topPressureProvinces = [...enrichedProvinces]
    .sort((a, b) => b.indicePressionCalcule - a.indicePressionCalcule);

  // Répartition par niveau de pression
  const pressureDistribution = [
    { 
      niveau: 'Faible', 
      count: enrichedProvinces.filter(p => p.indicePressionCalcule < 1.5).length,
      color: 'hsl(var(--success))',
      seuil: '< 1.5'
    },
    { 
      niveau: 'Modéré', 
      count: enrichedProvinces.filter(p => p.indicePressionCalcule >= 1.5 && p.indicePressionCalcule < 2).length,
      color: 'hsl(var(--warning))',
      seuil: '1.5 - 2.0'
    },
    { 
      niveau: 'Élevé', 
      count: enrichedProvinces.filter(p => p.indicePressionCalcule >= 2 && p.indicePressionCalcule < 2.5).length,
      color: 'hsl(var(--accent))',
      seuil: '2.0 - 2.5'
    },
    { 
      niveau: 'Très élevé', 
      count: enrichedProvinces.filter(p => p.indicePressionCalcule >= 2.5).length,
      color: 'hsl(var(--destructive))',
      seuil: '≥ 2.5'
    }
  ];

  // Corrélation pression vs prix
  const correlationData = enrichedProvinces.map(province => ({
    name: province.name.substring(0, 8),
    pression: province.indicePressionCalcule,
    prix: province.prixMoyenVenteM2,
    population: province.populationLocativeEstimee / 1000
  }));

  const evolutionData = generatePressureEvolution();

  const formatTooltip = (value: any, name: string) => {
    if (name === 'pression') return [value, 'Indice pression'];
    if (name === 'pressionMoyenne') return [value, 'Pression moyenne'];
    if (name === 'prix') return [`$${Math.round(value)}`, 'Prix/m²'];
    if (name === 'indicePressionCalcule') return [value, 'Indice pression'];
    if (name === 'population') return [`${value}k hab.`, 'Population'];
    return [value, name];
  };

  return (
    <div className="space-y-2 charts-compact">
      {/* Évolution temporelle de la pression */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs sm:text-sm">
            <TrendingUp className="h-4 w-4 text-primary" />
            Évolution de la Pression Foncière RDC
            <span className="text-sm font-normal text-muted-foreground">(Tendance 2024)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={evolutionData} margin={{ top: 20, right: 0, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
               <YAxis 
                yAxisId="left"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Indice de pression', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                width={60}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Zones tendues', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }}
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
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="pressionMoyenne"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.3)"
                strokeWidth={2}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="zonesTondues" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2, r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          
          <div className="mt-4 p-3 bg-muted/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-xs text-foreground/80 leading-relaxed">
                <p className="font-medium mb-1">Méthodologie de calcul de l'indice :</p>
                <ul className="space-y-1 ml-2">
                  <li>• <strong>Demande (30%)</strong> : Taux d'occupation locatif</li>
                  <li>• <strong>Prix (30%)</strong> : Niveau des prix de vente</li>
                  <li>• <strong>Population (20%)</strong> : Densité démographique</li>
                  <li>• <strong>Activité (20%)</strong> : Volume transactionnel</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Répartition et top provinces */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution de la pression */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Répartition par Niveau de Pression
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pressureDistribution.map((level, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: level.color }}
                    />
                    <div>
                      <span className="font-semibold text-sm">{level.niveau}</span>
                      <div className="text-xs text-muted-foreground">Indice: {level.seuil}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{level.count}</div>
                    <div className="text-xs text-muted-foreground">
                      {((level.count / provinces.length) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
              <div className="text-xs text-red-700 dark:text-red-300">
                <p className="font-medium mb-1">Zones d'alerte :</p>
                <p>
                  {enrichedProvinces.filter(p => p.indicePressionCalcule >= 2.5).length} provinces 
                  en situation de forte tension foncière nécessitent une attention particulière 
                  des pouvoirs publics.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top provinces par pression */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Map className="h-4 w-4 text-red-600" />
              Provinces avec Pression la Plus Forte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <div style={{ width: '100%' }}>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={topPressureProvinces} margin={{ top: 20, right: 0, left: 0, bottom: 60 }} barCategoryGap="-20%" barGap={4} barSize={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 5, fill: 'hsl(var(--muted-foreground))' }}
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      interval={0}
                    />
                    <YAxis 
                      tick={{ fontSize: 5, fill: 'hsl(var(--muted-foreground))' }}
                      width={40}
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
                      dataKey="indicePressionCalcule" 
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analyse de corrélation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Corrélation Pression Foncière - Prix - Population
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={160}>
            <ScatterChart data={correlationData} margin={{ top: 20, right: 0, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                type="number" 
                dataKey="pression" 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Indice de pression foncière', position: 'insideBottom', offset: -10 }}
              />
               <YAxis 
                type="number" 
                dataKey="prix"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Prix (USD/m²)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                width={60}
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
                dataKey="prix" 
                fill="hsl(var(--accent))"
              />
            </ScatterChart>
          </ResponsiveContainer>
          
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Corrélation observée :</strong> Les provinces avec un indice de pression foncière élevé 
              tendent à avoir des prix plus élevés, confirmant la relation entre rareté foncière et valorisation immobilière.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Détail province sélectionnée */}
      {selectedProvince && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
              <Map className="h-4 w-4 text-primary" />
              Diagnostic Foncier : {selectedProvince.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const provinceData = enrichedProvinces.find(p => p.id === selectedProvince.id);
              if (!provinceData) return null;

              return (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg border" style={{ 
                    backgroundColor: `${provinceData.couleurPression}20`,
                    borderColor: `${provinceData.couleurPression}40`
                  }}>
                    <div className="text-3xl font-bold" style={{ color: provinceData.couleurPression }}>
                      {provinceData.indicePressionCalcule}
                    </div>
                    <div className="text-sm text-muted-foreground">Indice pression</div>
                    <Badge 
                      variant={provinceData.niveauPression === 'Très élevé' ? 'destructive' :
                              provinceData.niveauPression === 'Élevé' ? 'secondary' :
                              provinceData.niveauPression === 'Modéré' ? 'outline' : 'default'}
                      className="mt-2 text-xs"
                    >
                      {provinceData.niveauPression}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="p-2 bg-muted/20 rounded text-xs">
                      <div className="font-medium text-muted-foreground">Taux occupation</div>
                      <div className="font-semibold text-green-600">
                        {selectedProvince.tauxOccupationLocatif.toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-2 bg-muted/20 rounded text-xs">
                      <div className="font-medium text-muted-foreground">Ratio demande/offre</div>
                      <div className="font-semibold">
                        {provinceData.ratioDemandeOffre}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="p-2 bg-muted/20 rounded text-xs">
                      <div className="font-medium text-muted-foreground">Prix vente/m²</div>
                      <div className="font-semibold text-blue-600">
                        ${selectedProvince.prixMoyenVenteM2}
                      </div>
                    </div>
                    <div className="p-2 bg-muted/20 rounded text-xs">
                      <div className="font-medium text-muted-foreground">Population locative</div>
                      <div className="font-semibold">
                        {(selectedProvince.populationLocativeEstimee / 1000).toFixed(0)}k hab.
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-lg border border-teal-200 dark:border-teal-800">
                    <div className="text-xs font-medium text-teal-700 dark:text-teal-300 mb-2">
                      Recommandations :
                    </div>
                    <div className="text-xs text-teal-600 dark:text-teal-200 space-y-1">
                      {provinceData.niveauPression === 'Très élevé' && (
                        <>
                          <div>• Densification urbaine prioritaire</div>
                          <div>• Régulation des prix</div>
                          <div>• Développement offre sociale</div>
                        </>
                      )}
                      {provinceData.niveauPression === 'Élevé' && (
                        <>
                          <div>• Anticiper besoins fonciers</div>
                          <div>• Encourager projets mixtes</div>
                          <div>• Surveiller évolution prix</div>
                        </>
                      )}
                      {provinceData.niveauPression === 'Modéré' && (
                        <>
                          <div>• Maintenir équilibre actuel</div>
                          <div>• Opportunités investissement</div>
                        </>
                      )}
                      {provinceData.niveauPression === 'Faible' && (
                        <>
                          <div>• Stimuler développement</div>
                          <div>• Attirer nouveaux résidents</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
            
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-950/30 rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Applications de l'analyse de pression foncière :
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-200">
                <ul className="space-y-1">
                  <li>• <strong>Pouvoirs publics</strong> : Orientation politiques d'aménagement</li>
                  <li>• <strong>Promoteurs</strong> : Identification zones d'opportunité</li>
                  <li>• <strong>Investisseurs</strong> : Anticipation plus-values foncières</li>
                </ul>
                <ul className="space-y-1">
                  <li>• <strong>Banques</strong> : Évaluation risques géographiques</li>
                  <li>• <strong>Notaires</strong> : Conseil clients sur valorisation</li>
                  <li>• <strong>Urbanistes</strong> : Planification développement durable</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { ProvinceData } from '@/types/province';
import { PieChart as PieChartIcon, Building2, Home, Store, Info } from 'lucide-react';

interface PropertyTypeVisualizationProps {
  provinces: ProvinceData[];
  selectedProvince?: ProvinceData | null;
}

export const PropertyTypeVisualization: React.FC<PropertyTypeVisualizationProps> = ({
  provinces,
  selectedProvince
}) => {
  // Calcul de la répartition globale RDC
  const globalRepartition = provinces.reduce(
    (acc, province) => {
      acc.residential += province.repartitionTypologique?.residential || 60;
      acc.commercial += province.repartitionTypologique?.commercial || 25;
      acc.mixte += province.repartitionTypologique?.mixte || 15;
      return acc;
    },
    { residential: 0, commercial: 0, mixte: 0 }
  );

  const totalProvinces = provinces.length;
  const avgRepartition = [
    { 
      name: 'Résidentiel', 
      value: Math.round(globalRepartition.residential / totalProvinces),
      color: 'hsl(var(--primary))',
      description: 'Logements individuels et collectifs'
    },
    { 
      name: 'Commercial', 
      value: Math.round(globalRepartition.commercial / totalProvinces),
      color: 'hsl(var(--secondary))',
      description: 'Bureaux, commerces, entrepôts'
    },
    { 
      name: 'Mixte', 
      value: Math.round(globalRepartition.mixte / totalProvinces),
      color: 'hsl(var(--accent))',
      description: 'Combinaison résidentiel-commercial'
    }
  ];

  const provincialComparison = provinces.map(province => ({
    name: province.name.substring(0, 8),
    residential: province.repartitionTypologique?.residential || 60,
    commercial: province.repartitionTypologique?.commercial || 25,
    mixte: province.repartitionTypologique?.mixte || 15
  }));

  // Analyse par typologie dominante
  const typologieAnalysis = provinces.reduce((acc, province) => {
    const typologie = province.typologieDominante;
    if (!acc[typologie]) {
      acc[typologie] = {
        count: 0,
        avgPrice: 0,
        avgVacancy: 0,
        provinces: []
      };
    }
    acc[typologie].count++;
    acc[typologie].avgPrice += province.prixMoyenLoyer;
    acc[typologie].avgVacancy += province.tauxVacanceLocative;
    acc[typologie].provinces.push(province.name);
    return acc;
  }, {} as Record<string, any>);

  // Finaliser les moyennes
  Object.keys(typologieAnalysis).forEach(key => {
    const analysis = typologieAnalysis[key];
    analysis.avgPrice = Math.round(analysis.avgPrice / analysis.count);
    analysis.avgVacancy = Math.round(analysis.avgVacancy / analysis.count);
  });

  const typologieData = Object.entries(typologieAnalysis).map(([typologie, data]: [string, any]) => ({
    typologie,
    count: data.count,
    avgPrice: data.avgPrice,
    avgVacancy: data.avgVacancy,
    percentage: ((data.count / provinces.length) * 100).toFixed(1)
  }));

  const formatTooltip = (value: any, name: string) => {
    if (name === 'residential') return [`${value}%`, 'Résidentiel'];
    if (name === 'commercial') return [`${value}%`, 'Commercial'];
    if (name === 'mixte') return [`${value}%`, 'Mixte'];
    return [value, name];
  };

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-2 charts-compact">
      {/* Répartition globale RDC */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs sm:text-sm">
            <PieChartIcon className="h-4 w-4 text-primary" />
            Répartition Typologique du Parc Immobilier RDC
            <span className="text-sm font-normal text-muted-foreground">(Moyenne nationale)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={avgRepartition}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {avgRepartition.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-4">
              {avgRepartition.map((type, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div 
                    className="w-4 h-4 rounded-full mt-1 flex-shrink-0" 
                    style={{ backgroundColor: type.color }}
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{type.name}</span>
                      <span className="text-lg font-bold" style={{ color: type.color }}>
                        {type.value}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {type.description}
                    </p>
                  </div>
                </div>
              ))}
              
              <div className="mt-4 p-3 bg-muted/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-foreground/80 leading-relaxed">
                    <p className="font-medium mb-1">Tendances observées :</p>
                    <ul className="space-y-1 ml-2">
                      <li>• Prédominance du résidentiel en zones urbaines</li>
                      <li>• Développement du mixte dans centres-villes</li>
                      <li>• Commercial concentré sur axes stratégiques</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparaison provinciale */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-green-600" />
            Comparaison Provinciale des Typologies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <div style={{ width: '100%' }}>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={provincialComparison} margin={{ top: 20, right: 30, left: 20, bottom: 60 }} barCategoryGap="10%" barGap={8} barSize={6}>
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
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Pourcentage (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
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
                  <Legend />
                  <Bar 
                    dataKey="residential" 
                    stackId="typologie"
                    fill="hsl(var(--primary))"
                    name="Résidentiel"
                  />
                  <Bar 
                    dataKey="commercial" 
                    stackId="typologie"
                    fill="hsl(var(--secondary))"
                    name="Commercial"
                  />
                  <Bar 
                    dataKey="mixte" 
                    stackId="typologie"
                    fill="hsl(var(--accent))"
                    name="Mixte"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analyse par typologie dominante */}
      <Card>
        <CardHeader>
            <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
            <Home className="h-4 w-4 text-blue-600" />
            Analyse par Typologie Dominante
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {typologieData.map((data, index) => (
              <div key={index} className="p-4 border rounded-lg bg-muted/20">
                <div className="flex items-center gap-2 mb-3">
                  {data.typologie.includes('Appartements') && <Building2 className="h-4 w-4 text-blue-600" />}
                  {data.typologie.includes('Maisons') && <Home className="h-4 w-4 text-green-600" />}
                  {data.typologie.includes('Mixte') && <Store className="h-4 w-4 text-orange-600" />}
                  <span className="font-semibold text-sm">{data.typologie}</span>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provinces :</span>
                    <span className="font-semibold">{data.count} ({data.percentage}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prix moyen :</span>
                    <span className="font-semibold text-green-600">${data.avgPrice}/m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vacance moy. :</span>
                    <span className="font-semibold text-orange-600">{data.avgVacancy}%</span>
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
            <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Profil Typologique : {selectedProvince.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-center mb-4">
                  <div className="text-lg font-semibold text-primary">
                    Typologie Dominante
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-1">
                    {selectedProvince.typologieDominante}
                  </div>
                </div>
                
                {selectedProvince.repartitionTypologique && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/30 rounded">
                      <span className="text-sm font-medium">Résidentiel</span>
                      <span className="text-lg font-bold text-green-600">
                        {selectedProvince.repartitionTypologique.residential}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
                      <span className="text-sm font-medium">Commercial</span>
                      <span className="text-lg font-bold text-blue-600">
                        {selectedProvince.repartitionTypologique.commercial}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-950/30 rounded">
                      <span className="text-sm font-medium">Mixte</span>
                      <span className="text-lg font-bold text-orange-600">
                        {selectedProvince.repartitionTypologique.mixte}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-3">
                  Impact sur les stratégies d'investissement :
                </div>
                <div className="space-y-2 text-xs text-indigo-600 dark:text-indigo-200">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded">
                    <strong>Zone résidentielle dominante :</strong>
                    <br />• Focus sur logements familiaux
                    <br />• Potentiel location longue durée
                  </div>
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded">
                    <strong>Zone commerciale développée :</strong>
                    <br />• Opportunités bureaux/commerces
                    <br />• Rendements potentiellement plus élevés
                  </div>
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded">
                    <strong>Profil mixte équilibré :</strong>
                    <br />• Diversification des risques
                    <br />• Marché plus résilient
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-950/30 rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Applications sectorielles de la répartition typologique :
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-200">
                <ul className="space-y-1">
                  <li>• <strong>Promoteurs</strong> : Adapter programmes aux besoins locaux</li>
                  <li>• <strong>Investisseurs</strong> : Cibler typologies performantes</li>
                  <li>• <strong>Gestionnaires</strong> : Spécialiser équipes par typologie</li>
                </ul>
                <ul className="space-y-1">
                  <li>• <strong>Collectivités</strong> : Planifier aménagement urbain</li>
                  <li>• <strong>Banques</strong> : Calibrer offres de financement</li>
                  <li>• <strong>Assureurs</strong> : Adapter couvertures par usage</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
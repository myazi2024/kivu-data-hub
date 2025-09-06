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
  LineChart,
  Line,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts';
import { ProvinceData } from '@/types/province';
import { Activity, TrendingUp, Building2, Info } from 'lucide-react';

interface TransactionVolumeVisualizationProps {
  provinces: ProvinceData[];
  selectedProvince?: ProvinceData | null;
}

export const TransactionVolumeVisualization: React.FC<TransactionVolumeVisualizationProps> = ({
  provinces,
  selectedProvince
}) => {
  // Générer des données mensuelles de volume de transactions
  const generateMonthlyData = () => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    
    return months.map((month, index) => {
      const totalTransactions = provinces.reduce((sum, p) => sum + p.nombreTransactionsEstimees, 0);
      const totalAnnonces = provinces.reduce((sum, p) => sum + p.volumeAnnoncesImmobilieres, 0);
      
      // Simulation de saisonnalité (pic en fin d'année)
      const seasonalFactor = 1 + (Math.sin((index + 3) / 12 * 2 * Math.PI) * 0.2);
      
      return {
        month,
        transactions: Math.round((totalTransactions / 12) * seasonalFactor),
        annonces: Math.round((totalAnnonces / 12) * seasonalFactor),
        tauxConversion: ((totalTransactions / totalAnnonces) * 100 * seasonalFactor).toFixed(1)
      };
    });
  };

  // Top provinces par volume de transactions
  const topProvincesByTransactions = [...provinces]
    .sort((a, b) => b.nombreTransactionsEstimees - a.nombreTransactionsEstimees)
    .slice(0, 10);

  // Données par trimestre
  const quarterlyData = [
    { 
      trimestre: 'T1 2024', 
      transactions: provinces.reduce((sum, p) => sum + p.nombreTransactionsEstimees, 0) * 0.22,
      croissance: 2.1
    },
    { 
      trimestre: 'T2 2024', 
      transactions: provinces.reduce((sum, p) => sum + p.nombreTransactionsEstimees, 0) * 0.24,
      croissance: 4.2
    },
    { 
      trimestre: 'T3 2024', 
      transactions: provinces.reduce((sum, p) => sum + p.nombreTransactionsEstimees, 0) * 0.26,
      croissance: 3.8
    },
    { 
      trimestre: 'T4 2024', 
      transactions: provinces.reduce((sum, p) => sum + p.nombreTransactionsEstimees, 0) * 0.28,
      croissance: 5.1
    }
  ];

  const monthlyData = generateMonthlyData();

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('fr-FR').format(Math.round(value));
  };

  const formatTooltip = (value: any, name: string) => {
    if (name === 'transactions') return [formatNumber(value), 'Transactions'];
    if (name === 'annonces') return [formatNumber(value), 'Annonces'];
    if (name === 'nombreTransactionsEstimees') return [formatNumber(value), 'Transactions estimées'];
    if (name === 'volumeAnnoncesImmobilieres') return [formatNumber(value), 'Volume annonces'];
    if (name === 'tauxConversion') return [`${value}%`, 'Taux de conversion'];
    return [value, name];
  };

  return (
    <div className="space-y-6">
      {/* Évolution mensuelle des transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Volume Mensuel des Transactions RDC
            <span className="text-sm font-normal text-muted-foreground">(Estimations 2024)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Nombre de transactions', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Taux conversion (%)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }}
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
                yAxisId="left"
                dataKey="transactions" 
                fill="hsl(var(--primary) / 0.8)"
                radius={[4, 4, 0, 0]}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="tauxConversion" 
                stroke="hsl(var(--accent))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2, r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          
          <div className="mt-4 p-3 bg-muted/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-xs text-foreground/80 leading-relaxed">
                <p className="font-medium mb-1">Analyse du volume transactionnel :</p>
                <ul className="space-y-1 ml-2">
                  <li>• <span className="text-primary font-medium">Saisonnalité</span> : Pic d'activité en fin d'année</li>
                  <li>• <span className="text-accent font-medium">Conversion</span> : Ratio annonces → transactions effectuées</li>
                  <li>• <span className="font-medium">Tendance</span> : Croissance soutenue du marché (+3.8% en moyenne)</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Répartition provinciale et tendances trimestrielles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top provinces par transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-green-600" />
              Provinces les Plus Actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProvincesByTransactions} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
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
                  dataKey="nombreTransactionsEstimees" 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Évolution trimestrielle */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Croissance Trimestrielle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={quarterlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="trimestre" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'transactions') return [formatNumber(value), 'Transactions'];
                    if (name === 'croissance') return [`${value}%`, 'Croissance'];
                    return [value, name];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="transactions"
                  stroke="hsl(var(--accent))"
                  fill="hsl(var(--accent) / 0.3)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
            
            <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
              {quarterlyData.map((quarter, index) => (
                <div key={index} className="text-center p-2 bg-muted/20 rounded">
                  <div className="font-semibold text-accent">{quarter.trimestre}</div>
                  <div className="text-green-600 font-medium">+{quarter.croissance}%</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Détail province sélectionnée */}
      {selectedProvince && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Activité Transactionnelle : {selectedProvince.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="text-2xl font-bold text-primary">
                  {formatNumber(selectedProvince.nombreTransactionsEstimees)}
                </div>
                <div className="text-sm text-muted-foreground">Transactions/an</div>
              </div>
              
              <div className="text-center p-4 bg-accent/10 rounded-lg border border-accent/20">
                <div className="text-2xl font-bold text-accent">
                  {formatNumber(selectedProvince.volumeAnnoncesImmobilieres)}
                </div>
                <div className="text-sm text-muted-foreground">Annonces/mois</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-2xl font-bold text-green-600">
                  {((selectedProvince.nombreTransactionsEstimees / (selectedProvince.volumeAnnoncesImmobilieres * 12)) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Taux conversion</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(selectedProvince.nombreTransactionsEstimees / 12)}
                </div>
                <div className="text-sm text-muted-foreground">Transactions/mois</div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-2">
                Insights pour les professionnels :
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-orange-600 dark:text-orange-200">
                <ul className="space-y-1">
                  <li>• <strong>Agents immobiliers</strong> : Dimensionner équipes commerciales</li>
                  <li>• <strong>Notaires</strong> : Anticiper charge de travail</li>
                </ul>
                <ul className="space-y-1">
                  <li>• <strong>Banques</strong> : Prévoir demandes de crédit</li>
                  <li>• <strong>Assureurs</strong> : Calibrer offres habitation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
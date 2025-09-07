import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { TrendingUp, DollarSign, Building2, Users } from 'lucide-react';
import { ProvinceData } from '@/types/province';

interface ProvinceAnalyticsProps {
  provincesData: ProvinceData[];
  selectedProvince?: ProvinceData | null;
}

export const ProvinceAnalytics: React.FC<ProvinceAnalyticsProps> = ({ 
  provincesData, 
  selectedProvince 
}) => {
  // Toutes les provinces triées par prix moyen de loyer
  const sortedRentProvinces = provincesData
    .sort((a, b) => b.prixMoyenLoyer - a.prixMoyenLoyer)
    .map(p => ({
      name: p.name.length > 6 ? p.name.substring(0, 6) + '.' : p.name,
      prix: p.prixMoyenLoyer,
      fullName: p.name
    }));

  // Données pour le graphique de pression locative (bar chart plus lisible)
  const pressureData = [
    { niveau: 'Faible', nombre: provincesData.filter(p => p.indicePresionLocative === 'Faible').length, color: '#10b981' },
    { niveau: 'Modéré', nombre: provincesData.filter(p => p.indicePresionLocative === 'Modéré').length, color: '#f59e0b' },
    { niveau: 'Élevé', nombre: provincesData.filter(p => p.indicePresionLocative === 'Élevé').length, color: '#f97316' },
    { niveau: 'Très élevé', nombre: provincesData.filter(p => p.indicePresionLocative === 'Très élevé').length, color: '#ef4444' }
  ];

  // Toutes les provinces triées par population locative
  const sortedPopulationProvinces = provincesData
    .sort((a, b) => b.populationLocativeEstimee - a.populationLocativeEstimee)
    .map(p => ({
      name: p.name.length > 6 ? p.name.substring(0, 6) + '.' : p.name,
      population: Math.round(p.populationLocativeEstimee / 1000), // En milliers
      fullName: p.name
    }));

  // Évolution des prix de location et vente (simulation avec variation)
  const priceEvolution = selectedProvince ? [
    { 
      periode: 'Il y a 3 mois', 
      location: Math.round(selectedProvince.prixMoyenLoyer * (1 - selectedProvince.variationLoyer3Mois / 100)),
      vente: Math.round(selectedProvince.prixMoyenVenteM2 * (1 - selectedProvince.variationLoyer3Mois / 150))
    },
    { 
      periode: 'Il y a 2 mois', 
      location: Math.round(selectedProvince.prixMoyenLoyer * (1 - selectedProvince.variationLoyer3Mois / 200)),
      vente: Math.round(selectedProvince.prixMoyenVenteM2 * (1 - selectedProvince.variationLoyer3Mois / 300))
    },
    { 
      periode: 'Il y a 1 mois', 
      location: Math.round(selectedProvince.prixMoyenLoyer * (1 - selectedProvince.variationLoyer3Mois / 300)),
      vente: Math.round(selectedProvince.prixMoyenVenteM2 * (1 - selectedProvince.variationLoyer3Mois / 450))
    },
    { 
      periode: 'Aujourd\'hui', 
      location: selectedProvince.prixMoyenLoyer,
      vente: selectedProvince.prixMoyenVenteM2
    }
  ] : [];

  // Évolution du nombre de locataires (simulation)
  const tenantsEvolution = selectedProvince ? [
    { periode: 'Il y a 3 mois', locataires: Math.round(selectedProvince.populationLocativeEstimee * 0.92) },
    { periode: 'Il y a 2 mois', locataires: Math.round(selectedProvince.populationLocativeEstimee * 0.95) },
    { periode: 'Il y a 1 mois', locataires: Math.round(selectedProvince.populationLocativeEstimee * 0.98) },
    { periode: 'Aujourd\'hui', locataires: selectedProvince.populationLocativeEstimee }
  ] : [];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatPopulation = (value: number) => {
    return `${value}k`;
  };

  return (
    <div className="space-y-3 h-full overflow-y-auto flex flex-col">
      {/* Statistiques globales optimisées */}
      <div className="grid grid-cols-1 gap-2">
        <Card className="p-3 sm:p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h3 className="text-sm sm:text-base font-medium text-foreground">
                <span className="hidden sm:inline">Prix Moyens Nationaux</span>
                <span className="sm:hidden">Prix Nationaux</span>
              </h3>
            </div>
            
            {/* Prix lisibles */}
            <div className="grid grid-cols-1 gap-2">
              <div className="bg-muted/20 p-2 sm:p-3 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm font-medium text-foreground">Location</span>
                  <span className="text-sm sm:text-base font-bold text-primary">
                    {formatCurrency(provincesData.reduce((sum, p) => sum + p.prixMoyenLoyer, 0) / provincesData.length)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-tight mt-1">
                  Moyenne USD/m²/mois
                </p>
              </div>

              <div className="bg-muted/20 p-2 sm:p-3 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm font-medium text-foreground">Vente</span>
                  <span className="text-sm sm:text-base font-bold text-secondary">
                    {formatCurrency(provincesData.reduce((sum, p) => sum + p.prixMoyenVenteM2, 0) / provincesData.length)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-tight mt-1">
                  Moyenne USD/m²
                </p>
              </div>

              <div className="bg-muted/20 p-2 sm:p-3 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm font-medium text-foreground">Population</span>
                  <span className="text-sm sm:text-base font-bold text-accent">
                    {Math.round(provincesData.reduce((sum, p) => sum + p.populationLocativeEstimee, 0) / 1000000 * 10) / 10}M
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-tight mt-1">
                  Total locataires RDC
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Graphiques optimisés */}
      <Card>
        <CardHeader className="pb-2 p-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Prix de loyer par province</span>
            <span className="sm:hidden">Prix</span>
            <span className="text-xs font-normal text-muted-foreground ml-1">(USD/m²)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 p-3">
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={sortedRentProvinces} margin={{ top: 2, right: 0, left: 0, bottom: 16 }} barCategoryGap="-20%" barGap={2} barSize={0.25}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name"
                tick={{ fontSize: 3, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                interval={0}
                angle={-90}
                textAnchor="end"
                height={18}
                tickMargin={1}
              />
              <YAxis 
                tick={{ fontSize: 6, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                width={20}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '4px',
                  fontSize: '9px',
                  padding: '4px'
                }}
                formatter={(value: number, name, props) => [
                  formatCurrency(value), 
                  props.payload?.fullName || name
                ]}
              />
              <Bar dataKey="prix" fill="hsl(var(--primary))" radius={[0.5, 0.5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pression locative */}
      <Card>
        <CardHeader className="pb-2 p-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Niveaux de pression</span>
            <span className="sm:hidden">Pression</span>
            <span className="text-xs font-normal text-muted-foreground ml-1">(nb provinces)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 p-3">
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={pressureData} margin={{ top: 2, right: 0, left: 0, bottom: 8 }} barCategoryGap="-20%" barGap={2} barSize={1}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="niveau" 
                tick={{ fontSize: 4, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                angle={-30}
                textAnchor="end"
                height={18}
              />
              <YAxis 
                tick={{ fontSize: 7, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                width={22}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '4px',
                  fontSize: '10px',
                  padding: '6px'
                }}
                formatter={(value: number) => [`${value} provinces`, 'Nombre']}
              />
              <Bar dataKey="nombre" radius={[1, 1, 0, 0]}>
                {pressureData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Population */}
      <Card>
        <CardHeader className="pb-2 p-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Population par province</span>
            <span className="sm:hidden">Population</span>
            <span className="text-xs font-normal text-muted-foreground ml-1">(K hab.)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 p-3">
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={sortedPopulationProvinces} margin={{ top: 2, right: 0, left: 0, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name"
                tick={{ fontSize: 3, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                interval={0}
                angle={-90}
                textAnchor="end"
                height={18}
                tickMargin={1}
              />
              <YAxis 
                tick={{ fontSize: 6, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                width={20}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '4px',
                  fontSize: '9px',
                  padding: '4px'
                }}
                formatter={(value: number, name, props) => [
                  formatPopulation(value), 
                  props.payload?.fullName || name
                ]}
              />
              <Area 
                type="monotone" 
                dataKey="population" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary))" 
                fillOpacity={0.35}
                strokeWidth={0.75}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
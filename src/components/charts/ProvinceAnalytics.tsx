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
  // Top 5 provinces par prix moyen de loyer
  const topRentProvinces = provincesData
    .sort((a, b) => b.prixMoyenLoyer - a.prixMoyenLoyer)
    .slice(0, 5)
    .map(p => ({
      name: p.name.length > 8 ? p.name.substring(0, 8) + '...' : p.name,
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

  // Top 5 provinces par population locative
  const topPopulationProvinces = provincesData
    .sort((a, b) => b.populationLocativeEstimee - a.populationLocativeEstimee)
    .slice(0, 5)
    .map(p => ({
      name: p.name.length > 8 ? p.name.substring(0, 8) + '...' : p.name,
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
    <div className="space-y-2 h-full overflow-hidden flex flex-col">
      {/* Statistiques globales */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Prix moyen national
                <span className="block text-[9px] opacity-70">(moyenne pondérée)</span>
              </p>
              <p className="text-sm font-bold text-foreground">
                {formatCurrency(provincesData.reduce((sum, p) => sum + p.prixMoyenLoyer, 0) / provincesData.length)}
              </p>
            </div>
            <DollarSign className="h-6 w-6 text-primary" />
          </div>
        </Card>
        
        <Card className="p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Population totale
                <span className="block text-[9px] opacity-70">(locataires estimés)</span>
              </p>
              <p className="text-sm font-bold text-foreground">
                {Math.round(provincesData.reduce((sum, p) => sum + p.populationLocativeEstimee, 0) / 1000000 * 10) / 10}M
              </p>
            </div>
            <Users className="h-6 w-6 text-primary" />
          </div>
        </Card>
      </div>

      {/* Top 5 provinces par prix de loyer */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Top 5 - Prix de loyer
            <span className="text-[9px] font-normal text-muted-foreground ml-1">(USD/m²)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={topRentProvinces} margin={{ top: 10, right: 10, left: 10, bottom: 15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                interval={0}
              />
              <YAxis 
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '10px'
                }}
                formatter={(value: number, name, props) => [
                  formatCurrency(value), 
                  props.payload?.fullName || name
                ]}
              />
              <Bar dataKey="prix" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Répartition de la pression locative */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            Niveaux de pression
            <span className="text-[9px] font-normal text-muted-foreground ml-1">(nombre de provinces)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={pressureData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="niveau" 
                tick={{ fontSize: 7, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '10px'
                }}
                formatter={(value: number) => [`${value} provinces`, 'Nombre']}
              />
              <Bar dataKey="nombre" radius={[2, 2, 0, 0]}>
                {pressureData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top 5 population */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs flex items-center gap-1">
            <Users className="h-3 w-3" />
            Top 5 - Population
            <span className="text-[9px] font-normal text-muted-foreground ml-1">(milliers d'habitants)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={topPopulationProvinces} margin={{ top: 10, right: 10, left: 10, bottom: 15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                interval={0}
              />
              <YAxis 
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '10px'
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
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Évolution des prix et locataires seront maintenant dans le composant parent */}
    </div>
  );
};
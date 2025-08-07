import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, Building2 } from 'lucide-react';
import type { ZoneData } from '../TerritorialMap';

interface ZoneIndicatorsProps {
  zones: ZoneData[];
}

export const ZoneIndicators: React.FC<ZoneIndicatorsProps> = ({ zones }) => {
  const calculateAggregatedStats = () => {
    if (zones.length === 0) return {
      avgRent: 0,
      avgVacancy: 0,
      totalPopulation: 0,
      avgVariation: 0,
      totalRevenue: 0
    };

    const totalRent = zones.reduce((sum, zone) => sum + zone.prixmoyenloyer, 0);
    const totalVacancy = zones.reduce((sum, zone) => sum + zone.tauxvacancelocative, 0);
    const totalPopulation = zones.reduce((sum, zone) => sum + zone.populationlocativeestimee, 0);
    const totalVariation = zones.reduce((sum, zone) => sum + zone.variationloyer3mois_pct, 0);
    const totalRevenue = zones.reduce((sum, zone) => sum + zone.recetteslocativestheoriques_usd, 0);

    return {
      avgRent: Math.round(totalRent / zones.length),
      avgVacancy: Math.round((totalVacancy / zones.length) * 10) / 10,
      totalPopulation,
      avgVariation: Math.round((totalVariation / zones.length) * 10) / 10,
      totalRevenue: Math.round(totalRevenue)
    };
  };

  const stats = calculateAggregatedStats();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatLargeNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <BarChart3 className="w-4 h-4" />
          Indicateurs territoriaux
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Zones affichées:</span>
            <span className="font-semibold">{zones.length}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Loyer moyen:</span>
            <span className="font-semibold">{formatCurrency(stats.avgRent)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Taux vacance moyen:</span>
            <div className="flex items-center gap-1">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ 
                  backgroundColor: stats.avgVacancy > 25 ? '#ef4444' : 
                                  stats.avgVacancy >= 10 ? '#eab308' : '#22c55e' 
                }}
              />
              <span className="font-semibold">{stats.avgVacancy}%</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Population totale:</span>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span className="font-semibold">{formatLargeNumber(stats.totalPopulation)}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Variation moyenne:</span>
            <div className="flex items-center gap-1">
              <TrendingUp className={`w-3 h-3 ${stats.avgVariation >= 0 ? 'text-primary' : 'text-destructive'}`} />
              <span className="font-semibold">{stats.avgVariation > 0 ? '+' : ''}{stats.avgVariation}%</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Recettes théoriques:</span>
            <div className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              <span className="font-semibold">{formatCurrency(stats.totalRevenue)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
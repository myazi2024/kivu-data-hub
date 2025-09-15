import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X, 
  Building2, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Minus,
  DollarSign,
  MapPin,
  BarChart3
} from 'lucide-react';
import type { ZoneData } from '../TerritorialMap';

interface ZoneDetailsPanelProps {
  zone: ZoneData;
  onClose: () => void;
}

export const ZoneDetailsPanel: React.FC<ZoneDetailsPanelProps> = ({ zone, onClose }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getVariationIcon = (variation: number) => {
    if (variation > 2) return <TrendingUp className="w-4 h-4 text-primary" />;
    if (variation < -2) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getZoneColor = (tauxVacance: number) => {
    if (tauxVacance > 25) return '#ef4444';
    if (tauxVacance >= 10) return '#eab308';
    return '#22c55e';
  };

  const getPressureColor = (pression: string) => {
    switch (pression) {
      case 'Très élevé': return '#dc2626';
      case 'Élevé': return '#ea580c';
      case 'Modéré': return '#ca8a04';
      case 'Faible': return '#16a34a';
      default: return '#6b7280';
    }
  };

  const getTypologyIcon = (typologie: string) => {
    if (typologie.includes('immeuble') || typologie.includes('Appartements')) return '🏢';
    if (typologie.includes('maison') || typologie.includes('villa')) return '🏠';
    return '🏘️';
  };

  // Données de tendance depuis le backend
  const [trendData, setTrendData] = useState<Array<{month: string, value: number}>>([]);

  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        const { data, error } = await supabase.rpc('get_zone_trend_data', {
          zone_id_param: zone.id,
          months_back: 6
        });

        if (error) throw error;

        const formattedData = (data || []).map((item: any) => ({
          month: item.month,
          value: parseFloat(item.value) || zone.prixmoyenloyer
        }));

        setTrendData(formattedData);
      } catch (error) {
        console.error('Erreur lors du chargement des données de tendance:', error);
        // Fallback avec données minimales basées sur la zone
        setTrendData([
          { month: 'Jan', value: zone.prixmoyenloyer },
          { month: 'Fév', value: zone.prixmoyenloyer },
          { month: 'Mar', value: zone.prixmoyenloyer },
          { month: 'Avr', value: zone.prixmoyenloyer },
          { month: 'Mai', value: zone.prixmoyenloyer },
          { month: 'Jun', value: zone.prixmoyenloyer }
        ]);
      }
    };

    fetchTrendData();
  }, [zone.id, zone.prixmoyenloyer]);

  return (
    <Card className="fixed inset-1 sm:inset-2 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 max-w-full max-h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 pt-2">
        <div className="flex items-center gap-2">
          <span className="text-lg sm:text-2xl">{getTypologyIcon(zone.typologie_dominante)}</span>
          <div>
            <CardTitle className="text-sm sm:text-lg">{zone.name}</CardTitle>
            <div className="flex items-center gap-1 mt-1">
              <Badge variant="outline" className="text-xs px-1 py-0">{zone.type}</Badge>
              <Badge 
                style={{ backgroundColor: getPressureColor(zone.indicepressionfonciere) }}
                className="text-white text-xs px-1 py-0"
              >
                Pression {zone.indicepressionfonciere}
              </Badge>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="touch-target">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-6rem)] overflow-y-auto p-1 sm:p-3 charts-compact">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="overview" className="text-xs">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs">Analyses</TabsTrigger>
            <TabsTrigger value="trends" className="text-xs">Tendances</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <Card>
                <CardContent className="p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <DollarSign className="w-3 h-3 text-primary" />
                    <p className="text-xs font-medium">Prix moyen loyer</p>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(zone.prixmoyenloyer)}</p>
                  <p className="text-xs text-muted-foreground">par mois</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <Building2 className="w-3 h-3 text-primary" />
                    <p className="text-xs font-medium">Prix m² vente</p>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(zone.prixmoyenvente_m2)}</p>
                  <p className="text-xs text-muted-foreground">par m²</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: getZoneColor(zone.tauxvacancelocative) }}
                    />
                    <p className="text-xs font-medium">Taux vacance</p>
                  </div>
                  <p className="text-lg font-bold">{formatPercentage(zone.tauxvacancelocative)}</p>
                  <p className="text-xs text-muted-foreground">logements vacants</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-2">
                  <div className="flex items-center gap-1 mb-1">
                    {getVariationIcon(zone.variationloyer3mois_pct)}
                    <p className="text-xs font-medium">Variation 3 mois</p>
                  </div>
                  <p className="text-lg font-bold">
                    {zone.variationloyer3mois_pct > 0 ? '+' : ''}{formatPercentage(zone.variationloyer3mois_pct)}
                  </p>
                  <p className="text-xs text-muted-foreground">évolution des prix</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs">Données démographiques</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Population locative estimée</span>
                    <span className="font-semibold text-xs">{zone.populationlocativeestimee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Densité résidentielle</span>
                    <span className="font-semibold text-xs">{zone.densite_residentielle} hab/km²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Typologie dominante</span>
                    <span className="font-semibold text-xs">{zone.typologie_dominante}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs">Marché immobilier</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Recettes théoriques</span>
                    <span className="font-semibold text-xs">{formatCurrency(zone.recetteslocativestheoriques_usd)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Volume annonces/mois</span>
                    <span className="font-semibold text-xs">{zone.volumeannoncesmois}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Indice pression foncière</span>
                    <Badge 
                      style={{ backgroundColor: getPressureColor(zone.indicepressionfonciere) }}
                      className="text-white text-xs px-1 py-0"
                    >
                      {zone.indicepressionfonciere}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" />
                    Analyse de vacance
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="h-20 flex items-end justify-center gap-2">
                    {/* Histogramme simplifié */}
                    <div className="flex flex-col items-center">
                      <div 
                        className="w-6 bg-red-500 rounded-t"
                        style={{ height: `${zone.tauxvacancelocative > 25 ? '100%' : '20%'}` }}
                      />
                      <span className="text-xs mt-1">Élevé</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div 
                        className="w-6 bg-yellow-500 rounded-t"
                        style={{ height: `${zone.tauxvacancelocative >= 10 && zone.tauxvacancelocative <= 25 ? '100%' : '40%'}` }}
                      />
                      <span className="text-xs mt-1">Moyen</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div 
                        className="w-6 bg-green-500 rounded-t"
                        style={{ height: `${zone.tauxvacancelocative < 10 ? '100%' : '60%'}` }}
                      />
                      <span className="text-xs mt-1">Faible</span>
                    </div>
                  </div>
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    Répartition du taux de vacance locative
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs">Carte thermique - Pression foncière</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="h-20 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 rounded flex items-center justify-center">
                    <div 
                      className="w-3 h-3 rounded-full border-2 border-white"
                      style={{ backgroundColor: getPressureColor(zone.indicepressionfonciere) }}
                    />
                  </div>
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    Position sur l'échelle de pression foncière
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="trends" className="space-y-3">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Évolution des prix (6 derniers mois)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="h-24 flex items-end justify-between gap-1">
                  {trendData.map((point, index) => (
                    <div key={point.month} className="flex flex-col items-center">
                      <div 
                        className="w-4 bg-primary rounded-t"
                        style={{ 
                          height: `${(point.value / Math.max(...trendData.map(d => d.value))) * 100}%`,
                          minHeight: '8px'
                        }}
                      />
                      <span className="text-xs mt-1">{point.month}</span>
                    </div>
                  ))}
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Évolution des prix de location
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
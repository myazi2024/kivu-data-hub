import React from 'react';
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
    if (variation > 2) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (variation < -2) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
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

  // Mock data pour les graphiques miniatures
  const generateMockTrendData = () => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'];
    return months.map((month, index) => ({
      month,
      value: zone.prixmoyenloyer * (1 + (zone.variationloyer3mois_pct / 100) * (index / 6))
    }));
  };

  const trendData = generateMockTrendData();

  return (
    <Card className="fixed inset-4 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{getTypologyIcon(zone.typologie_dominante)}</span>
          <div>
            <CardTitle className="text-xl">{zone.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{zone.type}</Badge>
              <Badge 
                style={{ backgroundColor: getPressureColor(zone.indicepressionfonciere) }}
                className="text-white"
              >
                Pression {zone.indicepressionfonciere}
              </Badge>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="max-h-[calc(100vh-12rem)] overflow-y-auto">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="analytics">Analyses</TabsTrigger>
            <TabsTrigger value="trends">Tendances</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium">Prix moyen loyer</p>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(zone.prixmoyenloyer)}</p>
                  <p className="text-xs text-muted-foreground">par mois</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium">Prix m² vente</p>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(zone.prixmoyenvente_m2)}</p>
                  <p className="text-xs text-muted-foreground">par m²</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: getZoneColor(zone.tauxvacancelocative) }}
                    />
                    <p className="text-sm font-medium">Taux vacance</p>
                  </div>
                  <p className="text-2xl font-bold">{formatPercentage(zone.tauxvacancelocative)}</p>
                  <p className="text-xs text-muted-foreground">logements vacants</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {getVariationIcon(zone.variationloyer3mois_pct)}
                    <p className="text-sm font-medium">Variation 3 mois</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {zone.variationloyer3mois_pct > 0 ? '+' : ''}{formatPercentage(zone.variationloyer3mois_pct)}
                  </p>
                  <p className="text-xs text-muted-foreground">évolution des prix</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Données démographiques</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Population locative estimée</span>
                    <span className="font-semibold">{zone.populationlocativeestimee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Densité résidentielle</span>
                    <span className="font-semibold">{zone.densite_residentielle} hab/km²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Typologie dominante</span>
                    <span className="font-semibold">{zone.typologie_dominante}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Marché immobilier</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Recettes théoriques</span>
                    <span className="font-semibold">{formatCurrency(zone.recetteslocativestheoriques_usd)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Volume annonces/mois</span>
                    <span className="font-semibold">{zone.volumeannoncesmois}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Indice pression foncière</span>
                    <Badge 
                      style={{ backgroundColor: getPressureColor(zone.indicepressionfonciere) }}
                      className="text-white"
                    >
                      {zone.indicepressionfonciere}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Analyse de vacance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-32 flex items-end justify-center gap-2">
                    {/* Histogramme simplifié */}
                    <div className="flex flex-col items-center">
                      <div 
                        className="w-8 bg-red-500 rounded-t"
                        style={{ height: `${zone.tauxvacancelocative > 25 ? '100%' : '20%'}` }}
                      />
                      <span className="text-xs mt-1">Élevé</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div 
                        className="w-8 bg-yellow-500 rounded-t"
                        style={{ height: `${zone.tauxvacancelocative >= 10 && zone.tauxvacancelocative <= 25 ? '100%' : '40%'}` }}
                      />
                      <span className="text-xs mt-1">Moyen</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div 
                        className="w-8 bg-green-500 rounded-t"
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
                <CardHeader>
                  <CardTitle className="text-sm">Carte thermique - Pression foncière</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-32 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 rounded flex items-center justify-center">
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-white"
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
          
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Évolution des prix (6 derniers mois)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-40 flex items-end justify-between gap-2">
                  {trendData.map((point, index) => (
                    <div key={point.month} className="flex flex-col items-center">
                      <div 
                        className="w-6 bg-primary rounded-t"
                        style={{ 
                          height: `${(point.value / Math.max(...trendData.map(d => d.value))) * 100}%`,
                          minHeight: '10px'
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
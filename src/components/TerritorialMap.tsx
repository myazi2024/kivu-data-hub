import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import { LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Search, 
  BarChart3, 
  Home, 
  Filter, 
  Building2, 
  Users, 
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { ZoneIndicators } from './map/ZoneIndicators';
import { ZoneDetailsPanel } from './map/ZoneDetailsPanel';
import { TerritorialFilters } from './map/TerritorialFilters';
import { useZoneData } from '@/hooks/useZoneData';

export interface ZoneData {
  id: string;
  name: string;
  type: 'province' | 'ville' | 'commune' | 'quartier' | 'avenue';
  coordinates: number[][];
  prixmoyenloyer: number;
  prixmoyenvente_m2: number;
  tauxvacancelocative: number;
  densite_residentielle: number;
  populationlocativeestimee: number;
  recetteslocativestheoriques_usd: number;
  variationloyer3mois_pct: number;
  volumeannoncesmois: number;
  typologie_dominante: string;
  indicepressionfonciere: 'Faible' | 'Modéré' | 'Élevé' | 'Très élevé';
  parent_id?: string;
}

// MapController component pour gérer la carte sans ref
const MapController = ({ selectedZone }: { selectedZone: ZoneData | null }) => {
  const map = useMap();
  
  useEffect(() => {
    if (selectedZone && selectedZone.coordinates.length > 0) {
      try {
        const coordinates = selectedZone.coordinates.map(coord => [coord[0], coord[1]] as [number, number]);
        map.fitBounds(coordinates, { padding: [20, 20] });
      } catch (error) {
        console.error('Erreur lors du centrage sur la zone:', error);
      }
    }
  }, [selectedZone, map]);

  return null;
};

const TerritorialMap = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState<ZoneData | null>(null);
  const [zoomLevel, setZoomLevel] = useState('ville');
  const [filters, setFilters] = useState({
    zoneType: 'all',
    typologieDominante: 'all',
    pressionFonciere: 'all',
    tauxVacanceMin: 0,
    tauxVacanceMax: 100
  });

  const { zones, loading, error } = useZoneData(zoomLevel);

  const getZoneColor = (tauxVacance: number) => {
    if (tauxVacance > 25) return '#ef4444'; // Rouge - zone sous-occupée
    if (tauxVacance >= 10) return '#eab308'; // Jaune - zone moyenne
    return '#22c55e'; // Vert - zone très demandée
  };

  const getTypologyIcon = (typologie: string) => {
    if (typologie.includes('immeuble') || typologie.includes('Appartements')) return '🏢';
    if (typologie.includes('maison') || typologie.includes('villa')) return '🏠';
    return '🏘️'; // Usage mixte
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

  const getVariationIcon = (variation: number) => {
    if (variation > 2) return <TrendingUp className="w-3 h-3 text-primary" />;
    if (variation < -2) return <TrendingDown className="w-3 h-3 text-destructive" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  const filteredZones = zones.filter(zone => {
    if (filters.zoneType !== 'all' && zone.type !== filters.zoneType) return false;
    if (filters.typologieDominante !== 'all' && !zone.typologie_dominante.toLowerCase().includes(filters.typologieDominante)) return false;
    if (filters.pressionFonciere !== 'all' && zone.indicepressionfonciere !== filters.pressionFonciere) return false;
    if (zone.tauxvacancelocative < filters.tauxVacanceMin || zone.tauxvacancelocative > filters.tauxVacanceMax) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!zone.name.toLowerCase().includes(query) && 
          !zone.typologie_dominante.toLowerCase().includes(query)) return false;
    }
    
    return true;
  });

  const handleZoneClick = (zone: ZoneData) => {
    setSelectedZone(zone);
  };

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

  return (
    <div className="space-y-6" role="region" aria-label="Carte territoriale">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls Panel */}
        <div className="space-y-4">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Search className="w-4 h-4" />
                Recherche territoriale
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Rechercher une zone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button size="sm">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Zoom Level */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4" />
                Niveau de zoom
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={zoomLevel} onValueChange={setZoomLevel}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="province" className="text-xs">Province</TabsTrigger>
                  <TabsTrigger value="ville" className="text-xs">Ville</TabsTrigger>
                </TabsList>
                <TabsList className="grid w-full grid-cols-3 mt-2">
                  <TabsTrigger value="commune" className="text-xs">Commune</TabsTrigger>
                  <TabsTrigger value="quartier" className="text-xs">Quartier</TabsTrigger>
                  <TabsTrigger value="avenue" className="text-xs">Avenue</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Filters */}
          <TerritorialFilters filters={filters} onFiltersChange={setFilters} />

          {/* Zone Indicators */}
          <ZoneIndicators zones={filteredZones} />
        </div>

        {/* Map Container */}
        <div className="lg:col-span-3">
          <div className="w-full h-[700px] rounded-lg border border-border overflow-hidden">
            <MapContainer
              center={[-1.6792, 29.2348]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController selectedZone={selectedZone} />
              
              {!loading && filteredZones.map((zone) => {
                if (!zone.coordinates || zone.coordinates.length === 0) {
                  console.warn(`Zone ${zone.name} n'a pas de coordonnées valides`);
                  return null;
                }
                
                return (
                  <Polygon
                    key={zone.id}
                    positions={zone.coordinates.map(coord => [coord[0], coord[1]] as [number, number])}
                    pathOptions={{
                      fillColor: getZoneColor(zone.tauxvacancelocative),
                      fillOpacity: 0.4,
                      color: getZoneColor(zone.tauxvacancelocative),
                      weight: 2,
                      opacity: 0.8
                    }}
                    eventHandlers={{
                      click: () => handleZoneClick(zone),
                      mouseover: (e) => {
                        e.target.setStyle({ weight: 3, fillOpacity: 0.6 });
                      },
                      mouseout: (e) => {
                        e.target.setStyle({ weight: 2, fillOpacity: 0.4 });
                      }
                    }}
                  >
                    <Popup>
                      <div className="p-3 min-w-[300px]">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">{getTypologyIcon(zone.typologie_dominante)}</span>
                          <div>
                            <h3 className="font-semibold text-sm">{zone.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {zone.type}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-muted-foreground">Prix moyen loyer</p>
                            <p className="font-semibold">{formatCurrency(zone.prixmoyenloyer)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Prix m² vente</p>
                            <p className="font-semibold">{formatCurrency(zone.prixmoyenvente_m2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Taux vacance</p>
                            <div className="flex items-center gap-1">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: getZoneColor(zone.tauxvacancelocative) }}
                              />
                              <span className="font-semibold">{formatPercentage(zone.tauxvacancelocative)}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Variation 3 mois</p>
                            <div className="flex items-center gap-1">
                              {getVariationIcon(zone.variationloyer3mois_pct)}
                              <span className="font-semibold">{formatPercentage(zone.variationloyer3mois_pct)}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Population locative</p>
                            <p className="font-semibold">{zone.populationlocativeestimee.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Pression foncière</p>
                            <Badge 
                              style={{ backgroundColor: getPressureColor(zone.indicepressionfonciere) }}
                              className="text-white text-xs"
                            >
                              {zone.indicepressionfonciere}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-muted-foreground">Typologie dominante</p>
                          <p className="text-xs font-medium">{zone.typologie_dominante}</p>
                        </div>
                        
                        <Button 
                          size="sm" 
                          className="w-full mt-3"
                          onClick={() => setSelectedZone(zone)}
                        >
                          Voir détails complets
                        </Button>
                      </div>
                    </Popup>
                  </Polygon>
                );
              })}
            </MapContainer>
          </div>
        </div>
      </div>

      {/* Zone Details Panel */}
      {selectedZone && (
        <ZoneDetailsPanel 
          zone={selectedZone} 
          onClose={() => setSelectedZone(null)}
        />
      )}
    </div>
  );
};

export default TerritorialMap;
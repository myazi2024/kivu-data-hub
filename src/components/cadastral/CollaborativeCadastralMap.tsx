import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCadastralParcels, type ParcelFilters, type CadastralParcelData } from '@/hooks/useCadastralParcels';
import { MapPin, Layers, Filter, Info, Home, FileText, Ruler, X } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapUpdater = ({ parcels }: { parcels: CadastralParcelData[] }) => {
  const map = useMap();

  useEffect(() => {
    if (parcels.length > 0) {
      const allCoords = parcels.flatMap(p => 
        p.gps_coordinates.map(c => [c.lat, c.lng] as [number, number])
      );
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [parcels, map]);

  return null;
};

const CollaborativeCadastralMap = () => {
  const [filters, setFilters] = useState<ParcelFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<CadastralParcelData | null>(null);
  
  const { parcels, loading, error, totalCount } = useCadastralParcels(filters);

  // Extraire les valeurs uniques pour les filtres
  const uniqueProvinces = useMemo(() => 
    Array.from(new Set(parcels.map(p => p.province).filter(Boolean))).sort(),
    [parcels]
  );

  const uniqueVilles = useMemo(() => 
    Array.from(new Set(parcels.map(p => p.ville).filter(Boolean))).sort(),
    [parcels]
  );

  const uniqueCommunes = useMemo(() => 
    Array.from(new Set(parcels.map(p => p.commune).filter(Boolean))).sort(),
    [parcels]
  );

  const parcelTypes = ['Urbain', 'Rural', 'Mixte'];
  const titleTypes = [
    "Certificat d'enregistrement",
    'Titre de propriété',
    'Concession perpétuelle',
    'Concession ordinaire',
    'Bail emphytéotique'
  ];

  const getPolygonColor = (parcel: CadastralParcelData) => {
    const area = parcel.area_sqm;
    if (area < 500) return '#22c55e'; // Vert - Petite parcelle
    if (area < 2000) return '#3b82f6'; // Bleu - Moyenne parcelle
    if (area < 5000) return '#f59e0b'; // Orange - Grande parcelle
    return '#ef4444'; // Rouge - Très grande parcelle
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  const defaultCenter: [number, number] = [-1.6746, 29.2342]; // Goma, RDC
  const defaultZoom = 12;

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header avec statistiques */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Plan Cadastral Collaboratif
              </CardTitle>
              <CardDescription className="mt-2">
                Visualisez les parcelles cadastrales géolocalisées en temps réel
              </CardDescription>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Info className="h-4 w-4 mr-2" />
                  Guide
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Comment utiliser la carte ?</h4>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Cliquez sur une parcelle pour voir ses détails</li>
                    <li>• Utilisez les filtres pour affiner votre recherche</li>
                    <li>• Zoom et panoramique pour naviguer</li>
                    <li>• Les couleurs indiquent la taille des parcelles</li>
                  </ul>
                  <div className="pt-2 border-t space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span>Petite (&lt; 500 m²)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span>Moyenne (500-2000 m²)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <span>Grande (2000-5000 m²)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span>Très grande (&gt; 5000 m²)</span>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{totalCount} parcelles</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{parcels.length} géolocalisées</span>
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="ml-auto"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtres
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {Object.keys(filters).length}
                </Badge>
              )}
            </Button>
          </div>

          {/* Panneau de filtres */}
          {showFilters && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/30 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Filtrer les parcelles</h4>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Réinitialiser
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="province">Province</Label>
                  <Select
                    value={filters.province || ''}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, province: value || undefined }))}
                  >
                    <SelectTrigger id="province">
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Toutes</SelectItem>
                      {uniqueProvinces.map(p => (
                        <SelectItem key={p} value={p!}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Select
                    value={filters.ville || ''}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, ville: value || undefined }))}
                  >
                    <SelectTrigger id="ville">
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Toutes</SelectItem>
                      {uniqueVilles.map(v => (
                        <SelectItem key={v} value={v!}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commune">Commune</Label>
                  <Select
                    value={filters.commune || ''}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, commune: value || undefined }))}
                  >
                    <SelectTrigger id="commune">
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Toutes</SelectItem>
                      {uniqueCommunes.map(c => (
                        <SelectItem key={c} value={c!}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parcel_type">Type de parcelle</Label>
                  <Select
                    value={filters.parcel_type || ''}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, parcel_type: value || undefined }))}
                  >
                    <SelectTrigger id="parcel_type">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous</SelectItem>
                      {parcelTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title_type">Type de titre</Label>
                  <Select
                    value={filters.property_title_type || ''}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, property_title_type: value || undefined }))}
                  >
                    <SelectTrigger id="title_type">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous</SelectItem>
                      {titleTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area">Superficie (m²)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="area"
                      type="number"
                      placeholder="Min"
                      value={filters.min_area || ''}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        min_area: e.target.value ? Number(e.target.value) : undefined 
                      }))}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.max_area || ''}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        max_area: e.target.value ? Number(e.target.value) : undefined 
                      }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Carte */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="h-[600px] flex items-center justify-center">
              <div className="text-center space-y-4">
                <Skeleton className="h-12 w-12 rounded-full mx-auto" />
                <Skeleton className="h-4 w-48 mx-auto" />
              </div>
            </div>
          ) : (
            <div className="h-[600px] relative">
              <MapContainer
                center={defaultCenter}
                zoom={defaultZoom}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <MapUpdater parcels={parcels} />

                {parcels.map((parcel) => {
                  const coords = parcel.gps_coordinates.map(c => [c.lat, c.lng] as [number, number]);
                  const color = getPolygonColor(parcel);

                  return (
                    <Polygon
                      key={parcel.id}
                      positions={coords}
                      pathOptions={{
                        color: color,
                        fillColor: color,
                        fillOpacity: 0.4,
                        weight: 2,
                      }}
                      eventHandlers={{
                        click: () => setSelectedParcel(parcel),
                      }}
                    >
                      <Popup>
                        <div className="min-w-[200px] space-y-2">
                          <div className="font-semibold text-sm border-b pb-1">
                            {parcel.parcel_number}
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-start gap-2">
                              <Home className="h-3 w-3 mt-0.5 text-muted-foreground" />
                              <span>{parcel.current_owner_name}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <FileText className="h-3 w-3 mt-0.5 text-muted-foreground" />
                              <span>{parcel.property_title_type}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <Ruler className="h-3 w-3 mt-0.5 text-muted-foreground" />
                              <span>
                                {parcel.area_sqm.toLocaleString('fr-FR')} m²
                                {parcel.area_hectares && ` (${parcel.area_hectares.toFixed(2)} ha)`}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {[parcel.quartier, parcel.commune, parcel.ville].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Polygon>
                  );
                })}
              </MapContainer>

              {parcels.length === 0 && !loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <div className="text-center space-y-2">
                    <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Aucune parcelle trouvée avec ces filtres
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CollaborativeCadastralMap;

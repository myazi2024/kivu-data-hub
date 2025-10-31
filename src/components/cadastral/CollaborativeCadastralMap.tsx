import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCadastralParcels, type ParcelFilters } from '@/hooks/useCadastralParcels';
import { MapPin, Layers, Filter, Info, X, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Import dynamique de Leaflet pour éviter les erreurs SSR
const LeafletMap = React.lazy(() => import('./LeafletMapComponent'));

const CollaborativeCadastralMap = () => {
  const [filters, setFilters] = useState<ParcelFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  
  const { parcels, loading, error, totalCount } = useCadastralParcels(filters);

  useEffect(() => {
    console.log('🎨 CollaborativeCadastralMap state:', {
      parcelsCount: parcels.length,
      loading,
      error,
      totalCount,
      filters
    });
  }, [parcels, loading, error, totalCount, filters]);

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

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
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
                <p className="text-sm text-muted-foreground">Chargement des parcelles...</p>
              </div>
            </div>
          ) : parcels.length === 0 ? (
            <div className="h-[600px] flex items-center justify-center bg-muted/20">
              <div className="text-center space-y-2">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground font-medium">
                  Aucune parcelle trouvée
                </p>
                <p className="text-xs text-muted-foreground">
                  {hasActiveFilters ? 'Essayez de modifier vos filtres' : 'Aucune parcelle géolocalisée disponible'}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-[600px] relative">
              <React.Suspense fallback={
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Skeleton className="h-12 w-12 rounded-full mx-auto" />
                    <p className="text-sm text-muted-foreground">Chargement de la carte...</p>
                  </div>
                </div>
              }>
                <LeafletMap parcels={parcels} />
              </React.Suspense>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CollaborativeCadastralMap;

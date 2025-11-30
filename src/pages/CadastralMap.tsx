import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navigation from '@/components/ui/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MessageCircle, AlertTriangle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import CCCIntroDialog from '@/components/cadastral/CCCIntroDialog';
import CadastralContributionDialog from '@/components/cadastral/CadastralContributionDialog';
import CadastralAdvancedSearchBar from '@/components/map/CadastralAdvancedSearchBar';
import CadastralSearchResults from '@/components/map/CadastralSearchResults';
import CadastralDrawingTools from '@/components/map/CadastralDrawingTools';
import CadastralMeasurementTools from '@/components/map/CadastralMeasurementTools';
import CadastralMapLegend from '@/components/map/CadastralMapLegend';
import ParcelComparisonDialog from '@/components/map/ParcelComparisonDialog';
import { useCadastralMapSearch } from '@/hooks/useCadastralMapSearch';
import { useMapDrawing } from '@/hooks/useMapDrawing';
import { useMapMeasurement } from '@/hooks/useMapMeasurement';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { clusterPoints, shouldCluster } from '@/utils/mapClustering';
import 'leaflet/dist/leaflet.css';

interface ParcelData {
  id: string;
  parcel_number: string;
  gps_coordinates: any;
  parcel_sides: any;
  latitude: number;
  longitude: number;
  current_owner_name: string;
  area_sqm: number;
  province: string;
  ville: string;
  commune: string;
  quartier: string;
  parcel_type: string;
  property_title_type: string;
}

interface ParcelHistoryData {
  ownership_history: any[];
  tax_history: any[];
  mortgage_history: any[];
  boundary_history: any[];
  building_permits: any[];
}

const CadastralMap = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<ParcelData | null>(null);
  const [showIntroDialog, setShowIntroDialog] = useState(false);
  const [showContributionDialog, setShowContributionDialog] = useState(false);
  const [selectedParcelHistory, setSelectedParcelHistory] = useState<ParcelHistoryData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasIncompleteData, setHasIncompleteData] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [comparisonParcels, setComparisonParcels] = useState<ParcelData[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(12);

  // Hooks avancés
  const { 
    filters, 
    setFilters, 
    results, 
    totalCount, 
    sortBy, 
    setSortBy, 
    sortOrder, 
    setSortOrder 
  } = useCadastralMapSearch();
  
  const { 
    mode: drawingMode, 
    coordinates: drawingCoords, 
    startDrawing, 
    addPoint: addDrawingPoint, 
    finishDrawing, 
    clearDrawing 
  } = useMapDrawing();
  
  const { 
    mode: measurementMode, 
    points: measurementPoints, 
    result: measurementResult, 
    startMeasurement, 
    addPoint: addMeasurementPoint, 
    clearMeasurement 
  } = useMapMeasurement();
  
  const { coords: geoCoords, getCurrentPosition } = useGeolocation();
  const { addToHistory } = useSearchHistory();

  // Charger les paramètres URL au démarrage
  useEffect(() => {
    const urlFilters: any = {};
    searchParams.forEach((value, key) => {
      urlFilters[key] = value;
    });
    if (Object.keys(urlFilters).length > 0) {
      setFilters(urlFilters);
    }
  }, []);

  // Utiliser la géolocalisation
  const handleUseGeolocation = () => {
    getCurrentPosition();
  };

  // Appliquer les coordonnées de géolocalisation
  useEffect(() => {
    if (geoCoords) {
      setFilters({
        ...filters,
        proximityLat: geoCoords.latitude,
        proximityLng: geoCoords.longitude,
        proximityRadius: filters.proximityRadius || 1000
      });
      
      if (mapInstanceRef.current) {
        const L = (window as any).L;
        if (L) {
          mapInstanceRef.current.setView([geoCoords.latitude, geoCoords.longitude], 14);
        }
      }
    }
  }, [geoCoords]);

  // Charger l'historique d'une parcelle
  const loadParcelHistory = async (parcelId: string) => {
    setLoadingHistory(true);
    try {
      const [ownershipRes, taxRes, mortgageRes, boundaryRes, permitsRes] = await Promise.all([
        supabase.from('cadastral_ownership_history').select('*').eq('parcel_id', parcelId),
        supabase.from('cadastral_tax_history').select('*').eq('parcel_id', parcelId),
        supabase.from('cadastral_mortgages').select('*').eq('parcel_id', parcelId),
        supabase.from('cadastral_boundary_history').select('*').eq('parcel_id', parcelId),
        supabase.from('cadastral_building_permits').select('*').eq('parcel_id', parcelId)
      ]);

      const historyData: ParcelHistoryData = {
        ownership_history: ownershipRes.data || [],
        tax_history: taxRes.data || [],
        mortgage_history: mortgageRes.data || [],
        boundary_history: boundaryRes.data || [],
        building_permits: permitsRes.data || []
      };

      setSelectedParcelHistory(historyData);
      
      const hasLocation = !!(selectedParcel?.province && selectedParcel?.ville);
      const hasGPS = !!(selectedParcel?.gps_coordinates && Array.isArray(selectedParcel.gps_coordinates) && selectedParcel.gps_coordinates.length > 0);
      const hasLocationHistory = hasLocation || historyData.boundary_history.length > 0 || hasGPS;
      const hasHistory = historyData.ownership_history.length > 0;
      const hasObligations = historyData.tax_history.length > 0 || historyData.mortgage_history.length > 0;

      const missingCount = [hasLocationHistory, hasHistory, hasObligations].filter(v => !v).length;
      setHasIncompleteData(missingCount >= 2);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSelectParcel = (parcel: ParcelData) => {
    setSelectedParcel(parcel);
    setSearchQuery(parcel.parcel_number);
    loadParcelHistory(parcel.id);
    
    if (mapInstanceRef.current && parcel.latitude && parcel.longitude) {
      const L = (window as any).L;
      if (L) {
        mapInstanceRef.current.setView([parcel.latitude, parcel.longitude], 16);
      }
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedParcel(null);
    setFilters({});
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Initialiser la carte
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      try {
        const L = await import('leaflet');

        delete (L as any).Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const map = L.map(mapRef.current, {
          zoomControl: !isMobile,
          scrollWheelZoom: !isMobile,
          doubleClickZoom: !isMobile,
          dragging: true
        }).setView([-1.6794, 29.2273], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        mapInstanceRef.current = map;

        // Suivre le niveau de zoom
        map.on('zoomend', () => {
          setCurrentZoom(map.getZoom());
        });

        // Gestion des clics pour les outils de dessin et mesure
        map.on('click', (e: any) => {
          if (drawingMode !== 'none') {
            addDrawingPoint(e.latlng.lat, e.latlng.lng);
          } else if (measurementMode !== 'none') {
            addMeasurementPoint(e.latlng.lat, e.latlng.lng);
          }
        });

        setTimeout(() => map.invalidateSize(), 100);

      } catch (error) {
        console.error('Erreur initialisation carte:', error);
        toast.error('Erreur lors de l\'initialisation de la carte');
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Calculer la surface d'une parcelle
  const calculateAreaFromCoordinates = (coordinates: any[]): number => {
    if (!coordinates || coordinates.length < 3) return 0;

    const avgLat = coordinates.reduce((sum, coord) => sum + coord.lat, 0) / coordinates.length;
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLng = 111320 * Math.cos(avgLat * Math.PI / 180);

    const cartesianCoords = coordinates.map(coord => ({
      x: coord.lng * metersPerDegreeLng,
      y: coord.lat * metersPerDegreeLat
    }));

    let area = 0;
    for (let i = 0; i < cartesianCoords.length; i++) {
      const j = (i + 1) % cartesianCoords.length;
      area += cartesianCoords[i].x * cartesianCoords[j].y;
      area -= cartesianCoords[j].x * cartesianCoords[i].y;
    }

    return Math.abs(area / 2);
  };

  // Calculer la distance entre deux points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Afficher les parcelles sur la carte
  useEffect(() => {
    const updateMapWithParcels = async () => {
      if (!mapInstanceRef.current || results.length === 0) return;

      try {
        const L = await import('leaflet');
        const map = mapInstanceRef.current;
        
        // Nettoyer les marqueurs existants
        map.eachLayer((layer: any) => {
          if (layer instanceof L.Marker || layer instanceof L.Polygon || layer instanceof L.Circle || layer instanceof L.Polyline) {
            map.removeLayer(layer);
          }
        });

        // Clustering si zoom faible
        const useClustering = shouldCluster(currentZoom);
        let displayParcels = results;

        if (useClustering) {
          const clusters = clusterPoints(
            results.map(p => ({
              id: p.id,
              latitude: p.latitude,
              longitude: p.longitude,
              data: p
            })),
            0.01
          );

          // Afficher les clusters
          clusters.forEach(cluster => {
            if (cluster.count > 1) {
              const clusterIcon = L.divIcon({
                className: 'cluster-marker',
                html: `<div style="
                  background: #ef4444;
                  color: white;
                  border-radius: 50%;
                  width: 40px;
                  height: 40px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  border: 3px solid white;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                ">${cluster.count}</div>`,
                iconSize: [40, 40]
              });

              const marker = L.marker([cluster.centerLat, cluster.centerLng], { icon: clusterIcon }).addTo(map);
              
              marker.on('click', () => {
                map.setView([cluster.centerLat, cluster.centerLng], currentZoom + 2);
              });
            } else {
              displayParcels.push(cluster.points[0].data);
            }
          });
        }

        const bounds = L.latLngBounds([]);

        // Afficher les parcelles individuelles
        displayParcels.forEach((parcel) => {
          if (parcel.gps_coordinates && parcel.gps_coordinates.length >= 3) {
            const polygonPoints: [number, number][] = parcel.gps_coordinates.map(
              coord => [coord.lat, coord.lng]
            );
            
            const polygon = L.polygon(polygonPoints, {
              color: '#ef4444',
              weight: 2,
              fillColor: '#ef4444',
              fillOpacity: 0.2
            }).addTo(map);

            // Ajouter les dimensions sur chaque côté
            const parcelSides = parcel.parcel_sides && Array.isArray(parcel.parcel_sides)
              ? parcel.parcel_sides
              : null;

            if (!useClustering) {
              parcel.gps_coordinates.forEach((coord: any, index: number) => {
                const nextIndex = (index + 1) % parcel.gps_coordinates.length;
                const nextCoord = parcel.gps_coordinates[nextIndex];
                
                let distance: number;
                if (parcelSides && parcelSides[index] && parcelSides[index].length) {
                  distance = parseFloat(parcelSides[index].length);
                } else {
                  distance = calculateDistance(coord.lat, coord.lng, nextCoord.lat, nextCoord.lng);
                }
                
                const midLat = (coord.lat + nextCoord.lat) / 2;
                const midLng = (coord.lng + nextCoord.lng) / 2;
                
                const dimensionIcon = L.divIcon({
                  className: 'dimension-label',
                  html: `<div style="
                    background: white;
                    padding: 2px 6px;
                    border-radius: 4px;
                    border: 1px solid #ef4444;
                    font-size: 11px;
                    font-weight: 600;
                    color: #ef4444;
                    white-space: nowrap;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                  ">${distance.toFixed(1)} m</div>`,
                  iconSize: [60, 20],
                  iconAnchor: [30, 10]
                });
                
                L.marker([midLat, midLng], { icon: dimensionIcon }).addTo(map);
              });
            }

            polygon.on('click', () => {
              handleSelectParcel(parcel);
            });

            bounds.extend(polygon.getBounds());
          } else if (parcel.latitude && parcel.longitude) {
            const marker = L.marker([parcel.latitude, parcel.longitude]).addTo(map);

            marker.on('click', () => {
              handleSelectParcel(parcel);
            });

            bounds.extend([parcel.latitude, parcel.longitude]);
          }
        });

        // Dessiner la zone de dessin
        if (drawingCoords.length > 0) {
          if (drawingMode === 'polygon' && drawingCoords.length >= 2) {
            const points: [number, number][] = drawingCoords.map(c => [c.lat, c.lng]);
            L.polygon(points, {
              color: '#8b5cf6',
              weight: 2,
              fillColor: '#8b5cf6',
              fillOpacity: 0.2,
              dashArray: '5, 5'
            }).addTo(map);
          } else if (drawingMode === 'circle' && drawingCoords.length > 0) {
            const points: [number, number][] = drawingCoords.map(c => [c.lat, c.lng]);
            L.polygon(points, {
              color: '#8b5cf6',
              weight: 2,
              fillColor: '#8b5cf6',
              fillOpacity: 0.2
            }).addTo(map);
          }
        }

        // Dessiner les mesures
        if (measurementPoints.length > 0) {
          const points: [number, number][] = measurementPoints.map(p => [p.lat, p.lng]);
          
          if (measurementMode === 'distance' && points.length === 2) {
            L.polyline(points, {
              color: '#3b82f6',
              weight: 3,
              dashArray: '10, 5'
            }).addTo(map);
          } else if ((measurementMode === 'area' || measurementMode === 'perimeter') && points.length >= 2) {
            L.polygon(points, {
              color: '#3b82f6',
              weight: 3,
              fillColor: measurementMode === 'area' ? '#3b82f6' : 'transparent',
              fillOpacity: 0.1,
              dashArray: '10, 5'
            }).addTo(map);
          }

          // Marqueurs pour chaque point
          measurementPoints.forEach((point, index) => {
            const markerIcon = L.divIcon({
              className: 'measurement-marker',
              html: `<div style="
                background: #3b82f6;
                color: white;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                font-size: 12px;
              ">${index + 1}</div>`,
              iconSize: [24, 24]
            });
            L.marker([point.lat, point.lng], { icon: markerIcon }).addTo(map);
          });
        }

        // Ajuster la vue
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour de la carte:', error);
      }
    };

    updateMapWithParcels();
  }, [results, drawingCoords, measurementPoints, currentZoom, drawingMode, measurementMode]);

  // Appliquer les coordonnées de dessin aux filtres
  useEffect(() => {
    if (drawingMode === 'none' && drawingCoords.length > 0) {
      setFilters({
        ...filters,
        drawingCoords
      });
      addToHistory(filters, `Zone dessinée (${drawingCoords.length} points)`);
    }
  }, [drawingMode, drawingCoords]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className={`flex-1 ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-4rem)]'}`}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          </div>
        ) : (
          <div 
            ref={mapRef} 
            className="w-full h-full"
          />
        )}

        {/* Barre de recherche avancée */}
        <CadastralAdvancedSearchBar
          query={searchQuery}
          onQueryChange={(q) => {
            setSearchQuery(q);
            setFilters({ ...filters, parcelNumber: q });
          }}
          onClear={handleClearSearch}
          filters={filters}
          onFiltersChange={setFilters}
          results={results}
          totalCount={totalCount}
          onUseGeolocation={handleUseGeolocation}
          onToggleFullscreen={handleToggleFullscreen}
          compact={!!selectedParcel && isMobile}
        />

        {/* Résultats de recherche */}
        <CadastralSearchResults
          results={results}
          onSelectParcel={handleSelectParcel}
          selectedParcelId={selectedParcel?.id}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={setSortBy}
          onSortOrderChange={setSortOrder}
          compact={!!selectedParcel && isMobile}
        />

        {/* Outils de dessin */}
        <CadastralDrawingTools
          mode={drawingMode}
          onModeChange={(mode) => {
            if (mode !== 'none') {
              startDrawing(mode);
              clearMeasurement();
            } else {
              const coords = finishDrawing();
              if (coords && coords.length > 0) {
                setFilters({ ...filters, drawingCoords: coords });
              }
            }
          }}
          onClear={clearDrawing}
          onFinish={finishDrawing}
          compact={!!selectedParcel && isMobile}
        />

        {/* Outils de mesure */}
        <CadastralMeasurementTools
          mode={measurementMode}
          result={measurementResult}
          onModeChange={(mode) => {
            if (mode !== 'none') {
              startMeasurement(mode);
              clearDrawing();
            } else {
              clearMeasurement();
            }
          }}
          onClear={clearMeasurement}
          compact={!!selectedParcel && isMobile}
        />

        {/* Légende */}
        <CadastralMapLegend compact={!!selectedParcel && isMobile} />

        {/* Panneau d'information de la parcelle sélectionnée */}
        {selectedParcel && (
          <div className={`absolute ${isMobile ? 'bottom-0 left-0 right-0' : 'top-20 right-4'} z-[1000] ${isMobile ? 'w-full' : 'w-80'} max-h-[50vh] overflow-y-auto`}>
            <Card className="shadow-lg backdrop-blur-sm bg-background/95">
              <CardContent className={`${isMobile ? 'p-3' : 'p-4'} space-y-3`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono font-bold text-primary text-sm">{selectedParcel.parcel_number}</p>
                    <p className="text-xs text-muted-foreground">{selectedParcel.current_owner_name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setSelectedParcel(null)}
                  >
                    ✕
                  </Button>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Surface:</span>
                    <p className="font-medium">
                      {selectedParcel.gps_coordinates && selectedParcel.gps_coordinates.length >= 3
                        ? calculateAreaFromCoordinates(selectedParcel.gps_coordinates).toLocaleString(undefined, { maximumFractionDigits: 2 })
                        : selectedParcel.area_sqm?.toLocaleString()
                      } m²
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Localisation:</span>
                    <p className="font-medium">
                      {selectedParcel.province} - {selectedParcel.ville}
                      {selectedParcel.commune && <><br />{selectedParcel.commune}</>}
                      {selectedParcel.quartier && ` ${selectedParcel.quartier}`}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => navigate(`/services?search=${encodeURIComponent(selectedParcel.parcel_number)}&from=map`)}
                      className="w-full text-xs h-8"
                      size="sm"
                    >
                      Plus de données
                    </Button>
                    <Button
                      onClick={() => {
                        const phoneNumber = '243816996077';
                        const message = 'Bonjour, j\'ai besoin d\'aide concernant les informations cadastrales.';
                        const encodedMessage = encodeURIComponent(message);
                        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
                        window.open(whatsappUrl, '_blank');
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-8"
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      Aide
                    </Button>
                  </div>
                  
                  {hasIncompleteData && (
                    <Alert 
                      className="bg-orange-50 border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors py-2"
                      onClick={() => setShowContributionDialog(true)}
                    >
                      <AlertTriangle className="h-3 w-3 text-orange-600" />
                      <AlertDescription className="text-orange-800 text-[10px] leading-tight">
                        Données incomplètes, cliquez pour compléter.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Dialogs */}
      <CCCIntroDialog
        open={showIntroDialog}
        onOpenChange={setShowIntroDialog}
        parcelNumber={searchQuery}
        onContinue={() => {
          setShowIntroDialog(false);
          setShowContributionDialog(true);
        }}
      />
      
      <CadastralContributionDialog
        open={showContributionDialog}
        onOpenChange={setShowContributionDialog}
        parcelNumber={searchQuery}
      />

      <ParcelComparisonDialog
        open={showComparison}
        onOpenChange={setShowComparison}
        parcels={comparisonParcels}
      />
    </div>
  );
};

export default CadastralMap;

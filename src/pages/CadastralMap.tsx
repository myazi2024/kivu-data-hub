import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Loader2, Search, X, MessageCircle, AlertTriangle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import CCCIntroDialog from '@/components/cadastral/CCCIntroDialog';
import CadastralContributionDialog from '@/components/cadastral/CadastralContributionDialog';
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
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [parcels, setParcels] = useState<ParcelData[]>([]);
  const [filteredParcels, setFilteredParcels] = useState<ParcelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParcel, setSelectedParcel] = useState<ParcelData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<ParcelData[]>([]);
  const [showIntroDialog, setShowIntroDialog] = useState(false);
  const [showContributionDialog, setShowContributionDialog] = useState(false);
  const [selectedParcelHistory, setSelectedParcelHistory] = useState<ParcelHistoryData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasIncompleteData, setHasIncompleteData] = useState(false);

  // Reset hasScrolledToBottom when dialog closes
  useEffect(() => {
    if (!showIntroDialog) {
      // Reset any state if needed
    }
  }, [showIntroDialog]);

  // Charger toutes les parcelles depuis Supabase
  useEffect(() => {
    const loadParcels = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('cadastral_parcels')
          .select('id, parcel_number, gps_coordinates, parcel_sides, latitude, longitude, current_owner_name, area_sqm, province, ville, commune, quartier')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .is('deleted_at', null)
          .limit(500); // Limiter à 500 parcelles pour performance

        if (error) {
          console.error('Erreur chargement parcelles:', error);
          toast.error('Erreur lors du chargement des parcelles');
          return;
        }

        setParcels(data || []);
        setFilteredParcels(data || []);
      } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors du chargement des parcelles');
      } finally {
        setLoading(false);
      }
    };

    loadParcels();
  }, []);

  // Recherche prédictive
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchSuggestions([]);
      setFilteredParcels(parcels);
      return;
    }

    const filtered = parcels.filter(parcel => 
      parcel.parcel_number.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setSearchSuggestions(filtered.slice(0, 5)); // Max 5 suggestions
    setFilteredParcels(filtered);
  }, [searchQuery, parcels]);

  // Charger l'historique complet d'une parcelle
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
      
      // Vérifier si les données sont incomplètes
      const hasLocation = !!(selectedParcel?.province && selectedParcel?.ville);
      const hasGPS = !!(selectedParcel?.gps_coordinates && Array.isArray(selectedParcel.gps_coordinates) && selectedParcel.gps_coordinates.length > 0);
      const hasLocationHistory = hasLocation || historyData.boundary_history.length > 0 || hasGPS;
      const hasHistory = historyData.ownership_history.length > 0;
      const hasObligations = historyData.tax_history.length > 0 || historyData.mortgage_history.length > 0;

      // Considérer les données incomplètes si au moins 2 catégories sur 3 sont vides
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
    setSearchSuggestions([]);
    loadParcelHistory(parcel.id);
    
    // Centrer la carte sur la parcelle sélectionnée
    if (mapInstanceRef.current && parcel.latitude && parcel.longitude) {
      const L = (window as any).L;
      if (L) {
        mapInstanceRef.current.setView([parcel.latitude, parcel.longitude], 16);
      }
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchSuggestions([]);
    setFilteredParcels(parcels);
    setSelectedParcel(null);
  };

  // Initialiser la carte (uniquement quand loading = false)
  useEffect(() => {
    if (loading) return; // Attendre que les données soient chargées

    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      try {
        const L = await import('leaflet');

        // Fix pour les icônes Leaflet
        delete (L as any).Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Créer la carte centrée sur Goma, RDC
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const map = L.map(mapRef.current, {
          zoomControl: !isMobile,
          scrollWheelZoom: !isMobile,
          doubleClickZoom: !isMobile,
          dragging: true
        }).setView([-1.6794, 29.2273], 12);

        // Ajouter la couche de tuiles OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        mapInstanceRef.current = map;

        // Redessiner la carte après initialisation
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
  }, [loading]);

  // Fonction pour calculer la distance entre deux points GPS (Haversine)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance en mètres
  };

  // Fonction pour calculer la surface d'une parcelle à partir de ses coordonnées GPS
  const calculateAreaFromCoordinates = (coordinates: any[]): number => {
    if (!coordinates || coordinates.length < 3) return 0;

    // Convertir les coordonnées géographiques en coordonnées cartésiennes approximatives
    // en utilisant une projection locale (UTM approximatif)
    const avgLat = coordinates.reduce((sum, coord) => sum + coord.lat, 0) / coordinates.length;
    const metersPerDegreeLat = 111320; // mètres par degré de latitude
    const metersPerDegreeLng = 111320 * Math.cos(avgLat * Math.PI / 180); // ajusté pour la longitude

    // Convertir en coordonnées cartésiennes (mètres)
    const cartesianCoords = coordinates.map(coord => ({
      x: coord.lng * metersPerDegreeLng,
      y: coord.lat * metersPerDegreeLat
    }));

    // Appliquer la formule de Shoelace pour calculer la surface
    let area = 0;
    for (let i = 0; i < cartesianCoords.length; i++) {
      const j = (i + 1) % cartesianCoords.length;
      area += cartesianCoords[i].x * cartesianCoords[j].y;
      area -= cartesianCoords[j].x * cartesianCoords[i].y;
    }

    return Math.abs(area / 2); // Surface en mètres carrés
  };

  // Afficher les parcelles filtrées sur la carte
  useEffect(() => {
    const updateMapWithParcels = async () => {
      if (!mapInstanceRef.current || filteredParcels.length === 0) return;

      try {
        const L = await import('leaflet');
        const map = mapInstanceRef.current;
        
        // Nettoyer les marqueurs existants
        map.eachLayer((layer: any) => {
          if (layer instanceof L.Marker || layer instanceof L.Polygon) {
            map.removeLayer(layer);
          }
        });

        const bounds = L.latLngBounds([]);

        // Ajouter chaque parcelle filtrée sur la carte
        filteredParcels.forEach((parcel) => {
          // Créer un polygone si nous avons des coordonnées GPS
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

            // Extraire les dimensions exactes depuis parcel_sides (formulaire CCC)
            const parcelSides = parcel.parcel_sides && Array.isArray(parcel.parcel_sides)
              ? parcel.parcel_sides
              : null;

            // Ajouter les dimensions sur chaque côté
            parcel.gps_coordinates.forEach((coord: any, index: number) => {
              const nextIndex = (index + 1) % parcel.gps_coordinates.length;
              const nextCoord = parcel.gps_coordinates[nextIndex];
              
              // Utiliser la dimension exacte du formulaire CCC si disponible
              let distance: number;
              if (parcelSides && parcelSides[index] && parcelSides[index].length) {
                distance = parseFloat(parcelSides[index].length);
              } else {
                // Sinon, calculer à partir des GPS (fallback)
                distance = calculateDistance(coord.lat, coord.lng, nextCoord.lat, nextCoord.lng);
              }
              
              // Calculer le point médian
              const midLat = (coord.lat + nextCoord.lat) / 2;
              const midLng = (coord.lng + nextCoord.lng) / 2;
              
              // Créer une icône personnalisée pour afficher la dimension
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
              
              // Ajouter le marqueur de dimension
              L.marker([midLat, midLng], { icon: dimensionIcon }).addTo(map);
            });


            polygon.on('click', () => {
              setSelectedParcel(parcel);
            });

            bounds.extend(polygon.getBounds());
          } else if (parcel.latitude && parcel.longitude) {
            // Si pas de polygone mais des coordonnées, ajouter un marqueur
            const marker = L.marker([parcel.latitude, parcel.longitude]).addTo(map);

            marker.on('click', () => {
              setSelectedParcel(parcel);
            });

            bounds.extend([parcel.latitude, parcel.longitude]);
          }
        });

        // Ajuster la vue pour inclure toutes les parcelles
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour de la carte:', error);
      }
    };

    updateMapWithParcels();
  }, [filteredParcels]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1" style={{ height: 'calc(100vh - 4rem)' }}>
        {/* Carte en plein écran */}
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Chargement des parcelles...</p>
            </div>
          </div>
        ) : (
          <div 
            ref={mapRef} 
            style={{ width: '100%', height: 'calc(100vh - 4rem)' }}
          />
        )}

        {/* Barre de recherche en overlay */}
        <div className="absolute top-4 left-4 right-4 md:left-6 md:right-auto md:w-96 z-[1000]">
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher une parcelle par numéro..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value.replace(/\D/g, ''))}
                    className="pl-10 pr-10"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={handleClearSearch}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Suggestions de recherche */}
                {searchSuggestions.length > 0 && (
                  <div className="bg-background border rounded-md shadow-sm">
                    {searchSuggestions.map((parcel) => (
                      <button
                        key={parcel.id}
                        onClick={() => handleSelectParcel(parcel)}
                        className="w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b last:border-b-0"
                      >
                        <div className="font-mono font-semibold text-sm">{parcel.parcel_number}</div>
                        <div className="text-xs text-muted-foreground">
                          {parcel.ville || parcel.province}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Résumé de recherche */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {searchQuery ? `${filteredParcels.length} résultat(s)` : `${parcels.length} parcelles au total`}
                  </span>
                  {selectedParcel && (
                    <span className="text-primary font-medium">
                      Parcelle sélectionnée
                    </span>
                  )}
                </div>

                {/* Bouton recherche approfondie si aucun résultat */}
                {searchQuery && filteredParcels.length === 0 && (
                  <Button
                    onClick={() => {
                      console.log("Bouton Recherche approfondie cliqué");
                      setShowIntroDialog(true);
                    }}
                    className="w-full bg-seloger-red hover:bg-seloger-red/90 text-white text-xs sm:text-sm px-3 py-2 h-auto rounded-lg shadow-sm hover:shadow-md transition-all duration-300 font-medium"
                  >
                    <Search className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                    Recherche approfondie
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panneau d'information de la parcelle sélectionnée */}
        {selectedParcel && (
          <div className="absolute bottom-4 right-4 z-[1000] w-80 max-w-[calc(100vw-2rem)]">
            <Card className="shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Parcelle sélectionnée
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 -mt-1"
                    onClick={() => setSelectedParcel(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-mono font-bold text-primary">{selectedParcel.parcel_number}</p>
                </div>
                <div className="space-y-2">
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
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      onClick={() => navigate(`/services?search=${encodeURIComponent(selectedParcel.parcel_number)}&from=map`)}
                      className="w-full"
                      size="sm"
                      disabled={loadingHistory}
                    >
                      {isMobile ? "Plus de données" : "Afficher plus de données"}
                    </Button>
                    {hasIncompleteData && !loadingHistory && (
                      <Button
                        onClick={() => setShowContributionDialog(true)}
                        variant="outline"
                        size="sm"
                        className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        {isMobile ? "Données" : "Données manquantes"}
                      </Button>
                    )}
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
                      className="w-full col-start-3"
                      title="Besoin d'aide ?"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {!isMobile && <span className="ml-1">Besoin d'aide ?</span>}
                    </Button>
                  </div>
                  
                  {hasIncompleteData && (
                    <p className="text-xs text-muted-foreground text-center">
                      Cette parcelle a des données incomplètes. Complétez-les pour débloquer tous les services.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Légende */}
        <div className="absolute top-4 right-4 z-[1000] hidden md:block">
          <Card className="shadow-lg w-64">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Légende</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500/20 border-2 border-red-500 rounded"></div>
                <span>Parcelle avec bornage</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-500" />
                <span>Parcelle sans bornage</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Dialog d'introduction CCC */}
      {showIntroDialog && (
        <CCCIntroDialog
          open={showIntroDialog}
          onOpenChange={(open) => {
            setShowIntroDialog(open);
            if (!open) {
              console.log("Dialog d'introduction fermé");
            }
          }}
          onContinue={() => {
            console.log("Passage au formulaire CCC");
            setShowIntroDialog(false);
            setShowContributionDialog(true);
          }}
          parcelNumber={searchQuery}
        />
      )}

      {/* Dialog de contribution */}
      {showContributionDialog && (
        <CadastralContributionDialog
          open={showContributionDialog}
          onOpenChange={(open) => {
            setShowContributionDialog(open);
            if (!open) {
              console.log("Dialog de contribution fermé");
            }
          }}
          parcelNumber={selectedParcel?.parcel_number || searchQuery}
        />
      )}
    </div>
  );
};

export default CadastralMap;

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { supabase } from '@/integrations/supabase/client';
import { MapPin, Loader2, Search, X, MessageCircle, AlertTriangle, Settings2, Star, Sparkles, FileEdit, HelpCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import CCCIntroDialog from '@/components/cadastral/CCCIntroDialog';
import CadastralContributionDialog from '@/components/cadastral/CadastralContributionDialog';
import AdvancedSearchFilters from '@/components/cadastral/AdvancedSearchFilters';
import SearchHistory from '@/components/cadastral/SearchHistory';
import MutationRequestDialog from '@/components/cadastral/MutationRequestDialog';
import { useAdvancedCadastralSearch } from '@/hooks/useAdvancedCadastralSearch';
import { useSearchHistory } from '@/hooks/useSearchHistory';
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
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showManualSearchNotification, setShowManualSearchNotification] = useState(false);
  const [isSearchBarActive, setIsSearchBarActive] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Advanced search hooks
  const advancedSearch = useAdvancedCadastralSearch();
  const searchHistory = useSearchHistory();

  // Reset hasScrolledToBottom when dialog closes
  useEffect(() => {
    if (!showIntroDialog) {
      // Reset any state if needed
      setShowManualSearchNotification(false);
    }
  }, [showIntroDialog]);

  // Ref pour tracker si l'utilisateur a cliqué sur le bouton (empêche réapparition)
  const notificationDismissedRef = useRef(false);

  // Timer d'inactivité pour afficher la notification sur le bouton "Recherche manuelle"
  useEffect(() => {
    // Afficher la notification après 5 secondes d'inactivité quand aucun résultat
    if (searchQuery && filteredParcels.length === 0 && !showManualSearchNotification && !notificationDismissedRef.current) {
      inactivityTimerRef.current = setTimeout(() => {
        setShowManualSearchNotification(true);
      }, 5000);
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [searchQuery, filteredParcels.length, showManualSearchNotification]);

  // Reset le flag quand la recherche change
  useEffect(() => {
    notificationDismissedRef.current = false;
  }, [searchQuery]);

  // Réinitialiser le timer quand l'utilisateur interagit
  const handleManualSearchClick = useCallback(() => {
    notificationDismissedRef.current = true;
    setShowManualSearchNotification(false);
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    setShowIntroDialog(true);
  }, []);

  // Charger les parcelles depuis cadastral_parcels (accès public)
  useEffect(() => {
    const loadParcels = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('cadastral_parcels')
          .select('id, parcel_number, gps_coordinates, parcel_sides, current_owner_name, area_sqm, province, ville, commune, quartier, latitude, longitude')
          .is('deleted_at', null)
          .limit(500); // Limiter à 500 parcelles pour performance

        if (error) {
          console.error('Erreur chargement parcelles:', error);
          toast.error('Erreur lors du chargement des parcelles');
          return;
        }

        // Transformer les données pour extraire latitude/longitude
        const transformedData = (data || []).map(parcel => {
          let latitude = parcel.latitude;
          let longitude = parcel.longitude;
          
          // Si pas de lat/lng direct, extraire des gps_coordinates
          if (!latitude && !longitude && parcel.gps_coordinates && Array.isArray(parcel.gps_coordinates) && parcel.gps_coordinates.length > 0) {
            const firstCoord = parcel.gps_coordinates[0] as any;
            latitude = firstCoord.lat || firstCoord.latitude;
            longitude = firstCoord.lng || firstCoord.longitude;
          }

          return {
            ...parcel,
            latitude: latitude || 0,
            longitude: longitude || 0
          };
        }).filter(p => p.latitude !== 0 && p.longitude !== 0);

        setParcels(transformedData);
        setFilteredParcels(transformedData);
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
      // Récupérer l'historique - ces tables sont publiques
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

  // Advanced search handlers
  const handleApplyFilters = async () => {
    const results = await advancedSearch.searchParcels();
    if (results.length > 0) {
      setFilteredParcels(results);
      toast.success(`${results.length} parcelle(s) trouvée(s)`);
      // Fermer le sheet après application
      setShowAdvancedSearch(false);
    } else {
      toast.error('Aucune parcelle ne correspond aux critères');
    }
    // Sauvegarder dans l'historique avec les filtres
    const filterSummary = Object.entries(advancedSearch.filters)
      .filter(([_, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}:${v}`)
      .join(', ');
    if (filterSummary) {
      searchHistory.addToHistory(`Filtres: ${filterSummary}`, advancedSearch.filters);
    }
  };

  const handleSelectFromHistory = (query: string) => {
    setSearchQuery(query);
    setShowAdvancedSearch(false);
    const filtered = parcels.filter(p => p.parcel_number.toLowerCase().includes(query.toLowerCase()));
    setFilteredParcels(filtered);
  };

  const handleSelectFromFavorites = (parcelNumber: string) => {
    setShowAdvancedSearch(false);
    const parcel = parcels.find(p => p.parcel_number === parcelNumber);
    if (parcel) {
      handleSelectParcel(parcel);
    }
  };

  const handleAddToFavorites = () => {
    if (selectedParcel) {
      searchHistory.addToFavorites({
        parcel_number: selectedParcel.parcel_number,
        parcel_id: selectedParcel.id,
        owner_name: selectedParcel.current_owner_name,
        location: `${selectedParcel.province || ''} ${selectedParcel.ville || ''} ${selectedParcel.commune || ''}`.trim()
      });
      toast.success('Parcelle ajoutée aux favoris');
    }
  };

  const handleClearFiltersAndReset = () => {
    advancedSearch.clearFilters();
    setFilteredParcels(parcels);
    toast.success('Filtres réinitialisés');
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

        {/* Overlay de recherche - Design moderne avec animation de rebond */}
        <div 
          className={`absolute left-3 top-3 z-[1000] ${isMobile ? 'right-3' : 'w-96'} transform-gpu ${
            isSearchBarActive || selectedParcel 
              ? 'animate-search-rise' 
              : 'translate-y-[calc(100dvh-12rem)]'
          }`}
        >
          <div className="bg-background/95 backdrop-blur-md rounded-2xl shadow-xl border border-border/50 overflow-hidden">
            <div className={`${selectedParcel && isMobile ? 'p-2' : 'p-2.5'}`}>
              {/* Barre de recherche */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${selectedParcel && isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-muted-foreground`}>
                    <Search className="h-full w-full" />
                  </div>
                  <Input
                    placeholder={selectedParcel && isMobile ? "Rechercher..." : "Référence cadastrale..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchBarActive(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        searchHistory.addToHistory(searchQuery);
                      }
                    }}
                    className={`${selectedParcel && isMobile ? 'h-8 text-xs pl-8' : 'h-9 text-sm pl-9'} pr-8 rounded-xl border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/50 transition-all`}
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`absolute right-1 top-1/2 -translate-y-1/2 ${selectedParcel && isMobile ? 'h-6 w-6' : 'h-7 w-7'} p-0 rounded-full hover:bg-destructive/10`}
                      onClick={handleClearSearch}
                    >
                      <X className={`${selectedParcel && isMobile ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-muted-foreground`} />
                    </Button>
                  )}
                </div>
                
                {/* Bouton Recherche Avancée - Design compact */}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setIsSearchBarActive(true);
                    setShowAdvancedSearch(!showAdvancedSearch);
                  }}
                  className={`${selectedParcel && isMobile ? 'h-8 w-8' : 'h-9 px-3'} shrink-0 rounded-xl ${showAdvancedSearch ? 'bg-primary/10 text-primary' : 'bg-muted/50'} hover:bg-muted transition-colors`}
                >
                  <Settings2 className={`${selectedParcel && isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} transition-transform duration-300 ${showAdvancedSearch ? 'rotate-90' : ''}`} />
                  {!(selectedParcel && isMobile) && !isMobile && <span className="ml-1.5 text-xs font-medium">Filtres</span>}
                </Button>
              </div>

              {/* Section Recherche Avancée - Déroulée dans la barre */}
              <div className={`overflow-hidden transition-all duration-300 ease-out ${showAdvancedSearch ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                <div className="border-t border-border/30 pt-3 space-y-3">
                  {advancedSearch.loading && (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="ml-2 text-xs text-muted-foreground">Recherche...</span>
                    </div>
                  )}
                  
                  <AdvancedSearchFilters
                    filters={advancedSearch.filters}
                    onFiltersChange={advancedSearch.updateFilters}
                    onSearch={handleApplyFilters}
                    onClear={handleClearFiltersAndReset}
                    isCompact={true}
                  />

                  <SearchHistory
                    onSelectHistory={handleSelectFromHistory}
                    onSelectFavorite={handleSelectFromFavorites}
                    isCompact={true}
                  />
                </div>
              </div>

              {/* Suggestions - Design moderne */}
              {searchSuggestions.length > 0 && !(selectedParcel && isMobile) && !showAdvancedSearch && (
                <div className="mt-2 rounded-xl bg-muted/30 overflow-hidden max-h-36 overflow-y-auto">
                  {searchSuggestions.map((parcel, index) => (
                    <button
                      key={parcel.id}
                      onClick={() => handleSelectParcel(parcel)}
                      className={`w-full text-left px-3 py-2 hover:bg-primary/5 transition-colors flex items-center justify-between ${index !== searchSuggestions.length - 1 ? 'border-b border-border/30' : ''}`}
                    >
                      <div>
                        <div className="font-mono font-bold text-xs text-primary">{parcel.parcel_number}</div>
                        <div className="text-[10px] text-muted-foreground">{parcel.ville || parcel.province}</div>
                      </div>
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {/* Footer - Résumé et actions */}
              {!(selectedParcel && isMobile) && !showAdvancedSearch && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {searchQuery ? `${filteredParcels.length} résultat(s)` : `${parcels.length} parcelles`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bouton Contribuer détaché - Animation élégante */}
        {searchQuery && filteredParcels.length === 0 && !selectedParcel && (
          <div className={`absolute ${isMobile ? 'left-3 right-3' : 'left-3 w-96'} z-[1000] animate-fade-in`}
            style={{ top: isSearchBarActive ? 'calc(var(--search-bar-height, 80px) + 1rem)' : 'auto', bottom: !isSearchBarActive ? '8rem' : 'auto' }}
          >
            <div className="relative">
              {/* Notification flottante au-dessus du bouton */}
              {showManualSearchNotification && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 animate-scale-in">
                  <div className="bg-primary text-primary-foreground text-xs px-4 py-2.5 rounded-xl shadow-lg text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 shrink-0" />
                      <span>Cette parcelle n'existe pas encore</span>
                    </div>
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-primary" />
                </div>
              )}
              
              {/* Bouton principal large et visible */}
              <Button
                variant="default"
                size="lg"
                className="w-full h-12 text-sm font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary animate-scale-in"
                onClick={handleManualSearchClick}
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Contribuer cette parcelle</div>
                    <div className="text-[10px] opacity-80 font-normal">Ajoutez "{searchQuery}" à la base de données</div>
                  </div>
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* Panneau d'information de la parcelle sélectionnée - Design moderne */}
        {selectedParcel && (
          <div className={`absolute ${isMobile ? 'bottom-2 left-2 right-2' : 'bottom-4 right-4 w-80'} z-[1000]`}>
            <div className="bg-background/95 backdrop-blur-md rounded-2xl shadow-xl border border-border/50 overflow-hidden">
              {/* Header compact */}
              <div className="px-3 py-2.5 border-b border-border/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-sm text-primary leading-none">{selectedParcel.parcel_number}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{selectedParcel.ville || selectedParcel.province}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 w-7 p-0 rounded-full ${searchHistory.isFavorite(selectedParcel.id) ? 'text-yellow-500 bg-yellow-500/10' : 'text-muted-foreground hover:bg-muted'}`}
                    onClick={handleAddToFavorites}
                  >
                    <Star className={`h-3.5 w-3.5 ${searchHistory.isFavorite(selectedParcel.id) ? 'fill-yellow-500' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setSelectedParcel(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Contenu */}
              <div className="px-3 py-2.5">
                {/* Infos rapides en badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50 text-[10px]">
                    <span className="text-muted-foreground">Surface:</span>
                    <span className="font-semibold">
                      {selectedParcel.gps_coordinates && selectedParcel.gps_coordinates.length >= 3
                        ? calculateAreaFromCoordinates(selectedParcel.gps_coordinates).toLocaleString(undefined, { maximumFractionDigits: 0 })
                        : selectedParcel.area_sqm?.toLocaleString()
                      } m²
                    </span>
                  </div>
                  {selectedParcel.commune && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50 text-[10px]">
                      <span className="font-medium">{selectedParcel.commune}</span>
                    </div>
                  )}
                  {selectedParcel.quartier && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50 text-[10px]">
                      <span className="font-medium">{selectedParcel.quartier}</span>
                    </div>
                  )}
                </div>

                {/* Boutons d'action - Design moderne */}
                <div className="flex gap-1.5">
                  <Button
                    onClick={() => navigate(`/services?search=${encodeURIComponent(selectedParcel.parcel_number)}&from=map`)}
                    className="flex-1 h-9 text-xs rounded-xl font-medium"
                    size="sm"
                    disabled={loadingHistory}
                  >
                    {loadingHistory ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Search className="h-3 w-3 mr-1.5" />
                        {isMobile ? "Données" : "Plus de données"}
                      </>
                    )}
                  </Button>
                  <MutationRequestDialog
                    parcelNumber={selectedParcel.parcel_number}
                    trigger={
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 h-9 text-xs rounded-xl font-medium"
                      >
                        <FileEdit className="h-3 w-3 mr-1.5" />
                        Mutation
                      </Button>
                    }
                  />
                  <Button
                    onClick={() => {
                      const phoneNumber = '243816996077';
                      const message = 'Bonjour, j\'ai besoin d\'aide concernant les informations cadastrales.';
                      window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
                    }}
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0 rounded-xl shrink-0"
                    title="Aide WhatsApp"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </Button>
                </div>
                
                {/* Alerte données incomplètes */}
                {hasIncompleteData && (
                  <button 
                    onClick={() => setShowContributionDialog(true)}
                    className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/15 transition-colors text-left"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                    <span className="text-[10px] text-orange-700 leading-tight">
                      Données incomplètes - Cliquez pour contribuer
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Légende - Design moderne compact */}
        <div className="absolute top-3 right-3 z-[1000] hidden md:block">
          <div className="bg-background/95 backdrop-blur-md rounded-xl shadow-lg border border-border/50 p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Légende</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3.5 h-3.5 bg-red-500/20 border-2 border-red-500 rounded" />
                <span className="text-muted-foreground">Avec bornage</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <MapPin className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-muted-foreground">Sans bornage</span>
              </div>
            </div>
          </div>
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

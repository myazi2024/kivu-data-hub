import React, { useEffect, useRef, useState } from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';

interface ParcelData {
  id: string;
  parcel_number: string;
  gps_coordinates: any; // Json type from Supabase
  latitude: number;
  longitude: number;
  current_owner_name: string;
  area_sqm: number;
  province: string;
  ville: string;
  commune: string;
  quartier: string;
}

const CadastralMap = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [parcels, setParcels] = useState<ParcelData[]>([]);
  const [filteredParcels, setFilteredParcels] = useState<ParcelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParcel, setSelectedParcel] = useState<ParcelData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<ParcelData[]>([]);

  // Charger toutes les parcelles depuis Supabase
  useEffect(() => {
    const loadParcels = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('cadastral_parcels')
          .select('id, parcel_number, gps_coordinates, latitude, longitude, current_owner_name, area_sqm, province, ville, commune, quartier')
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

  const handleSelectParcel = (parcel: ParcelData) => {
    setSelectedParcel(parcel);
    setSearchQuery(parcel.parcel_number);
    setSearchSuggestions([]);
    
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

  // Initialiser la carte
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      try {
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');

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
        }).setView([-1.6794, 29.2273], 12); // Goma coordinates

        // Ajouter la couche de tuiles OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        mapInstanceRef.current = map;

        // S'assurer que la carte se redessine correctement
        map.whenReady(() => {
          setTimeout(() => map.invalidateSize(), 0);
        });

      } catch (error) {
        console.error('Erreur lors de l\'initialisation de la carte:', error);
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

            polygon.bindPopup(`
              <div style="font-family: system-ui; min-width: 200px;">
                <strong style="font-size: 14px; color: #ef4444;">📍 ${parcel.parcel_number}</strong><br>
                <div style="margin-top: 8px; font-size: 12px;">
                  <strong>Propriétaire:</strong> ${parcel.current_owner_name || 'N/A'}<br>
                  <strong>Surface:</strong> ${parcel.area_sqm?.toLocaleString() || 'N/A'} m²<br>
                  <strong>Localisation:</strong><br>
                  ${parcel.province || 'N/A'} - ${parcel.ville || 'N/A'}<br>
                  ${parcel.commune || ''} ${parcel.quartier || ''}
                </div>
              </div>
            `);

            polygon.on('click', () => {
              setSelectedParcel(parcel);
            });

            bounds.extend(polygon.getBounds());
          } else if (parcel.latitude && parcel.longitude) {
            // Si pas de polygone mais des coordonnées, ajouter un marqueur
            const marker = L.marker([parcel.latitude, parcel.longitude]).addTo(map);
            marker.bindPopup(`
              <div style="font-family: system-ui; min-width: 200px;">
                <strong style="font-size: 14px; color: #ef4444;">📍 ${parcel.parcel_number}</strong><br>
                <div style="margin-top: 8px; font-size: 12px;">
                  <strong>Propriétaire:</strong> ${parcel.current_owner_name || 'N/A'}<br>
                  <strong>Surface:</strong> ${parcel.area_sqm?.toLocaleString() || 'N/A'} m²<br>
                  <strong>Localisation:</strong><br>
                  ${parcel.province || 'N/A'} - ${parcel.ville || 'N/A'}<br>
                  ${parcel.commune || ''} ${parcel.quartier || ''}
                </div>
              </div>
            `);

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
      
      <main className="flex-1 relative" style={{ height: 'calc(100vh - 4rem)' }}>
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
            style={{ width: '100%', height: '100%' }}
            className="relative"
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
                    onChange={(e) => setSearchQuery(e.target.value)}
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
                          {parcel.current_owner_name} • {parcel.ville || parcel.province}
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
                    <span className="text-muted-foreground">Propriétaire:</span>
                    <p className="font-medium">{selectedParcel.current_owner_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Surface:</span>
                    <p className="font-medium">{selectedParcel.area_sqm?.toLocaleString()} m²</p>
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
    </div>
  );
};

export default CadastralMap;

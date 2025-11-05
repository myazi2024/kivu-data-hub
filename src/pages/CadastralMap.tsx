import React, { useEffect, useRef, useState } from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Loader2, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [selectedParcel, setSelectedParcel] = useState<ParcelData | null>(null);

  // Charger toutes les parcelles depuis Supabase
  useEffect(() => {
    const loadParcels = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('cadastral_parcels')
          .select('id, parcel_number, gps_coordinates, latitude, longitude, current_owner_name, area_sqm, province, ville, commune, quartier')
          .not('gps_coordinates', 'is', null)
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
      } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors du chargement des parcelles');
      } finally {
        setLoading(false);
      }
    };

    loadParcels();
  }, []);

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
        const map = L.map(mapRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
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

  // Afficher toutes les parcelles sur la carte
  useEffect(() => {
    const updateMapWithParcels = async () => {
      if (!mapInstanceRef.current || parcels.length === 0) return;

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

        // Ajouter chaque parcelle sur la carte
        parcels.forEach((parcel) => {
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
  }, [parcels]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* En-tête */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <MapPin className="h-8 w-8 text-primary" />
              Carte Cadastrale - Toutes les Parcelles
            </h1>
            <p className="text-muted-foreground">
              Visualisation interactive de toutes les parcelles cadastrales enregistrées
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Carte principale */}
            <div className="lg:col-span-3">
              <Card className="h-[calc(100vh-200px)]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Carte Interactive
                      </CardTitle>
                      <CardDescription>
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Chargement des parcelles...
                          </span>
                        ) : (
                          `${parcels.length} parcelle(s) affichée(s)`
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="h-[calc(100%-80px)]">
                  {loading ? (
                    <div className="h-full flex items-center justify-center bg-muted/50 rounded-lg">
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-muted-foreground">Chargement des parcelles...</p>
                      </div>
                    </div>
                  ) : (
                    <div 
                      ref={mapRef} 
                      className="w-full h-full rounded-lg border border-border"
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Panneau d'information */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Statistiques */}
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">
                        {parcels.length}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Parcelles cadastrales
                      </div>
                    </div>
                  </div>

                  {/* Parcelle sélectionnée */}
                  {selectedParcel && (
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <h4 className="font-semibold text-sm text-primary">
                        Parcelle sélectionnée
                      </h4>
                      <div className="space-y-1 text-xs">
                        <p className="font-mono font-bold">{selectedParcel.parcel_number}</p>
                        <p><strong>Propriétaire:</strong> {selectedParcel.current_owner_name}</p>
                        <p><strong>Surface:</strong> {selectedParcel.area_sqm?.toLocaleString()} m²</p>
                        <p>
                          <strong>Localisation:</strong><br />
                          {selectedParcel.province} - {selectedParcel.ville}<br />
                          {selectedParcel.commune} {selectedParcel.quartier}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={() => setSelectedParcel(null)}
                      >
                        Fermer
                      </Button>
                    </div>
                  )}

                  {/* Légende */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Légende</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500/20 border-2 border-red-500 rounded"></div>
                        <span>Parcelle avec bornage</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        <span>Parcelle sans bornage</span>
                      </div>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    <p className="font-semibold mb-2">💡 Utilisation</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Cliquez sur une parcelle pour voir ses détails</li>
                      <li>Utilisez la molette pour zoomer</li>
                      <li>Glissez pour déplacer la carte</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CadastralMap;

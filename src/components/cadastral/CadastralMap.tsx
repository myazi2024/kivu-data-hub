import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Calculator } from 'lucide-react';

interface CadastralMapProps {
  coordinates: Array<{ lat: number; lng: number; borne: string }>;
  center: { lat: number; lng: number };
  parcelNumber: string;
}

const CadastralMap: React.FC<CadastralMapProps> = ({ coordinates, center, parcelNumber }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Fonction pour initialiser la carte OpenStreetMap avec Leaflet
    const initMap = async () => {
      if (!mapRef.current) return;

      try {
        // Import dynamique de Leaflet
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');

        // Fix pour les icônes Leaflet
        delete (L as any).Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Créer la carte (limiter les zooms agressifs sur mobile)
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const map = L.map(mapRef.current, {
          zoomControl: !isMobile,
          scrollWheelZoom: !isMobile,
          doubleClickZoom: !isMobile,
          dragging: true
        });

        // Ajouter la couche de tuiles OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // S'assurer que la carte se redessine correctement (ex: après ouverture d'un onglet/modal)
        map.whenReady(() => {
          setTimeout(() => map.invalidateSize(), 0);
        });
        // Ajouter les marqueurs pour chaque borne
        coordinates.forEach((coord) => {
          const marker = L.marker([coord.lat, coord.lng]).addTo(map);
          marker.bindPopup(`
            <div style="font-family: system-ui;">
              <strong>Borne ${coord.borne}</strong><br>
              Parcelle: ${parcelNumber}<br>
              Coordonnées: ${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}
            </div>
          `);
        });

        // Créer un polygone si nous avons assez de coordonnées
        if (coordinates.length >= 3) {
          const polygonPoints: [number, number][] = coordinates.map(coord => [coord.lat, coord.lng]);
          
          const polygon = L.polygon(polygonPoints, {
            color: 'red',
            weight: 2,
            fillColor: 'red',
            fillOpacity: 0.1
          }).addTo(map);

          // Ajuster la vue pour inclure tout le polygone
          map.fitBounds(polygon.getBounds());
        } else {
          // Si pas de polygone, centrer simplement sur la parcelle
          map.setView([center.lat, center.lng], 16);
        }

        mapInstanceRef.current = map;

      } catch (error) {
        console.error('Erreur lors de l\'initialisation de la carte:', error);
      }
    };

    initMap();

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [coordinates, center, parcelNumber]);

  return (
    <div className="space-y-4">
      {/* Carte interactive */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Localisation sur Carte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            ref={mapRef} 
            className="w-full h-64 md:h-96 rounded-lg border border-border"
          />
        </CardContent>
      </Card>

      {/* Coordonnées des bornes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              Coordonnées GPS des Bornes
            </CardTitle>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Nombre de bornes :</span>
                <span className="font-medium">{coordinates.length}</span>
              </div>
              <Button variant="outline" size="sm" className="h-7 hidden sm:inline-flex">
                <Calculator className="h-3 w-3 mr-1" />
                Calculer surface
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-2">
            {coordinates.map((coord, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                    {coord.borne}
                  </div>
                  <span className="font-medium text-xs">Borne {coord.borne}</span>
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  {coord.lat.toFixed(6)}, {coord.lng.toFixed(6)}
                </div>
              </div>
            ))}
          </div>
          
          {coordinates.length === 0 && (
            <div className="text-center text-muted-foreground py-4">
              Aucune coordonnée GPS disponible
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CadastralMap;
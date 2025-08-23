import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation } from 'lucide-react';

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

        // Créer la carte
        const map = L.map(mapRef.current).setView([center.lat, center.lng], 16);

        // Ajouter la couche de tuiles OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

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
            className="w-full h-96 rounded-lg border border-border"
            style={{ minHeight: '400px' }}
          />
        </CardContent>
      </Card>

      {/* Coordonnées des bornes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Coordonnées GPS des Bornes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {coordinates.map((coord, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {coord.borne}
                  </div>
                  <span className="font-medium">Borne {coord.borne}</span>
                </div>
                <div className="text-sm text-muted-foreground font-mono">
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
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin, Navigation, Calculator, Info } from 'lucide-react';

interface CadastralMapProps {
  coordinates: Array<{ lat: number; lng: number; borne: string }>;
  center: { lat: number; lng: number };
  parcelNumber: string;
}

const CadastralMap: React.FC<CadastralMapProps> = ({ coordinates, center, parcelNumber }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [calculatedSurface, setCalculatedSurface] = useState<number | null>(null);

  // Stabiliser l'initialisation de la carte
  useEffect(() => {
    // Fonction pour initialiser la carte OpenStreetMap avec Leaflet
    const initMap = async () => {
      // Éviter les réinitialisations inutiles
      if (!mapRef.current || mapInstanceRef.current) return;

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

        mapInstanceRef.current = map;

        // S'assurer que la carte se redessine correctement
        map.whenReady(() => {
          setTimeout(() => map.invalidateSize(), 0);
        });

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
  }, []); // Pas de dépendances pour éviter les re-render

  // Effet séparé pour mettre à jour les marqueurs et polygones
  useEffect(() => {
    const updateMapData = async () => {
      if (!mapInstanceRef.current) return;

      try {
        const L = await import('leaflet');
        const map = mapInstanceRef.current;
        
        // Nettoyer les marqueurs existants
        map.eachLayer((layer: any) => {
          if (layer instanceof L.Marker || layer instanceof L.Polygon) {
            map.removeLayer(layer);
          }
        });

        // Ajouter les nouveaux marqueurs
        coordinates.forEach((coord) => {
          const marker = L.marker([coord.lat, coord.lng]).addTo(map);
          marker.bindPopup(`
            <div style="font-family: system-ui; font-size: 12px; line-height: 1.3; padding: 2px;">
              <strong style="font-size: 13px;">Borne ${coord.borne}</strong><br>
              <span style="font-size: 11px;">Parcelle: ${parcelNumber}</span><br>
              <span style="font-size: 10px; color: #666;">${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}</span>
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

          // Ajuster la vue pour inclure tout le polygone avec un zoom minimum
          map.fitBounds(polygon.getBounds(), {
            padding: [20, 20],
            maxZoom: 18 // Zoom maximum pour assurer une bonne visibilité
          });
        } else if (coordinates.length > 0) {
          // Si pas de polygone mais des coordonnées, centrer sur la première
          map.setView([coordinates[0].lat, coordinates[0].lng], 18);
        } else {
          // Centrer sur le centre fourni
          map.setView([center.lat, center.lng], 18);
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour de la carte:', error);
      }
    };

    updateMapData();
  }, [coordinates, center, parcelNumber]); // Dépendances pour mise à jour des données

  // Calculer la surface à partir des dimensions exactes si disponibles
  useEffect(() => {
    if (coordinates.length < 3) {
      setCalculatedSurface(null);
      return;
    }
    
    // Note: Cette méthode utilise toujours les GPS car nous n'avons pas accès
    // aux dimensions exactes dans ce composant. La surface exacte devrait être
    // calculée lors de la soumission du formulaire CCC et stockée dans area_sqm.
    
    // Fonction pour convertir degrés en radians
    const toRadians = (degrees: number) => degrees * (Math.PI / 180);
    
    // Rayon de la Terre en mètres
    const earthRadius = 6378137; // WGS84
    
    // Calcul de l'aire géodésique en utilisant la formule sphérique
    let area = 0;
    const n = coordinates.length;
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const lat1 = toRadians(coordinates[i].lat);
      const lat2 = toRadians(coordinates[j].lat);
      const deltaLng = toRadians(coordinates[j].lng - coordinates[i].lng);
      
      // Formule géodésique pour petites surfaces
      area += deltaLng * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    
    // Conversion en mètres carrés
    const surfaceM2 = Math.abs(area) * earthRadius * earthRadius / 2;
    setCalculatedSurface(surfaceM2);
  }, [coordinates]);

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
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground/90">
              <Navigation className="h-3.5 w-3.5" />
              Coordonnées GPS
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-help">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium">{coordinates.length}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="text-xs">Nombre de bornes: {coordinates.length}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
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
          
          {/* Surface calculée */}
          {calculatedSurface && (
            <div className="mt-3 p-3 bg-primary/10 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Surface calculée:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary cursor-pointer" />
                    </PopoverTrigger>
                    <PopoverContent side="top" className="max-w-xs">
                      <p className="text-xs leading-relaxed">
                        Cette fonction permet de calculer la superficie à partir des coordonnées GPS des bornes enregistrées dans le système. En cas d'incertitude, comparez avec le PV de bornage au bureau de la circonscription foncière à laquelle est attachée cette parcelle.
                      </p>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="text-sm font-bold text-right">
                  <div>{calculatedSurface.toLocaleString()} m²</div>
                  <div className="text-xs text-muted-foreground">
                    {(calculatedSurface / 10000).toFixed(4)} ha
                  </div>
                </div>
              </div>
            </div>
          )}
          
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
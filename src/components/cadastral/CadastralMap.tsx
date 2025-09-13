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
        } else if (coordinates.length > 0) {
          // Si pas de polygone mais des coordonnées, centrer sur la première
          map.setView([coordinates[0].lat, coordinates[0].lng], 16);
        } else {
          // Centrer sur le centre fourni
          map.setView([center.lat, center.lng], 16);
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour de la carte:', error);
      }
    };

    updateMapData();
  }, [coordinates, center, parcelNumber]); // Dépendances pour mise à jour des données

  const [buttonState, setButtonState] = useState<'normal' | 'active'>('normal');

  // Calculer la surface géodésique précise
  const calculateSurface = useCallback(() => {
    if (coordinates.length < 3) {
      setCalculatedSurface(null);
      return;
    }
    
    // Animation du bouton
    setButtonState('active');
    
    // Calcul de la surface
    setTimeout(() => {
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
      
      // Retour à l'état normal
      setTimeout(() => setButtonState('normal'), 200);
    }, 100);
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

          {/* Bouton calculer superficie - déplacé ici */}
          {coordinates.length >= 3 && (
            <div className="flex justify-center pt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`h-8 px-4 font-medium group relative overflow-hidden transition-all duration-200 hover:scale-105 rounded-lg animate-fade-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                      buttonState === 'active'
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 border border-primary/20 hover:border-primary/40 text-primary hover:text-primary'
                    }`}
                    onClick={calculateSurface}
                  >
                    <Calculator className={`h-3.5 w-3.5 mr-2 group-hover:rotate-12 transition-all duration-300 relative z-10 ${buttonState === 'active' ? 'text-primary-foreground' : ''}`} />
                    <span className={`hidden xs:inline relative z-10 ${buttonState === 'active' ? 'text-primary-foreground' : ''}`}>Calculer superficie</span>
                    <span className={`xs:hidden relative z-10 ${buttonState === 'active' ? 'text-primary-foreground' : ''}`}>Calculer</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-out pointer-events-none" />
                    <Info className={`h-3 w-3 ml-1 opacity-60 transition-all duration-200 relative z-10 ${buttonState === 'active' ? 'text-primary-foreground opacity-100' : ''}`} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" side="bottom" sideOffset={8}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-3 w-3 text-primary" />
                      <p className="font-medium text-sm text-popover-foreground">Calcul automatique de superficie</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Cette fonction calcule la superficie à partir des coordonnées GPS des bornes 
                      enregistrées dans le système. En cas d'incertitude, comparez avec le PV de 
                      bornage au bureau de la circonscription foncière.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
          
          {/* Surface calculée */}
          {calculatedSurface && (
            <div className="mt-3 p-3 bg-primary/10 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Surface calculée:</span>
                <span className="text-sm font-bold">
                  {calculatedSurface >= 10000 
                    ? `${(calculatedSurface / 10000).toFixed(2)} ha` 
                    : `${calculatedSurface.toLocaleString()} m²`
                  }
                </span>
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
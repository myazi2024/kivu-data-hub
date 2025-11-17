import { useEffect, useRef, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle, MapPin } from 'lucide-react';

interface Coordinate {
  borne: string;
  lat: string;
  lng: string;
}

interface ParcelMapPreviewProps {
  coordinates: Coordinate[];
  onCoordinatesUpdate: (coordinates: Coordinate[]) => void;
}

export const ParcelMapPreview = ({ coordinates, onCoordinatesUpdate }: ParcelMapPreviewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polygonRef = useRef<any>(null);
  const [surfaceArea, setSurfaceArea] = useState<number>(0);
  const [isMapReady, setIsMapReady] = useState(false);

  // Mémoriser les coordonnées valides pour éviter les re-renders inutiles
  const validCoords = useMemo(() => 
    coordinates.filter(
      coord => coord.lat && coord.lng && !isNaN(parseFloat(coord.lat)) && !isNaN(parseFloat(coord.lng))
    ),
    [coordinates]
  );

  // Initialiser la carte une seule fois
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      // Fix for default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false,
        center: [0, 0],
        zoom: 2,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      setIsMapReady(true);
      
      console.log('Carte Leaflet initialisée');
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setIsMapReady(false);
      }
    };
  }, []);

  // Mettre à jour les marqueurs et le polygone quand les coordonnées changent
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;

    const updateMap = async () => {
      const L = await import('leaflet');
      const map = mapInstanceRef.current;
      
      console.log('Mise à jour de la carte avec', validCoords.length, 'coordonnées valides');

      // Supprimer les anciens marqueurs et polygone
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      if (polygonRef.current) {
        polygonRef.current.remove();
        polygonRef.current = null;
      }

      // Si pas de coordonnées valides, centrer par défaut
      if (validCoords.length === 0) {
        map.setView([0, 0], 2);
        setSurfaceArea(0);
        return;
      }

      // Créer des marqueurs draggables
      const latLngs: [number, number][] = [];
      
      validCoords.forEach((coord, index) => {
        const lat = parseFloat(coord.lat);
        const lng = parseFloat(coord.lng);
        latLngs.push([lat, lng]);

        const marker = L.marker([lat, lng], {
          draggable: true,
          icon: L.divIcon({
            className: 'custom-marker',
            html: `<div style="
              background: hsl(var(--primary));
              color: white;
              width: 30px;
              height: 30px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ">
              <span style="transform: rotate(45deg); font-weight: bold; font-size: 12px;">${index + 1}</span>
            </div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
          }),
        }).addTo(map);

        marker.on('dragend', () => {
          const newPos = marker.getLatLng();
          // Trouver l'index original dans le tableau complet
          const originalIndex = coordinates.findIndex(c => c.borne === coord.borne);
          if (originalIndex !== -1) {
            const updatedCoords = [...coordinates];
            updatedCoords[originalIndex] = {
              ...updatedCoords[originalIndex],
              lat: newPos.lat.toFixed(6),
              lng: newPos.lng.toFixed(6),
            };
            onCoordinatesUpdate(updatedCoords);
          }
        });

        markersRef.current.push(marker);
      });

      // Dessiner le polygone si au moins 3 points
      if (latLngs.length >= 3) {
        console.log('Dessin du polygone avec', latLngs.length, 'points');
        const polygon = L.polygon(latLngs, {
          color: 'hsl(var(--primary))',
          fillColor: 'hsl(var(--primary))',
          fillOpacity: 0.2,
          weight: 2,
        }).addTo(map);

        polygonRef.current = polygon;

        // Calculer la surface en m²
        const area = calculatePolygonArea(latLngs);
        setSurfaceArea(area);
        console.log('Surface calculée:', area, 'm²');

        // Ajuster la vue pour inclure tous les points
        map.fitBounds(polygon.getBounds(), { padding: [50, 50] });
      } else if (latLngs.length > 0) {
        // Centrer sur le premier point
        map.setView(latLngs[0], 15);
        setSurfaceArea(0);
      }
    };

    updateMap();
  }, [isMapReady, validCoords.length, coordinates, onCoordinatesUpdate]);

  // Calculer la surface d'un polygone en m² (formule de Shoelace + rayon terrestre)
  const calculatePolygonArea = (coords: [number, number][]): number => {
    if (coords.length < 3) return 0;

    const R = 6371000; // Rayon de la Terre en mètres
    
    // Convertir en radians
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    
    let area = 0;
    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length;
      const lat1 = toRad(coords[i][0]);
      const lat2 = toRad(coords[j][0]);
      const lng1 = toRad(coords[i][1]);
      const lng2 = toRad(coords[j][1]);
      
      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    
    area = Math.abs(area * R * R / 2);
    return Math.round(area * 100) / 100; // Arrondir à 2 décimales
  };

  if (validCoords.length === 0) {
    return (
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">
            Ajoutez au moins une borne GPS pour voir l'aperçu sur la carte
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Aperçu de la parcelle
        </Label>
        {validCoords.length >= 3 && surfaceArea > 0 && (
          <div className="text-xs text-muted-foreground">
            Surface: <span className="font-semibold text-foreground">{surfaceArea.toLocaleString()} m²</span>
            {surfaceArea >= 10000 && (
              <span className="ml-1">({(surfaceArea / 10000).toFixed(2)} ha)</span>
            )}
          </div>
        )}
      </div>
      
      <Card className="overflow-hidden relative z-10">
        <div 
          ref={mapRef} 
          className="w-full h-[300px] md:h-[400px] bg-muted/20 relative z-10"
          style={{ minHeight: '300px' }}
        />
      </Card>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <AlertCircle className="h-3 w-3 flex-shrink-0" />
        Glissez-déposez les marqueurs numérotés pour ajuster la position des bornes
      </p>
    </div>
  );
};

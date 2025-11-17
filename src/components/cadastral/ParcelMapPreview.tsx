import { useEffect, useRef, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, MapPin, AlertTriangle, Info } from 'lucide-react';
import { BoundaryConflictDialog } from './BoundaryConflictDialog';
import { supabase } from '@/integrations/supabase/client';

interface Coordinate {
  borne: string;
  lat: string;
  lng: string;
}

interface MapConfig {
  enabled?: boolean;
  defaultZoom?: number;
  defaultCenter?: [number, number];
  showMarkers?: boolean;
  autoCalculateSurface?: boolean;
  minMarkers?: number;
  markerColor?: string;
  showSideDimensions?: boolean;
  dimensionUnit?: string;
  allowDimensionEditing?: boolean;
  showSideLabels?: boolean;
}

interface ConflictingParcel {
  parcelNumber: string;
  ownerName: string;
  location: string;
  coordinates: [number, number][];
  overlapArea?: number;
}

interface ParcelMapPreviewProps {
  coordinates: Coordinate[];
  onCoordinatesUpdate: (coordinates: Coordinate[]) => void;
  config?: MapConfig;
  currentParcelNumber?: string;
  enableConflictDetection?: boolean;
}

export const ParcelMapPreview = ({ 
  coordinates, 
  onCoordinatesUpdate, 
  config,
  currentParcelNumber,
  enableConflictDetection = true 
}: ParcelMapPreviewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polygonRef = useRef<any>(null);
  const dimensionLayersRef = useRef<any[]>([]);
  const conflictLayersRef = useRef<any[]>([]);
  const [surfaceArea, setSurfaceArea] = useState<number>(0);
  const [isMapReady, setIsMapReady] = useState(false);
  const [conflictingParcels, setConflictingParcels] = useState<ConflictingParcel[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [loadingConflicts, setLoadingConflicts] = useState(false);
  
  // Configuration par défaut
  const defaultConfig: MapConfig = {
    enabled: true,
    defaultZoom: 15,
    defaultCenter: [0, 0],
    showMarkers: true,
    autoCalculateSurface: true,
    minMarkers: 3,
    markerColor: 'hsl(var(--primary))',
    showSideDimensions: true,
    dimensionUnit: 'meters',
    allowDimensionEditing: true,
    showSideLabels: true
  };
  
  const mapConfig = { ...defaultConfig, ...config };

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
        attributionControl: true,
        center: mapConfig.defaultCenter || [0, 0],
        zoom: mapConfig.defaultZoom || 2,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      
      // S'assurer que la carte se redessine correctement
      map.whenReady(() => {
        setTimeout(() => {
          map.invalidateSize();
          setIsMapReady(true);
          console.log('Carte Leaflet initialisée et prête');
        }, 100);
      });
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setIsMapReady(false);
      }
    };
  }, [mapConfig.defaultCenter, mapConfig.defaultZoom]);

  // Mettre à jour les marqueurs et le polygone quand les coordonnées changent
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;

    const updateMap = async () => {
      const L = await import('leaflet');
      const map = mapInstanceRef.current;
      
      console.log('Mise à jour de la carte avec', validCoords.length, 'coordonnées valides');

      // Supprimer les anciens marqueurs, polygone, dimensions et conflits
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      if (polygonRef.current) {
        polygonRef.current.remove();
        polygonRef.current = null;
      }
      dimensionLayersRef.current.forEach(layer => layer.remove());
      dimensionLayersRef.current = [];
      conflictLayersRef.current.forEach(layer => layer.remove());
      conflictLayersRef.current = [];

      // Si pas de coordonnées valides, centrer par défaut
      if (validCoords.length === 0) {
        map.setView([0, 0], 2);
        setSurfaceArea(0);
        return;
      }

      // Créer des marqueurs draggables si activé
      const latLngs: [number, number][] = [];
      
      validCoords.forEach((coord, index) => {
        const lat = parseFloat(coord.lat);
        const lng = parseFloat(coord.lng);
        latLngs.push([lat, lng]);

        if (mapConfig.showMarkers) {
          const marker = L.marker([lat, lng], {
            draggable: true,
            icon: L.divIcon({
              className: 'custom-marker',
            html: `<div style="
              background-color: ${mapConfig.markerColor || 'hsl(var(--primary))'};
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
        }
      });

      // Dessiner le polygone si au moins minMarkers points
      const minMarkers = mapConfig.minMarkers || 3;
      if (latLngs.length >= minMarkers) {
        console.log('Dessin du polygone avec', latLngs.length, 'points');
        const polygon = L.polygon(latLngs, {
          color: mapConfig.markerColor || 'hsl(var(--primary))',
          fillColor: mapConfig.markerColor || 'hsl(var(--primary))',
          fillOpacity: 0.2,
          weight: 2,
        }).addTo(map);

        polygonRef.current = polygon;

        // Calculer la surface en m² si activé
        if (mapConfig.autoCalculateSurface) {
          const area = calculatePolygonArea(latLngs);
          setSurfaceArea(area);
          console.log('Surface calculée:', area, 'm²');
        }
        
        // Afficher les dimensions des côtés si activé
        if (mapConfig.showSideDimensions) {
          displaySideDimensions(L, map, latLngs);
        }

        // Ajuster la vue pour inclure tous les points
        map.fitBounds(polygon.getBounds(), { padding: [50, 50] });

        // Détecter les conflits avec d'autres parcelles si activé
        if (enableConflictDetection && currentParcelNumber) {
          detectBoundaryConflicts(latLngs);
        }
      } else if (latLngs.length > 0) {
        // Centrer sur le premier point
        map.setView(latLngs[0], mapConfig.defaultZoom || 15);
        setSurfaceArea(0);
      }
    };

    updateMap();
  }, [isMapReady, validCoords.length, coordinates, onCoordinatesUpdate, mapConfig]);

  // Détection des conflits avec des parcelles voisines
  const detectBoundaryConflicts = async (currentCoords: [number, number][]) => {
    if (!currentParcelNumber || currentCoords.length < 3) return;

    setLoadingConflicts(true);
    try {
      // Récupérer les parcelles voisines dans un rayon proche
      const bounds = calculateBounds(currentCoords);
      const { data: nearbyParcels, error } = await supabase
        .from('cadastral_parcels')
        .select('*')
        .neq('parcel_number', currentParcelNumber)
        .gte('latitude', bounds.minLat)
        .lte('latitude', bounds.maxLat)
        .gte('longitude', bounds.minLng)
        .lte('longitude', bounds.maxLng)
        .not('gps_coordinates', 'is', null);

      if (error) throw error;

      const conflicts: ConflictingParcel[] = [];
      const L = await import('leaflet');
      const map = mapInstanceRef.current;

      nearbyParcels?.forEach((parcel: any) => {
        try {
          const parcelCoords = parcel.gps_coordinates as any[];
          if (!parcelCoords || parcelCoords.length < 3) return;

          const neighborLatLngs: [number, number][] = parcelCoords
            .filter(c => c.lat && c.lng)
            .map(c => [parseFloat(c.lat), parseFloat(c.lng)]);

          if (neighborLatLngs.length < 3) return;

          // Vérifier le chevauchement
          const overlap = checkPolygonOverlap(currentCoords, neighborLatLngs);
          if (overlap.hasOverlap) {
            conflicts.push({
              parcelNumber: parcel.parcel_number,
              ownerName: parcel.current_owner_name || 'Propriétaire inconnu',
              location: parcel.location || `${parcel.quartier}, ${parcel.ville}`,
              coordinates: neighborLatLngs,
              overlapArea: overlap.area
            });

            // Afficher la parcelle en conflit sur la carte
            const conflictPolygon = L.polygon(neighborLatLngs, {
              color: '#ef4444',
              fillColor: '#ef4444',
              fillOpacity: 0.3,
              weight: 2,
              dashArray: '5, 5'
            }).addTo(map);

            conflictPolygon.bindPopup(`
              <div style="font-size: 12px;">
                <strong style="color: #ef4444;">⚠️ Conflit détecté</strong><br/>
                <strong>Parcelle:</strong> ${parcel.parcel_number}<br/>
                <strong>Propriétaire:</strong> ${parcel.current_owner_name}<br/>
                <strong>Chevauchement:</strong> ${overlap.area?.toFixed(2)} m²
              </div>
            `);

            conflictLayersRef.current.push(conflictPolygon);
          }
        } catch (err) {
          console.error('Error processing parcel:', err);
        }
      });

      setConflictingParcels(conflicts);
    } catch (error) {
      console.error('Error detecting conflicts:', error);
    } finally {
      setLoadingConflicts(false);
    }
  };

  // Calculer les limites géographiques d'un polygone
  const calculateBounds = (coords: [number, number][]) => {
    const lats = coords.map(c => c[0]);
    const lngs = coords.map(c => c[1]);
    return {
      minLat: Math.min(...lats) - 0.01,
      maxLat: Math.max(...lats) + 0.01,
      minLng: Math.min(...lngs) + 0.01,
      maxLng: Math.max(...lngs) + 0.01
    };
  };

  // Vérifier si deux polygones se chevauchent
  const checkPolygonOverlap = (
    poly1: [number, number][], 
    poly2: [number, number][]
  ): { hasOverlap: boolean; area?: number } => {
    // Vérifier si des points d'un polygone sont à l'intérieur de l'autre
    const hasPointInside = poly1.some(point => isPointInPolygon(point, poly2)) ||
                           poly2.some(point => isPointInPolygon(point, poly1));

    if (!hasPointInside) {
      return { hasOverlap: false };
    }

    // Estimer la zone de chevauchement (approximation simple)
    const overlapPoints = poly1.filter(point => isPointInPolygon(point, poly2));
    if (overlapPoints.length > 2) {
      const area = calculatePolygonArea(overlapPoints);
      return { hasOverlap: true, area };
    }

    return { hasOverlap: true };
  };

  // Algorithme Ray Casting pour vérifier si un point est dans un polygone
  const isPointInPolygon = (point: [number, number], polygon: [number, number][]): boolean => {
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }

    return inside;
  };

  // Calculer la distance entre deux points GPS en mètres (formule de Haversine)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Rayon de la Terre en mètres
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Arrondir à 2 décimales
  };

  // Afficher les dimensions des côtés
  const displaySideDimensions = (L: any, map: any, latLngs: [number, number][]) => {
    for (let i = 0; i < latLngs.length; i++) {
      const j = (i + 1) % latLngs.length;
      const start = latLngs[i];
      const end = latLngs[j];
      
      // Calculer la distance
      const distance = calculateDistance(start[0], start[1], end[0], end[1]);
      
      // Point milieu
      const midLat = (start[0] + end[0]) / 2;
      const midLng = (start[1] + end[1]) / 2;
      
      // Créer le label
      const labelText = mapConfig.showSideLabels 
        ? `Côté ${i + 1}: ${distance.toFixed(2)} m`
        : `${distance.toFixed(2)} m`;
      
      const dimensionMarker = L.marker([midLat, midLng], {
        icon: L.divIcon({
          className: 'dimension-label',
          html: `<div style="
            background-color: rgba(255, 255, 255, 0.95);
            color: hsl(var(--foreground));
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            border: 1px solid ${mapConfig.markerColor || 'hsl(var(--primary))'};
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            white-space: nowrap;
          ">${labelText}</div>`,
          iconSize: [0, 0],
        })
      }).addTo(map);
      
      dimensionLayersRef.current.push(dimensionMarker);
    }
  };

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

  // Ne pas afficher si désactivé dans la config
  if (!mapConfig.enabled) {
    return null;
  }

  if (validCoords.length === 0) {
    return (
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">
            Ajoutez au moins {mapConfig.minMarkers || 3} bornes GPS pour voir l'aperçu sur la carte
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
        {surfaceArea > 0 && (
          <Badge variant="secondary" className="font-mono">
            {surfaceArea.toLocaleString()} m²
          </Badge>
        )}
      </div>

      {conflictingParcels.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {conflictingParcels.length} conflit(s) de limites détecté(s)
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConflictDialog(true)}
              className="ml-2"
            >
              Signaler
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loadingConflicts && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Vérification des parcelles voisines...
          </AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden border-2 border-primary/20">
        <div 
          ref={mapRef} 
          style={{ 
            height: '400px', 
            width: '100%',
            borderRadius: '8px'
          }} 
        />
      </Card>
      
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Info className="h-3 w-3" />
        <span>Glissez les marqueurs pour ajuster les positions GPS</span>
      </div>

      <BoundaryConflictDialog
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        currentParcelNumber={currentParcelNumber || ''}
        conflictingParcels={conflictingParcels}
        coordinates={validCoords}
      />
    </div>
  );
};

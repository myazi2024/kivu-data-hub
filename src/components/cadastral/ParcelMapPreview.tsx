import { useEffect, useRef, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, MapPin, AlertTriangle, Info } from 'lucide-react';
import { BoundaryConflictDialog } from './BoundaryConflictDialog';
import { supabase } from '@/integrations/supabase/client';
import { RoadBorderingSidesPanel, RoadSideInfo } from './RoadBorderingSidesPanel';

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
  maxMarkers?: number;
  markerColor?: string;
  showSideDimensions?: boolean;
  dimensionUnit?: string;
  dimensionTextColor?: string;
  dimensionFontSize?: number;
  dimensionFormat?: string;
  allowDimensionEditing?: boolean;
  showSideLabels?: boolean;
  lineColor?: string;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed';
  fillColor?: string;
  fillOpacity?: number;
  minSurfaceSqm?: number;
  maxSurfaceSqm?: number;
  enableEditing?: boolean;
  enableDragging?: boolean;
  enableConflictDetection?: boolean;
  enableRoadBorderingFeature?: boolean;
  roadTypes?: Array<{ value: string; label: string }>;
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
  roadSides?: RoadSideInfo[];
  onRoadSidesChange?: (roadSides: RoadSideInfo[]) => void;
}

export const ParcelMapPreview = ({ 
  coordinates, 
  onCoordinatesUpdate, 
  config,
  currentParcelNumber,
  enableConflictDetection = true,
  roadSides = [],
  onRoadSidesChange
}: ParcelMapPreviewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polygonRef = useRef<any>(null);
  const dimensionLayersRef = useRef<any[]>([]);
  const conflictLayersRef = useRef<any[]>([]);
  const segmentLayersRef = useRef<any[]>([]);
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
    maxMarkers: 50,
    markerColor: 'hsl(var(--primary))',
    showSideDimensions: true,
    dimensionUnit: 'meters',
    dimensionTextColor: '#000000',
    dimensionFontSize: 11,
    dimensionFormat: '{value}m',
    allowDimensionEditing: true,
    showSideLabels: true,
    lineColor: '#3b82f6',
    lineWidth: 3,
    lineStyle: 'solid',
    fillColor: '#3b82f6',
    fillOpacity: 0.2,
    minSurfaceSqm: 0,
    maxSurfaceSqm: 100000,
    enableEditing: true,
    enableDragging: true,
    enableConflictDetection: true,
    enableRoadBorderingFeature: true,
  };
  
  const mapConfig = { ...defaultConfig, ...config };

  // Calculer le centre de la carte basé sur la borne 1
  const mapCenter = useMemo(() => {
    const borne1 = coordinates.find(coord => coord.borne === '1' || coord.borne === 'Borne 1');
    if (borne1 && borne1.lat && borne1.lng) {
      const lat = parseFloat(borne1.lat);
      const lng = parseFloat(borne1.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng] as [number, number];
      }
    }
    return mapConfig.defaultCenter || [0, 0] as [number, number];
  }, [coordinates, mapConfig.defaultCenter]);

  // Mémoriser les coordonnées valides pour éviter les re-renders inutiles
  const validCoords = useMemo(() => 
    coordinates.filter(
      coord => coord.lat && coord.lng && !isNaN(parseFloat(coord.lat)) && !isNaN(parseFloat(coord.lng))
    ),
    [coordinates]
  );
  
  // Coordonnées avec valeurs par défaut pour affichage visuel des bornes non remplies
  const displayCoords = useMemo(() => 
    coordinates.map((coord, index) => {
      if (coord.lat && coord.lng && !isNaN(parseFloat(coord.lat)) && !isNaN(parseFloat(coord.lng))) {
        return coord;
      }
      // Pour les bornes sans coordonnées, on retourne null pour ne pas les afficher
      return null;
    }).filter(Boolean) as typeof coordinates,
    [coordinates]
  );

  // Calculer l'orientation d'un côté basé sur le bearing
  const calculateOrientation = (lat1: number, lng1: number, lat2: number, lng2: number): string => {
    const bearing = Math.atan2(lng2 - lng1, lat2 - lat1) * (180 / Math.PI);
    const normalized = (bearing + 360) % 360;
    
    if (normalized >= 315 || normalized < 45) return 'Nord';
    if (normalized >= 45 && normalized < 135) return 'Est';
    if (normalized >= 135 && normalized < 225) return 'Sud';
    return 'Ouest';
  };

  // Initialiser/mettre à jour les roadSides quand les coordonnées changent
  useEffect(() => {
    if (validCoords.length >= 3 && onRoadSidesChange) {
      const newSides: RoadSideInfo[] = validCoords.map((coord, index) => {
        const nextIndex = (index + 1) % validCoords.length;
        const nextCoord = validCoords[nextIndex];
        
        const existingSide = roadSides.find(s => s.sideIndex === index);
        const length = calculateDistance(
          parseFloat(coord.lat), 
          parseFloat(coord.lng),
          parseFloat(nextCoord.lat),
          parseFloat(nextCoord.lng)
        );
        const orientation = calculateOrientation(
          parseFloat(coord.lat), 
          parseFloat(coord.lng),
          parseFloat(nextCoord.lat),
          parseFloat(nextCoord.lng)
        );
        
        return {
          sideIndex: index,
          bordersRoad: existingSide?.bordersRoad || false,
          roadType: existingSide?.roadType,
          roadName: existingSide?.roadName,
          roadWidth: existingSide?.roadWidth,
          orientation,
          length,
        };
      });
      
      // Ne mettre à jour que si la structure a changé (nombre de côtés différent)
      if (roadSides.length !== newSides.length) {
        onRoadSidesChange(newSides);
      }
    }
  }, [validCoords.length]);

  // Calculer la distance entre 2 points GPS
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
    
    return Math.round(distance * 100) / 100;
  };

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
        center: mapCenter,
        zoom: mapConfig.defaultZoom || 18,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Ajouter le contrôle d'échelle
      L.control.scale({
        position: 'bottomleft',
        metric: true,
        imperial: false,
        maxWidth: 200,
      }).addTo(map);

      // Ajouter une boussole (indicateur du nord)
      const CompassControl = L.Control.extend({
        options: {
          position: 'topright'
        },
        onAdd: function() {
          const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-compass');
          container.style.backgroundColor = 'white';
          container.style.width = '40px';
          container.style.height = '40px';
          container.style.display = 'flex';
          container.style.alignItems = 'center';
          container.style.justifyContent = 'center';
          container.style.cursor = 'default';
          container.style.borderRadius = '4px';
          container.style.boxShadow = '0 1px 5px rgba(0,0,0,0.4)';
          container.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15 10H9L12 2Z" fill="#dc2626"/>
              <path d="M12 22L9 14H15L12 22Z" fill="#6b7280"/>
              <circle cx="12" cy="12" r="2" fill="#374151"/>
            </svg>
          `;
          container.title = 'Nord';
          return container;
        }
      });
      new CompassControl().addTo(map);

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
  }, [mapCenter, mapConfig.defaultZoom]);

  // Mettre à jour les marqueurs et le polygone quand les coordonnées changent
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;

    const updateMap = async () => {
      const L = await import('leaflet');
      const map = mapInstanceRef.current;
      
      console.log('Mise à jour de la carte avec', validCoords.length, 'coordonnées valides sur', coordinates.length, 'bornes totales');

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

      // Si pas de coordonnées valides, afficher message mais garder la carte visible
      if (validCoords.length === 0) {
        map.setView(mapConfig.defaultCenter || [0, 0], mapConfig.defaultZoom || 2);
        setSurfaceArea(0);
        console.log('Aucune coordonnée GPS valide - Carte centrée par défaut');
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
            draggable: mapConfig.enableDragging !== false,
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
              position: relative;
              z-index: 1000;
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
        
        // Dessiner les segments individuels avec interaction
        validCoords.forEach((coord, index) => {
          const nextIndex = (index + 1) % validCoords.length;
          const nextCoord = validCoords[nextIndex];
          
          const roadSide = roadSides.find(s => s.sideIndex === index);
          const isRoadBordering = roadSide?.bordersRoad || false;
          
          const segment = L.polyline(
            [
              [parseFloat(coord.lat), parseFloat(coord.lng)],
              [parseFloat(nextCoord.lat), parseFloat(nextCoord.lng)]
            ],
            {
              color: isRoadBordering ? '#f59e0b' : (mapConfig.markerColor || 'hsl(var(--primary))'),
              weight: isRoadBordering ? 5 : 3,
              opacity: 0.9,
            }
          ).addTo(map);
          
          // Ajouter le click handler seulement si la fonctionnalité est activée
          if (mapConfig.enableRoadBorderingFeature !== false) {
            segment.on('click', () => {
              if (onRoadSidesChange) {
                const updatedSides = [...roadSides];
                const sideIndex = updatedSides.findIndex(s => s.sideIndex === index);
                
                if (sideIndex !== -1) {
                  updatedSides[sideIndex] = {
                    ...updatedSides[sideIndex],
                    bordersRoad: !updatedSides[sideIndex].bordersRoad,
                  };
                }
                
                onRoadSidesChange(updatedSides);
              }
            });
            
            segment.on('mouseover', () => {
              segment.setStyle({ weight: isRoadBordering ? 7 : 5, opacity: 1 });
            });
            
            segment.on('mouseout', () => {
              segment.setStyle({ weight: isRoadBordering ? 5 : 3, opacity: 0.9 });
            });
          }
          
          segmentLayersRef.current.push(segment);
        });
        
        // Dessiner le polygone rempli (non-interactif, derrière les segments)
        const polygon = L.polygon(latLngs, {
          color: 'transparent',
          fillColor: mapConfig.markerColor || 'hsl(var(--primary))',
          fillOpacity: 0.1,
          weight: 0,
          interactive: false,
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
        if (mapConfig.enableConflictDetection !== false && currentParcelNumber) {
          detectBoundaryConflicts(latLngs);
        }
      } else if (latLngs.length > 0) {
        // Centrer sur le premier point
        map.setView(latLngs[0], mapConfig.defaultZoom || 15);
        setSurfaceArea(0);
      }
    };

    updateMap();
  }, [isMapReady, validCoords.length, coordinates, onCoordinatesUpdate, mapConfig, roadSides, onRoadSidesChange]);

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

  // Handler pour mettre à jour un côté
  const handleRoadSideUpdate = (sideIndex: number, updates: Partial<RoadSideInfo>) => {
    if (onRoadSidesChange) {
      const updatedSides = roadSides.map(side =>
        side.sideIndex === sideIndex ? { ...side, ...updates } : side
      );
      onRoadSidesChange(updatedSides);
    }
  };

  if (coordinates.length === 0) {
    return (
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info className="h-4 w-4" />
          <p className="text-sm">
            Ajoutez des coordonnées GPS pour voir l'aperçu de la parcelle sur la carte.
          </p>
        </div>
      </Card>
    );
  }

  if (validCoords.length === 0) {
    return (
      <Card className="p-4 bg-warning/10 border-warning/30">
        <div className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-4 w-4" />
          <p className="text-sm">
            {coordinates.length} {coordinates.length > 1 ? 'bornes ont été ajoutées' : 'borne a été ajoutée'} mais {coordinates.length > 1 ? 'leurs' : 'sa'} coordonnées GPS ne sont pas encore renseignées. 
            Remplissez les latitude et longitude pour voir la parcelle sur la carte.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-2 md:space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <Label className="text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2">
          <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary flex-shrink-0" />
          Aperçu de la parcelle
        </Label>
        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
          {coordinates.length > 0 && (
            <Badge variant="outline" className="gap-1 text-[10px] md:text-xs h-5 md:h-6 px-1.5 md:px-2">
              <span className="font-medium">{validCoords.length}/{coordinates.length}</span>
              <span className="hidden sm:inline">bornes</span>
              <span className="sm:hidden">b.</span>
            </Badge>
          )}
          {surfaceArea > 0 && (
            <Badge variant="secondary" className="font-mono text-[10px] md:text-xs h-5 md:h-6 px-1.5 md:px-2">
              {surfaceArea.toLocaleString()} m²
            </Badge>
          )}
        </div>
      </div>

      {conflictingParcels.length > 0 && (
        <Alert variant="destructive" className="py-2 md:py-3">
          <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs md:text-sm">
            <span>
              {conflictingParcels.length} conflit(s) détecté(s)
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConflictDialog(true)}
              className="h-7 text-xs w-full sm:w-auto"
            >
              Signaler
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Validation du nombre maximum de marqueurs */}
      {mapConfig.maxMarkers && validCoords.length > mapConfig.maxMarkers && (
        <Alert variant="destructive" className="py-2 md:py-3">
          <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <AlertDescription className="text-xs md:text-sm">
            Dépassement: {validCoords.length - mapConfig.maxMarkers} borne(s) en trop (max: {mapConfig.maxMarkers}).
          </AlertDescription>
        </Alert>
      )}

      {/* Validation de la surface */}
      {surfaceArea > 0 && (
        <>
          {mapConfig.minSurfaceSqm && surfaceArea < mapConfig.minSurfaceSqm && (
            <Alert variant="destructive" className="py-2 md:py-3">
              <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <AlertDescription className="text-xs md:text-sm">
                Surface trop petite: {surfaceArea.toLocaleString()} m² (min: {mapConfig.minSurfaceSqm.toLocaleString()} m²).
              </AlertDescription>
            </Alert>
          )}
          {mapConfig.maxSurfaceSqm && surfaceArea > mapConfig.maxSurfaceSqm && (
            <Alert variant="destructive" className="py-2 md:py-3">
              <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <AlertDescription className="text-xs md:text-sm">
                Surface trop grande: {surfaceArea.toLocaleString()} m² (max: {mapConfig.maxSurfaceSqm.toLocaleString()} m²).
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {loadingConflicts && (
        <Alert className="py-2 md:py-3">
          <Info className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <AlertDescription className="text-xs md:text-sm">
            Vérification des parcelles voisines...
          </AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden border-2 border-primary/20 relative z-0">
        <div 
          ref={mapRef} 
          className="h-[250px] md:h-[350px] lg:h-[400px] w-full rounded-lg relative z-0"
        />
      </Card>
      
      <div className="text-[10px] md:text-xs text-muted-foreground flex items-start gap-1 md:gap-1.5">
        <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
        <span>
          Glissez les marqueurs pour ajuster.
          {mapConfig.enableRoadBorderingFeature !== false && ' Cliquez sur un segment pour indiquer une route.'}
        </span>
      </div>

      {validCoords.length >= 3 && onRoadSidesChange && mapConfig.enableRoadBorderingFeature !== false && (
        <RoadBorderingSidesPanel
          sides={roadSides}
          onSideUpdate={handleRoadSideUpdate}
          roadTypes={mapConfig.roadTypes}
        />
      )}

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

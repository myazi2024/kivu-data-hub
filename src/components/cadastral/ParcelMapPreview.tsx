import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, MapPin, AlertTriangle, Info, Trash2, Pencil, Check, Navigation, Search, Eye, Move } from 'lucide-react';
import { BoundaryConflictDialog } from './BoundaryConflictDialog';
import { supabase } from '@/integrations/supabase/client';
import { RoadBorderingSidesPanel, RoadSideInfo } from './RoadBorderingSidesPanel';
import { useMapConfig, MapConfig } from '@/hooks/useMapConfig';

interface Coordinate {
  borne: string;
  lat: string;
  lng: string;
}

interface ConflictingParcel {
  parcelNumber: string;
  ownerName: string;
  location: string;
  coordinates: [number, number][];
  overlapArea?: number;
}

interface ParcelSide {
  name: string;
  length: string;
}

interface ParcelMapPreviewProps {
  coordinates: Coordinate[];
  onCoordinatesUpdate: (coordinates: Coordinate[]) => void;
  config?: MapConfig;
  currentParcelNumber?: string;
  enableConflictDetection?: boolean;
  roadSides?: RoadSideInfo[];
  onRoadSidesChange?: (roadSides: RoadSideInfo[]) => void;
  parcelSides?: ParcelSide[];
  onParcelSidesUpdate?: (sides: ParcelSide[]) => void;
  enableDrawingMode?: boolean;
  onSurfaceChange?: (surface: number) => void;
}

type MapMode = 'navigation' | 'drawing' | 'editing';

export const ParcelMapPreview = ({ 
  coordinates, 
  onCoordinatesUpdate, 
  config: propConfig,
  currentParcelNumber,
  enableConflictDetection = true,
  roadSides = [],
  onRoadSidesChange,
  parcelSides = [],
  onParcelSidesUpdate,
  enableDrawingMode = true,
  onSurfaceChange
}: ParcelMapPreviewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polygonRef = useRef<any>(null);
  const dimensionLayersRef = useRef<any[]>([]);
  const conflictLayersRef = useRef<any[]>([]);
  const segmentLayersRef = useRef<any[]>([]);
  const neighborLayersRef = useRef<any[]>([]);
  
  const [surfaceArea, setSurfaceArea] = useState<number>(0);
  const [isMapReady, setIsMapReady] = useState(false);
  const [conflictingParcels, setConflictingParcels] = useState<ConflictingParcel[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [loadingConflicts, setLoadingConflicts] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>('navigation');
  const [showNeighbors, setShowNeighbors] = useState(false);
  const [selectedMarkerIndex, setSelectedMarkerIndex] = useState<number | null>(null);
  
  // Charger la configuration depuis Supabase
  const { config: dbConfig, loading: configLoading } = useMapConfig();
  
  // Fusionner propConfig avec dbConfig (propConfig prioritaire si fourni)
  const mapConfig = useMemo(() => {
    const baseConfig = { ...dbConfig };
    const finalConfig = { ...baseConfig, ...propConfig };
    return finalConfig;
  }, [dbConfig, propConfig]);

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
    const center = mapConfig.defaultCenter;
    if (center) {
      if ('lat' in center && 'lng' in center) {
        return [center.lat, center.lng] as [number, number];
      }
    }
    return [0, 0] as [number, number];
  }, [coordinates, mapConfig.defaultCenter]);

  // Mémoriser les coordonnées valides pour éviter les re-renders inutiles
  const validCoords = useMemo(() => 
    coordinates.filter(
      coord => coord.lat && coord.lng && !isNaN(parseFloat(coord.lat)) && !isNaN(parseFloat(coord.lng))
    ),
    [coordinates]
  );

  // Ajouter un nouveau marqueur via clic
  const addMarkerAtPosition = useCallback((lat: number, lng: number) => {
    const newBorneNumber = coordinates.length + 1;
    const newCoordinate: Coordinate = {
      borne: `${newBorneNumber}`,
      lat: lat.toFixed(6),
      lng: lng.toFixed(6)
    };
    
    const updatedCoords = [...coordinates, newCoordinate];
    onCoordinatesUpdate(updatedCoords);
    
    if (onParcelSidesUpdate && updatedCoords.length >= 2) {
      const validUpdated = updatedCoords.filter(
        c => c.lat && c.lng && !isNaN(parseFloat(c.lat)) && !isNaN(parseFloat(c.lng))
      );
      
      if (validUpdated.length >= 2) {
        const newSides: ParcelSide[] = [];
        for (let i = 0; i < validUpdated.length; i++) {
          const nextIndex = (i + 1) % validUpdated.length;
          const current = validUpdated[i];
          const next = validUpdated[nextIndex];
          
          const distance = calculateDistance(
            parseFloat(current.lat),
            parseFloat(current.lng),
            parseFloat(next.lat),
            parseFloat(next.lng)
          );
          
          newSides.push({
            name: `Côté ${i + 1}`,
            length: distance.toFixed(2)
          });
        }
        onParcelSidesUpdate(newSides);
      }
    }
  }, [coordinates, onCoordinatesUpdate, onParcelSidesUpdate]);

  // Supprimer le dernier marqueur
  const removeLastMarker = useCallback(() => {
    if (coordinates.length === 0) return;
    
    const updatedCoords = coordinates.slice(0, -1);
    onCoordinatesUpdate(updatedCoords);
    
    if (onParcelSidesUpdate) {
      const validUpdated = updatedCoords.filter(
        c => c.lat && c.lng && !isNaN(parseFloat(c.lat)) && !isNaN(parseFloat(c.lng))
      );
      
      if (validUpdated.length >= 2) {
        const newSides: ParcelSide[] = [];
        for (let i = 0; i < validUpdated.length; i++) {
          const nextIndex = (i + 1) % validUpdated.length;
          const current = validUpdated[i];
          const next = validUpdated[nextIndex];
          
          const distance = calculateDistance(
            parseFloat(current.lat),
            parseFloat(current.lng),
            parseFloat(next.lat),
            parseFloat(next.lng)
          );
          
          newSides.push({
            name: `Côté ${i + 1}`,
            length: distance.toFixed(2)
          });
        }
        onParcelSidesUpdate(newSides);
      } else {
        onParcelSidesUpdate([]);
      }
    }
  }, [coordinates, onCoordinatesUpdate, onParcelSidesUpdate]);

  // Réinitialiser tous les marqueurs
  const clearAllMarkers = useCallback(() => {
    onCoordinatesUpdate([]);
    if (onParcelSidesUpdate) {
      onParcelSidesUpdate([]);
    }
    if (onRoadSidesChange) {
      onRoadSidesChange([]);
    }
  }, [onCoordinatesUpdate, onParcelSidesUpdate, onRoadSidesChange]);

  // Calculer l'orientation d'un côté basé sur le bearing
  const calculateOrientation = (lat1: number, lng1: number, lat2: number, lng2: number): string => {
    const bearing = Math.atan2(lng2 - lng1, lat2 - lat1) * (180 / Math.PI);
    const normalized = (bearing + 360) % 360;
    
    if (normalized >= 315 || normalized < 45) return 'Nord';
    if (normalized >= 45 && normalized < 135) return 'Est';
    if (normalized >= 135 && normalized < 225) return 'Sud';
    return 'Ouest';
  };

  // Mettre à jour parcelSides quand les coordonnées changent
  const updateParcelSidesFromCoordinates = useCallback((coords: Coordinate[]) => {
    if (!onParcelSidesUpdate) return;
    
    const validCoordsLocal = coords.filter(
      coord => coord.lat && coord.lng && !isNaN(parseFloat(coord.lat)) && !isNaN(parseFloat(coord.lng))
    );
    
    if (validCoordsLocal.length < 2) return;
    
    const updatedSides: ParcelSide[] = [];
    
    for (let i = 0; i < validCoordsLocal.length; i++) {
      const nextIndex = (i + 1) % validCoordsLocal.length;
      const current = validCoordsLocal[i];
      const next = validCoordsLocal[nextIndex];
      
      const distance = calculateDistance(
        parseFloat(current.lat),
        parseFloat(current.lng),
        parseFloat(next.lat),
        parseFloat(next.lng)
      );
      
      const currentBorneNum = parseInt(current.borne);
      const existingSide = parcelSides.find(side => {
        const match = side.name.match(/Côté (\d+)/);
        return match && parseInt(match[1]) === currentBorneNum;
      }) || parcelSides[i];
      
      updatedSides.push({
        name: existingSide?.name || `Côté ${currentBorneNum}`,
        length: distance.toFixed(2)
      });
    }
    
    onParcelSidesUpdate(updatedSides);
  }, [onParcelSidesUpdate, parcelSides]);

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
      
      if (roadSides.length !== newSides.length) {
        onRoadSidesChange(newSides);
      }
    }
  }, [validCoords.length]);

  // Calculer la distance entre 2 points GPS
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
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

  // Changer de mode de carte
  const handleModeChange = useCallback((newMode: MapMode) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    
    setMapMode(newMode);
    setSelectedMarkerIndex(null);
    
    const container = map.getContainer();
    
    if (newMode === 'navigation') {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
      container.style.cursor = 'grab';
      container.dataset.drawingMode = 'false';
      
      // Désactiver le drag des marqueurs
      markersRef.current.forEach(marker => {
        if (marker?.dragging) marker.dragging.disable();
      });
    } else if (newMode === 'drawing') {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.touchZoom.disable();
      container.style.cursor = 'crosshair';
      container.dataset.drawingMode = 'true';
      
      // Désactiver le drag des marqueurs
      markersRef.current.forEach(marker => {
        if (marker?.dragging) marker.dragging.disable();
      });
    } else if (newMode === 'editing') {
      map.dragging.disable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.disable();
      map.touchZoom.enable();
      container.style.cursor = 'default';
      container.dataset.drawingMode = 'false';
      
      // Activer le drag des marqueurs
      markersRef.current.forEach(marker => {
        if (marker?.dragging) marker.dragging.enable();
      });
    }
  }, []);

  // Initialiser la carte une seule fois
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: true,
        center: mapCenter,
        zoom: mapConfig.defaultZoom || 15,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Ajouter les contrôles de zoom en bas à droite
      L.control.zoom({
        position: 'bottomright'
      }).addTo(map);

      // Ajouter le contrôle d'échelle
      L.control.scale({
        position: 'bottomleft',
        metric: true,
        imperial: false,
        maxWidth: 100,
      }).addTo(map);

      // Ajouter une boussole (indicateur du nord) compacte
      const CompassControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function() {
          const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
          container.style.backgroundColor = 'white';
          container.style.width = '32px';
          container.style.height = '32px';
          container.style.display = 'flex';
          container.style.alignItems = 'center';
          container.style.justifyContent = 'center';
          container.style.borderRadius = '8px';
          container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
          container.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15 10H9L12 2Z" fill="#dc2626"/>
              <path d="M12 22L9 14H15L12 22Z" fill="#9ca3af"/>
              <circle cx="12" cy="12" r="2" fill="#374151"/>
            </svg>
          `;
          container.title = 'Nord';
          return container;
        }
      });
      new CompassControl().addTo(map);

      // Gestionnaire de clic pour le mode dessin
      if (enableDrawingMode) {
        const addMarkerRef = { current: addMarkerAtPosition };
        
        map.on('click', (e: any) => {
          const container = map.getContainer();
          if (container.dataset.drawingMode === 'true') {
            addMarkerRef.current(e.latlng.lat, e.latlng.lng);
          }
        });
        
        (map as any)._addMarkerRef = addMarkerRef;
      }

      mapInstanceRef.current = map;
      
      map.whenReady(() => {
        setTimeout(() => {
          map.invalidateSize();
          setIsMapReady(true);
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
  }, [mapCenter, mapConfig.defaultZoom, enableDrawingMode]);

  // Mettre à jour la référence addMarkerAtPosition quand elle change
  useEffect(() => {
    if (mapInstanceRef.current && (mapInstanceRef.current as any)._addMarkerRef) {
      (mapInstanceRef.current as any)._addMarkerRef.current = addMarkerAtPosition;
    }
  }, [addMarkerAtPosition]);

  // Mettre à jour les marqueurs et le polygone quand les coordonnées changent
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;

    const updateMap = async () => {
      const L = await import('leaflet');
      const map = mapInstanceRef.current;

      // Supprimer les anciens éléments
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
      segmentLayersRef.current.forEach(layer => layer.remove());
      segmentLayersRef.current = [];

      if (validCoords.length === 0) {
        map.setView(mapConfig.defaultCenter || [0, 0], mapConfig.defaultZoom || 2);
        setSurfaceArea(0);
        return;
      }

      const latLngs: [number, number][] = [];
      
      validCoords.forEach((coord, index) => {
        const lat = parseFloat(coord.lat);
        const lng = parseFloat(coord.lng);
        latLngs.push([lat, lng]);

        if (mapConfig.showMarkers) {
          const markerColor = mapConfig.markerColor || '#3b82f6';
          const isEditing = mapMode === 'editing';
          const isSelected = selectedMarkerIndex === index;
          
          const marker = L.marker([lat, lng], {
            draggable: isEditing,
            icon: L.divIcon({
              className: 'custom-marker',
              html: `<div style="
                background-color: ${isSelected ? '#f97316' : markerColor};
                color: white;
                width: ${isEditing ? '36px' : '28px'};
                height: ${isEditing ? '36px' : '28px'};
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid ${isEditing ? '#fff' : 'rgba(255,255,255,0.8)'};
                box-shadow: 0 3px 10px rgba(0,0,0,0.3);
                transition: all 0.2s ease;
                cursor: ${isEditing ? 'move' : 'pointer'};
              ">
                <span style="transform: rotate(45deg); font-weight: bold; font-size: ${isEditing ? '13px' : '11px'};">${index + 1}</span>
              </div>`,
              iconSize: [isEditing ? 36 : 28, isEditing ? 36 : 28],
              iconAnchor: [isEditing ? 18 : 14, isEditing ? 36 : 28],
            }),
          }).addTo(map);

          marker.on('dragend', () => {
            const newPos = marker.getLatLng();
            const originalIndex = coordinates.findIndex(c => c.borne === coord.borne);
            if (originalIndex !== -1) {
              const updatedCoords = [...coordinates];
              updatedCoords[originalIndex] = {
                ...updatedCoords[originalIndex],
                lat: newPos.lat.toFixed(6),
                lng: newPos.lng.toFixed(6),
              };
              onCoordinatesUpdate(updatedCoords);
              updateParcelSidesFromCoordinates(updatedCoords);
            }
          });

          marker.on('click', () => {
            if (mapMode === 'editing') {
              setSelectedMarkerIndex(index === selectedMarkerIndex ? null : index);
            }
          });

          markersRef.current.push(marker);
        }
      });

      // Dessiner le polygone
      const minMarkers = mapConfig.minMarkers || 3;
      if (latLngs.length >= minMarkers) {
        // Dessiner les segments
        validCoords.forEach((coord, index) => {
          const nextIndex = (index + 1) % validCoords.length;
          const nextCoord = validCoords[nextIndex];
          
          const roadSide = roadSides.find(s => s.sideIndex === index);
          const isRoadBordering = roadSide?.bordersRoad || false;
          const lineColor = mapConfig.lineColor || '#3b82f6';
          
          const segment = L.polyline(
            [
              [parseFloat(coord.lat), parseFloat(coord.lng)],
              [parseFloat(nextCoord.lat), parseFloat(nextCoord.lng)]
            ],
            {
              color: isRoadBordering ? '#f59e0b' : lineColor,
              weight: isRoadBordering ? 5 : (mapConfig.lineWidth || 3),
              opacity: 0.9,
              dashArray: mapConfig.lineStyle === 'dashed' ? '10, 10' : undefined,
            }
          ).addTo(map);
          
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
          }
          
          segmentLayersRef.current.push(segment);
        });
        
        // Polygone rempli
        const fillColor = mapConfig.fillColor || '#3b82f6';
        const polygon = L.polygon(latLngs, {
          color: 'transparent',
          fillColor: fillColor,
          fillOpacity: mapConfig.fillOpacity || 0.2,
          weight: 0,
          interactive: false,
        }).addTo(map);

        polygonRef.current = polygon;

        if (mapConfig.autoCalculateSurface) {
          const area = calculatePolygonArea(latLngs);
          setSurfaceArea(area);
        }
        
        if (mapConfig.showSideDimensions) {
          displaySideDimensions(L, map, latLngs);
        }

        // Ne pas faire de fitBounds automatique pour éviter les mouvements intempestifs
        // Centrer seulement si c'est la première fois ou si explicitement demandé
      } else if (latLngs.length > 0) {
        setSurfaceArea(0);
      }
    };

    updateMap();
  }, [isMapReady, validCoords, coordinates, onCoordinatesUpdate, mapConfig, roadSides, onRoadSidesChange, mapMode, selectedMarkerIndex]);

  // Fonction pour vérifier les parcelles voisines manuellement
  const checkNeighboringParcels = useCallback(async () => {
    if (validCoords.length < 3 || !currentParcelNumber) return;
    
    setLoadingConflicts(true);
    const latLngs: [number, number][] = validCoords.map(c => [parseFloat(c.lat), parseFloat(c.lng)]);
    
    try {
      await detectBoundaryConflicts(latLngs);
      setShowNeighbors(true);
    } finally {
      setLoadingConflicts(false);
    }
  }, [validCoords, currentParcelNumber]);

  // Masquer les parcelles voisines
  const hideNeighboringParcels = useCallback(() => {
    setShowNeighbors(false);
    neighborLayersRef.current.forEach(layer => layer.remove());
    neighborLayersRef.current = [];
    conflictLayersRef.current.forEach(layer => layer.remove());
    conflictLayersRef.current = [];
    setConflictingParcels([]);
  }, []);

  // Détecter les conflits de limites (version sans mouvement automatique)
  const detectBoundaryConflicts = async (latLngs: [number, number][]) => {
    if (!currentParcelNumber || latLngs.length < 3) return;

    try {
      const bounds = calculateBounds(latLngs);
      
      const { data: nearbyParcels, error } = await supabase
        .from('cadastral_parcels')
        .select('id, parcel_number, current_owner_name, location, gps_coordinates')
        .neq('parcel_number', currentParcelNumber)
        .not('gps_coordinates', 'is', null);

      if (error) {
        console.error('Error fetching nearby parcels:', error);
        return;
      }

      if (!nearbyParcels || nearbyParcels.length === 0) return;

      const conflicts: ConflictingParcel[] = [];
      const L = await import('leaflet');
      const map = mapInstanceRef.current;
      if (!map) return;

      nearbyParcels.forEach((parcel: any) => {
        try {
          let parcelCoords: [number, number][] = [];
          
          if (parcel.gps_coordinates) {
            const gpsData = typeof parcel.gps_coordinates === 'string' 
              ? JSON.parse(parcel.gps_coordinates) 
              : parcel.gps_coordinates;
            
            if (Array.isArray(gpsData)) {
              parcelCoords = gpsData.map((coord: any) => {
                if (Array.isArray(coord) && coord.length >= 2) {
                  return [coord[0], coord[1]] as [number, number];
                }
                if (coord.lat !== undefined && coord.lng !== undefined) {
                  return [parseFloat(coord.lat), parseFloat(coord.lng)] as [number, number];
                }
                return null;
              }).filter(Boolean) as [number, number][];
            }
          }

          if (parcelCoords.length < 3) return;

          const overlap = checkPolygonOverlap(latLngs, parcelCoords);
          
          if (overlap.hasOverlap) {
            conflicts.push({
              parcelNumber: parcel.parcel_number,
              ownerName: parcel.current_owner_name,
              location: parcel.location,
              coordinates: parcelCoords,
              overlapArea: overlap.area
            });

            // Afficher la parcelle en conflit
            const conflictPolygon = L.polygon(parcelCoords, {
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
                ${overlap.area ? `<strong>Chevauchement:</strong> ${overlap.area?.toFixed(2)} m²` : ''}
              </div>
            `);

            conflictLayersRef.current.push(conflictPolygon);
          } else if (showNeighbors) {
            // Afficher les parcelles voisines même sans conflit
            const neighborPolygon = L.polygon(parcelCoords, {
              color: '#6b7280',
              fillColor: '#6b7280',
              fillOpacity: 0.15,
              weight: 1,
              dashArray: '3, 3'
            }).addTo(map);

            neighborPolygon.bindPopup(`
              <div style="font-size: 12px;">
                <strong>Parcelle voisine</strong><br/>
                <strong>N°:</strong> ${parcel.parcel_number}<br/>
                <strong>Propriétaire:</strong> ${parcel.current_owner_name}
              </div>
            `);

            neighborLayersRef.current.push(neighborPolygon);
          }
        } catch (err) {
          console.error('Error processing parcel:', err);
        }
      });

      setConflictingParcels(conflicts);
    } catch (error) {
      console.error('Error detecting conflicts:', error);
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
    const hasPointInside = poly1.some(point => isPointInPolygon(point, poly2)) ||
                           poly2.some(point => isPointInPolygon(point, poly1));

    if (!hasPointInside) {
      return { hasOverlap: false };
    }

    const overlapPoints = poly1.filter(point => isPointInPolygon(point, poly2));
    if (overlapPoints.length > 2) {
      const area = calculatePolygonArea(overlapPoints);
      return { hasOverlap: true, area };
    }

    return { hasOverlap: true };
  };

  // Algorithme Ray Casting
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
      
      let distance: number;
      if (parcelSides[i]?.length && parseFloat(parcelSides[i].length) > 0) {
        distance = parseFloat(parcelSides[i].length);
      } else {
        distance = calculateDistance(start[0], start[1], end[0], end[1]);
      }
      
      const midLat = (start[0] + end[0]) / 2;
      const midLng = (start[1] + end[1]) / 2;
      
      const roadSide = roadSides.find(s => s.sideIndex === i);
      const isRoadBordering = roadSide?.bordersRoad || false;
      
      const dimensionMarker = L.marker([midLat, midLng], {
        icon: L.divIcon({
          className: 'dimension-label',
          html: `<div style="
            background-color: white;
            color: #1f2937;
            padding: 3px 6px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 600;
            border: 1.5px solid ${isRoadBordering ? '#f59e0b' : '#3b82f6'};
            box-shadow: 0 2px 4px rgba(0,0,0,0.15);
            white-space: nowrap;
          ">${distance.toFixed(1)}m</div>`,
          iconSize: [0, 0],
        })
      }).addTo(map);
      
      dimensionLayersRef.current.push(dimensionMarker);
    }
  };

  // Calculer la surface d'un polygone en m²
  const calculatePolygonArea = (coords: [number, number][]): number => {
    if (coords.length < 3) return 0;

    const R = 6371000;
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
    return Math.round(area * 100) / 100;
  };

  if (!mapConfig.enabled) {
    return null;
  }

  const handleRoadSideUpdate = (sideIndex: number, updates: Partial<RoadSideInfo>) => {
    if (onRoadSidesChange) {
      const updatedSides = roadSides.map(side =>
        side.sideIndex === sideIndex ? { ...side, ...updates } : side
      );
      onRoadSidesChange(updatedSides);
    }
  };

  useEffect(() => {
    if (onSurfaceChange && surfaceArea > 0) {
      onSurfaceChange(surfaceArea);
    }
  }, [surfaceArea, onSurfaceChange]);

  // Fonction pour centrer la carte sur la parcelle
  const centerOnParcel = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || validCoords.length === 0) return;
    
    const latLngs: [number, number][] = validCoords.map(c => [parseFloat(c.lat), parseFloat(c.lng)]);
    
    if (polygonRef.current) {
      map.fitBounds(polygonRef.current.getBounds(), { padding: [40, 40], animate: true });
    } else if (latLngs.length > 0) {
      map.setView(latLngs[0], mapConfig.defaultZoom || 15, { animate: true });
    }
  }, [validCoords, mapConfig.defaultZoom]);

  return (
    <div className="space-y-3 max-w-[360px] mx-auto">
      {/* Header compact */}
      <Card className="p-2.5 rounded-2xl shadow-sm bg-card/90 backdrop-blur-sm border-border/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Croquis</span>
          </div>
          <div className="flex items-center gap-1.5">
            {coordinates.length > 0 && (
              <Badge variant="outline" className="text-xs h-5 px-1.5 rounded-lg border-border/60">
                {validCoords.length} pts
              </Badge>
            )}
            {surfaceArea > 0 && (
              <Badge className="font-mono text-xs h-5 px-1.5 rounded-lg bg-primary/15 text-primary border-0">
                {surfaceArea.toLocaleString()} m²
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Barre de modes intégrée - Design segmenté moderne */}
      {enableDrawingMode && (
        <div className="flex rounded-2xl bg-muted/60 p-1 shadow-sm border border-border/40">
          <button
            type="button"
            onClick={() => handleModeChange('navigation')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition-all ${
              mapMode === 'navigation'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>Naviguer</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('drawing')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition-all ${
              mapMode === 'drawing'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Tracer</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('editing')}
            disabled={validCoords.length === 0}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition-all ${
              mapMode === 'editing'
                ? 'bg-emerald-500 text-white shadow-sm'
                : validCoords.length === 0
                  ? 'text-muted-foreground/50 cursor-not-allowed'
                  : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Move className="h-3.5 w-3.5" />
            <span>Ajuster</span>
          </button>
        </div>
      )}

      {/* Info mode contextuelle */}
      {mapMode !== 'navigation' && (
        <div className={`flex items-center gap-2 p-2 rounded-xl text-xs ${
          mapMode === 'drawing'
            ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300'
            : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
        }`}>
          <Info className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            {mapMode === 'drawing'
              ? 'Touchez pour placer les bornes'
              : 'Glissez les bornes pour ajuster'}
          </span>
        </div>
      )}

      {/* Alertes de conflit */}
      {conflictingParcels.length > 0 && (
        <Alert variant="destructive" className="py-2 px-2.5 rounded-xl shadow-sm">
          <AlertTriangle className="h-3.5 w-3.5" />
          <AlertDescription className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium">{conflictingParcels.length} conflit(s) détecté(s)</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConflictDialog(true)}
              className="h-6 text-xs rounded-lg px-2"
            >
              Signaler
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Validation du nombre minimum de marqueurs */}
      {mapConfig.minMarkers && validCoords.length > 0 && validCoords.length < mapConfig.minMarkers && (
        <Alert variant="destructive" className="py-2 px-2.5 rounded-xl shadow-sm">
          <AlertCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs">
            Min. {mapConfig.minMarkers} bornes ({validCoords.length} actuel)
          </AlertDescription>
        </Alert>
      )}

      {/* Carte */}
      <Card className={`overflow-hidden relative z-0 rounded-2xl shadow-lg transition-all duration-200 ${
        mapMode === 'drawing'
          ? 'border-2 border-orange-400/60 ring-4 ring-orange-500/10' 
          : mapMode === 'editing'
            ? 'border-2 border-emerald-400/60 ring-4 ring-emerald-500/10'
            : 'border-2 border-primary/20 ring-2 ring-primary/5'
      }`}>
        <div 
          ref={mapRef} 
          className="h-[240px] w-full relative z-0"
          style={{ 
            cursor: mapMode === 'drawing' ? 'crosshair' : mapMode === 'editing' ? 'default' : 'grab' 
          }}
        />
        
        {/* Badge mode actif */}
        {mapMode !== 'navigation' && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className={`text-white text-xs h-5 px-2 rounded-lg shadow-md ${
              mapMode === 'drawing' ? 'bg-orange-500' : 'bg-emerald-500'
            }`}>
              {mapMode === 'drawing' ? (
                <>
                  <Pencil className="h-2.5 w-2.5 mr-1" />
                  Dessin
                </>
              ) : (
                <>
                  <Move className="h-2.5 w-2.5 mr-1" />
                  Édition
                </>
              )}
            </Badge>
          </div>
        )}

        {/* Bouton centrer sur parcelle */}
        {validCoords.length >= 3 && (
          <button
            type="button"
            onClick={centerOnParcel}
            className="absolute top-2 right-12 z-10 h-7 w-7 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
            title="Centrer sur la parcelle"
          >
            <MapPin className="h-3.5 w-3.5 text-gray-600" />
          </button>
        )}
      </Card>

      {/* Contrôles de tracé */}
      {enableDrawingMode && coordinates.length > 0 && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={removeLastMarker}
            className="flex-1 gap-1.5 text-xs h-8 rounded-xl hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
          >
            <Trash2 className="h-3 w-3" />
            Supprimer dernière
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearAllMarkers}
            className="gap-1.5 text-xs h-8 px-2.5 rounded-xl hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Bouton vérification parcelles voisines (manuelle) */}
      {validCoords.length >= 3 && currentParcelNumber && (
        <Card className="p-2.5 rounded-xl bg-muted/30 border-border/40">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Eye className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                Parcelles voisines
              </span>
            </div>
            {!showNeighbors ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={checkNeighboringParcels}
                disabled={loadingConflicts}
                className="h-7 text-xs rounded-lg px-2.5 flex-shrink-0"
              >
                {loadingConflicts ? (
                  <span className="animate-pulse">Recherche...</span>
                ) : (
                  <>
                    <Search className="h-3 w-3 mr-1" />
                    Vérifier
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={hideNeighboringParcels}
                className="h-7 text-xs rounded-lg px-2.5 flex-shrink-0"
              >
                Masquer
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Résumé des dimensions */}
      {validCoords.length >= 3 && parcelSides.length > 0 && (
        <Card className="p-2.5 bg-muted/40 rounded-xl shadow-sm border-border/50">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-primary"></span>
              Dimensions
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              {parcelSides.map((side, index) => (
                <div key={index} className="flex items-center justify-between bg-background/70 p-2 rounded-lg text-xs border border-border/30">
                  <span className="text-muted-foreground">{side.name}</span>
                  <span className="font-mono font-semibold text-foreground">{side.length} m</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Panel côtés bordant route */}
      {validCoords.length >= 3 && onRoadSidesChange && mapConfig.enableRoadBorderingFeature !== false && (
        <RoadBorderingSidesPanel
          sides={roadSides}
          onSideUpdate={handleRoadSideUpdate}
          roadTypes={mapConfig.roadTypes}
        />
      )}

      {/* Dialog conflit */}
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

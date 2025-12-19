import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, MapPin, AlertTriangle, Info, Trash2, Pencil, Check, Navigation, Search, Square, Circle, Triangle, Hexagon, Plus, GripVertical, Move } from 'lucide-react';
import { BoundaryConflictDialog } from './BoundaryConflictDialog';
import { supabase } from '@/integrations/supabase/client';
import { RoadBorderingSidesPanel, RoadSideInfo } from './RoadBorderingSidesPanel';
import { useMapConfig, MapConfig } from '@/hooks/useMapConfig';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface ConstructionShape {
  id: string;
  type: 'circle' | 'square' | 'rectangle' | 'polygon';
  lat: number;
  lng: number;
  size: number;
  label?: string;
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
  const neighborParcelsRef = useRef<any[]>([]);
  const constructionLayersRef = useRef<any[]>([]);
  
  const [surfaceArea, setSurfaceArea] = useState<number>(0);
  const [isMapReady, setIsMapReady] = useState(false);
  const [conflictingParcels, setConflictingParcels] = useState<ConflictingParcel[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [loadingConflicts, setLoadingConflicts] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [constructions, setConstructions] = useState<ConstructionShape[]>([]);
  const [isAddingConstruction, setIsAddingConstruction] = useState<string | null>(null);
  const [showNeighborParcels, setShowNeighborParcels] = useState(false);
  const [loadingNeighbors, setLoadingNeighbors] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<number | null>(null);
  
  // Charger la configuration depuis Supabase
  const { config: dbConfig, loading: configLoading } = useMapConfig();
  
  // Fusionner propConfig avec dbConfig
  const mapConfig = useMemo(() => {
    const baseConfig = { ...dbConfig };
    const finalConfig = { ...baseConfig, ...propConfig };
    return finalConfig;
  }, [dbConfig, propConfig]);

  // Calculer le centre de la carte
  const mapCenter = useMemo(() => {
    if (coordinates.length > 0) {
      const validCoords = coordinates.filter(
        coord => coord.lat && coord.lng && !isNaN(parseFloat(coord.lat)) && !isNaN(parseFloat(coord.lng))
      );
      if (validCoords.length > 0) {
        const lat = parseFloat(validCoords[0].lat);
        const lng = parseFloat(validCoords[0].lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          return [lat, lng] as [number, number];
        }
      }
    }
    const center = mapConfig.defaultCenter;
    if (center && 'lat' in center && 'lng' in center) {
      return [center.lat, center.lng] as [number, number];
    }
    return [0, 0] as [number, number];
  }, [coordinates, mapConfig.defaultCenter]);

  // Coordonnées valides
  const validCoords = useMemo(() => 
    coordinates.filter(
      coord => coord.lat && coord.lng && !isNaN(parseFloat(coord.lat)) && !isNaN(parseFloat(coord.lng))
    ),
    [coordinates]
  );

  // Calculer la distance entre 2 points GPS
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  };

  // Ajouter un nouveau marqueur
  const addMarkerAtPosition = useCallback((lat: number, lng: number) => {
    const newBorneNumber = coordinates.length + 1;
    const newCoordinate: Coordinate = {
      borne: `${newBorneNumber}`,
      lat: lat.toFixed(6),
      lng: lng.toFixed(6)
    };
    
    const updatedCoords = [...coordinates, newCoordinate];
    onCoordinatesUpdate(updatedCoords);
    
    // Mettre à jour les côtés
    if (onParcelSidesUpdate && updatedCoords.length >= 2) {
      updateParcelSides(updatedCoords);
    }
  }, [coordinates, onCoordinatesUpdate, onParcelSidesUpdate]);

  // Ajouter une construction
  const addConstructionAtPosition = useCallback((lat: number, lng: number, type: string) => {
    const newConstruction: ConstructionShape = {
      id: `const_${Date.now()}`,
      type: type as ConstructionShape['type'],
      lat,
      lng,
      size: 10,
      label: `Bâtiment ${constructions.length + 1}`
    };
    setConstructions(prev => [...prev, newConstruction]);
    setIsAddingConstruction(null);
  }, [constructions]);

  // Supprimer le dernier marqueur
  const removeLastMarker = useCallback(() => {
    if (coordinates.length === 0) return;
    const updatedCoords = coordinates.slice(0, -1);
    onCoordinatesUpdate(updatedCoords);
    if (onParcelSidesUpdate) {
      updateParcelSides(updatedCoords);
    }
  }, [coordinates, onCoordinatesUpdate, onParcelSidesUpdate]);

  // Réinitialiser tous les marqueurs
  const clearAllMarkers = useCallback(() => {
    onCoordinatesUpdate([]);
    setConstructions([]);
    if (onParcelSidesUpdate) {
      onParcelSidesUpdate([]);
    }
    if (onRoadSidesChange) {
      onRoadSidesChange([]);
    }
  }, [onCoordinatesUpdate, onParcelSidesUpdate, onRoadSidesChange]);

  // Mettre à jour les côtés de la parcelle
  const updateParcelSides = useCallback((coords: Coordinate[]) => {
    if (!onParcelSidesUpdate) return;
    
    const validCoords = coords.filter(
      c => c.lat && c.lng && !isNaN(parseFloat(c.lat)) && !isNaN(parseFloat(c.lng))
    );
    
    if (validCoords.length < 2) {
      onParcelSidesUpdate([]);
      return;
    }
    
    const newSides: ParcelSide[] = [];
    for (let i = 0; i < validCoords.length; i++) {
      const nextIndex = (i + 1) % validCoords.length;
      const current = validCoords[i];
      const next = validCoords[nextIndex];
      
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
  }, [onParcelSidesUpdate]);

  // Calculer l'orientation d'un côté
  const calculateOrientation = (lat1: number, lng1: number, lat2: number, lng2: number): string => {
    const bearing = Math.atan2(lng2 - lng1, lat2 - lat1) * (180 / Math.PI);
    const normalized = (bearing + 360) % 360;
    
    if (normalized >= 315 || normalized < 45) return 'Nord';
    if (normalized >= 45 && normalized < 135) return 'Est';
    if (normalized >= 135 && normalized < 225) return 'Sud';
    return 'Ouest';
  };

  // Calculer la surface d'un polygone
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

  // Vérifier manuellement les parcelles voisines
  const checkNeighborParcels = useCallback(async () => {
    if (validCoords.length < 3) return;
    
    setLoadingNeighbors(true);
    setShowNeighborParcels(true);
    
    try {
      const latLngs: [number, number][] = validCoords.map(c => [parseFloat(c.lat), parseFloat(c.lng)]);
      const bounds = calculateBounds(latLngs);
      
      const { data: parcels, error } = await supabase
        .from('cadastral_parcels')
        .select('id, parcel_number, current_owner_name, location, gps_coordinates')
        .not('gps_coordinates', 'is', null);
      
      if (error) throw error;
      
      const L = await import('leaflet');
      const map = mapInstanceRef.current;
      
      // Supprimer les anciennes couches voisines
      neighborParcelsRef.current.forEach(layer => layer.remove());
      neighborParcelsRef.current = [];
      
      parcels?.forEach(parcel => {
        if (parcel.parcel_number === currentParcelNumber) return;
        
        try {
          let parcelCoords: [number, number][] = [];
          
          if (parcel.gps_coordinates) {
            const gpsData = parcel.gps_coordinates as any;
            if (Array.isArray(gpsData)) {
              parcelCoords = gpsData
                .map((coord: any) => {
                  if (coord.lat && coord.lng) {
                    return [parseFloat(coord.lat), parseFloat(coord.lng)] as [number, number];
                  }
                  return null;
                })
                .filter(Boolean) as [number, number][];
            }
          }
          
          if (parcelCoords.length >= 3) {
            // Vérifier si cette parcelle est proche de la nouvelle
            const parcelBounds = calculateBounds(parcelCoords);
            const isNearby = !(parcelBounds.maxLat < bounds.minLat || parcelBounds.minLat > bounds.maxLat ||
                              parcelBounds.maxLng < bounds.minLng || parcelBounds.minLng > bounds.maxLng);
            
            if (isNearby) {
              // Afficher la parcelle voisine
              const neighborPolygon = L.polygon(parcelCoords, {
                color: '#6366f1',
                fillColor: '#6366f1',
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '8, 4'
              }).addTo(map);
              
              neighborPolygon.bindPopup(`
                <div style="font-size: 12px; padding: 4px;">
                  <strong>${parcel.parcel_number}</strong><br/>
                  <span style="color: #666;">${parcel.current_owner_name}</span>
                </div>
              `);
              
              neighborParcelsRef.current.push(neighborPolygon);
            }
          }
        } catch (err) {
          console.error('Error processing parcel:', err);
        }
      });
      
    } catch (error) {
      console.error('Error checking neighbors:', error);
    } finally {
      setLoadingNeighbors(false);
    }
  }, [validCoords, currentParcelNumber]);

  // Masquer les parcelles voisines
  const hideNeighborParcels = useCallback(() => {
    neighborParcelsRef.current.forEach(layer => layer.remove());
    neighborParcelsRef.current = [];
    setShowNeighborParcels(false);
  }, []);

  // Calculer les limites géographiques
  const calculateBounds = (coords: [number, number][]) => {
    const lats = coords.map(c => c[0]);
    const lngs = coords.map(c => c[1]);
    return {
      minLat: Math.min(...lats) - 0.001,
      maxLat: Math.max(...lats) + 0.001,
      minLng: Math.min(...lngs) - 0.001,
      maxLng: Math.max(...lngs) + 0.001
    };
  };

  // Initialiser la carte
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
        zoomControl: true,
        attributionControl: true,
        center: mapCenter,
        zoom: mapConfig.defaultZoom || 15,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Échelle
      L.control.scale({
        position: 'bottomleft',
        metric: true,
        imperial: false,
        maxWidth: 150,
      }).addTo(map);

      // Boussole
      const CompassControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function() {
          const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
          container.style.cssText = 'background:white;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.2);';
          container.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L15 10H9L12 2Z" fill="#dc2626"/><path d="M12 22L9 14H15L12 22Z" fill="#6b7280"/><circle cx="12" cy="12" r="2" fill="#374151"/></svg>`;
          container.title = 'Nord';
          return container;
        }
      });
      new CompassControl().addTo(map);

      // Gestionnaire de clic pour le mode dessin ou ajout de construction
      map.on('click', (e: any) => {
        const container = map.getContainer();
        if (container.dataset.drawingMode === 'true') {
          addMarkerAtPosition(e.latlng.lat, e.latlng.lng);
        } else if (container.dataset.addingConstruction) {
          addConstructionAtPosition(e.latlng.lat, e.latlng.lng, container.dataset.addingConstruction);
          container.dataset.addingConstruction = '';
        }
      });

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
  }, [mapCenter, mapConfig.defaultZoom]);

  // Mettre à jour les markers et polygone
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;

    const updateMap = async () => {
      const L = await import('leaflet');
      const map = mapInstanceRef.current;

      // Nettoyer
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      if (polygonRef.current) {
        polygonRef.current.remove();
        polygonRef.current = null;
      }
      dimensionLayersRef.current.forEach(layer => layer.remove());
      dimensionLayersRef.current = [];
      segmentLayersRef.current.forEach(layer => layer.remove());
      segmentLayersRef.current = [];

      if (validCoords.length === 0) {
        map.setView(mapConfig.defaultCenter || [0, 0], mapConfig.defaultZoom || 2);
        setSurfaceArea(0);
        return;
      }

      const latLngs: [number, number][] = [];
      
      // Créer les marqueurs draggables
      validCoords.forEach((coord, index) => {
        const lat = parseFloat(coord.lat);
        const lng = parseFloat(coord.lng);
        latLngs.push([lat, lng]);

        if (mapConfig.showMarkers) {
          const markerColor = mapConfig.markerColor || '#3b82f6';
          const isSelected = selectedMarkerId === index;
          
          const marker = L.marker([lat, lng], {
            draggable: true,
            icon: L.divIcon({
              className: 'custom-marker',
              html: `<div style="
                background-color: ${isSelected ? '#f97316' : markerColor};
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.35);
                font-weight: bold;
                font-size: 13px;
                cursor: grab;
                transition: transform 0.15s ease;
              ">
                <span>${index + 1}</span>
              </div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            }),
          }).addTo(map);

          // Drag handler - tous les marqueurs sont draggables
          marker.on('dragstart', () => {
            setSelectedMarkerId(index);
            marker.getElement()?.style.setProperty('z-index', '1000');
          });

          marker.on('drag', () => {
            // Redessiner le polygone en temps réel
            const newLatLngs: [number, number][] = markersRef.current.map(m => {
              const pos = m.getLatLng();
              return [pos.lat, pos.lng];
            });
            if (polygonRef.current && newLatLngs.length >= 3) {
              polygonRef.current.setLatLngs(newLatLngs);
            }
            // Redessiner les segments
            segmentLayersRef.current.forEach((segment, sIndex) => {
              const nextIndex = (sIndex + 1) % markersRef.current.length;
              const marker1 = markersRef.current[sIndex];
              const marker2 = markersRef.current[nextIndex];
              if (marker1 && marker2) {
                const pos1 = marker1.getLatLng();
                const pos2 = marker2.getLatLng();
                segment.setLatLngs([[pos1.lat, pos1.lng], [pos2.lat, pos2.lng]]);
              }
            });
          });

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
              updateParcelSides(updatedCoords);
            }
          });

          markersRef.current.push(marker);
        }
      });

      // Dessiner les segments et le polygone
      const minMarkers = mapConfig.minMarkers || 3;
      if (latLngs.length >= minMarkers) {
        // Segments avec interaction
        validCoords.forEach((coord, index) => {
          const nextIndex = (index + 1) % validCoords.length;
          const nextCoord = validCoords[nextIndex];
          
          const roadSide = roadSides.find(s => s.sideIndex === index);
          const isRoadBordering = roadSide?.bordersRoad || false;
          const lineColor = mapConfig.lineColor || '#3b82f6';
          
          const segment = L.polyline(
            [[parseFloat(coord.lat), parseFloat(coord.lng)], [parseFloat(nextCoord.lat), parseFloat(nextCoord.lng)]],
            {
              color: isRoadBordering ? '#f59e0b' : lineColor,
              weight: isRoadBordering ? 5 : (mapConfig.lineWidth || 3),
              opacity: 0.9,
              dashArray: mapConfig.lineStyle === 'dashed' ? '10, 10' : undefined,
            }
          ).addTo(map);
          
          if (mapConfig.enableRoadBorderingFeature !== false && onRoadSidesChange) {
            segment.on('click', () => {
              const updatedSides = [...roadSides];
              const sideIndex = updatedSides.findIndex(s => s.sideIndex === index);
              if (sideIndex !== -1) {
                updatedSides[sideIndex] = {
                  ...updatedSides[sideIndex],
                  bordersRoad: !updatedSides[sideIndex].bordersRoad,
                };
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

        // Surface
        if (mapConfig.autoCalculateSurface) {
          const area = calculatePolygonArea(latLngs);
          setSurfaceArea(area);
        }
        
        // Dimensions
        if (mapConfig.showSideDimensions) {
          displaySideDimensions(L, map, latLngs);
        }

        map.fitBounds(polygon.getBounds(), { padding: [40, 40] });
      } else if (latLngs.length > 0) {
        map.setView(latLngs[0], mapConfig.defaultZoom || 15);
        setSurfaceArea(0);
      }
    };

    updateMap();
  }, [isMapReady, validCoords.length, coordinates, onCoordinatesUpdate, mapConfig, roadSides, onRoadSidesChange, selectedMarkerId]);

  // Afficher les constructions
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;

    const displayConstructions = async () => {
      const L = await import('leaflet');
      const map = mapInstanceRef.current;

      // Nettoyer les anciennes constructions
      constructionLayersRef.current.forEach(layer => layer.remove());
      constructionLayersRef.current = [];

      constructions.forEach(construction => {
        let shape: any;
        const shapeColor = '#ef4444';
        
        switch (construction.type) {
          case 'circle':
            shape = L.circle([construction.lat, construction.lng], {
              radius: construction.size,
              color: shapeColor,
              fillColor: shapeColor,
              fillOpacity: 0.4,
              weight: 2,
            });
            break;
          case 'square':
          case 'rectangle':
            const sizeLat = construction.size / 111000;
            const sizeLng = construction.size / (111000 * Math.cos(construction.lat * Math.PI / 180));
            const bounds = [
              [construction.lat - sizeLat / 2, construction.lng - sizeLng / 2],
              [construction.lat + sizeLat / 2, construction.lng + sizeLng / 2]
            ];
            shape = L.rectangle(bounds as any, {
              color: shapeColor,
              fillColor: shapeColor,
              fillOpacity: 0.4,
              weight: 2,
            });
            break;
          case 'polygon':
            const numSides = 6;
            const radius = construction.size / 111000;
            const points: [number, number][] = [];
            for (let i = 0; i < numSides; i++) {
              const angle = (i / numSides) * 2 * Math.PI - Math.PI / 2;
              points.push([
                construction.lat + radius * Math.cos(angle),
                construction.lng + radius * Math.sin(angle) / Math.cos(construction.lat * Math.PI / 180)
              ]);
            }
            shape = L.polygon(points, {
              color: shapeColor,
              fillColor: shapeColor,
              fillOpacity: 0.4,
              weight: 2,
            });
            break;
        }

        if (shape) {
          shape.addTo(map);
          shape.bindPopup(`<div style="font-size:12px;"><strong>${construction.label || 'Construction'}</strong></div>`);
          constructionLayersRef.current.push(shape);
        }
      });
    };

    displayConstructions();
  }, [isMapReady, constructions]);

  // Initialiser/mettre à jour les roadSides
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

  // Afficher les dimensions
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
      
      const formattedDistance = `${distance.toFixed(1)}m`;
      let labelText = mapConfig.showSideLabels ? `C${i + 1}: ${formattedDistance}` : formattedDistance;
      
      const dimensionMarker = L.marker([midLat, midLng], {
        icon: L.divIcon({
          className: 'dimension-label',
          html: `<div style="
            background:white;
            color:${mapConfig.dimensionTextColor || '#000'};
            padding:3px 6px;
            border-radius:6px;
            font-size:11px;
            font-weight:600;
            border:1px solid ${isRoadBordering ? '#f59e0b' : (mapConfig.lineColor || '#3b82f6')};
            box-shadow:0 1px 3px rgba(0,0,0,0.2);
            white-space:nowrap;
          ">${labelText}</div>`,
          iconSize: [0, 0],
        })
      }).addTo(map);
      
      dimensionLayersRef.current.push(dimensionMarker);
    }
  };

  // Propager la surface
  useEffect(() => {
    if (onSurfaceChange && surfaceArea > 0) {
      onSurfaceChange(surfaceArea);
    }
  }, [surfaceArea, onSurfaceChange]);

  // Handler pour mettre à jour un côté
  const handleRoadSideUpdate = (sideIndex: number, updates: Partial<RoadSideInfo>) => {
    if (onRoadSidesChange) {
      const updatedSides = roadSides.map(side =>
        side.sideIndex === sideIndex ? { ...side, ...updates } : side
      );
      onRoadSidesChange(updatedSides);
    }
  };

  // Toggle mode dessin
  const toggleDrawingMode = useCallback((enabled: boolean) => {
    setIsDrawingMode(enabled);
    const map = mapInstanceRef.current;
    if (map) {
      if (enabled) {
        map.dragging.disable();
        map.scrollWheelZoom.disable();
        map.doubleClickZoom.disable();
        map.touchZoom.disable();
        map.getContainer().dataset.drawingMode = 'true';
        map.getContainer().style.cursor = 'crosshair';
      } else {
        map.dragging.enable();
        map.scrollWheelZoom.enable();
        map.doubleClickZoom.enable();
        map.touchZoom.enable();
        map.getContainer().dataset.drawingMode = 'false';
        map.getContainer().style.cursor = 'grab';
      }
    }
  }, []);

  // Démarrer l'ajout d'une construction
  const startAddingConstruction = useCallback((type: string) => {
    setIsAddingConstruction(type);
    toggleDrawingMode(false);
    const map = mapInstanceRef.current;
    if (map) {
      map.getContainer().dataset.addingConstruction = type;
      map.getContainer().style.cursor = 'crosshair';
    }
  }, [toggleDrawingMode]);

  if (!mapConfig.enabled) {
    return null;
  }

  return (
    <div className="space-y-3 max-w-[360px] mx-auto">
      {/* Header compact */}
      <Card className="p-3 rounded-2xl shadow-sm bg-card/80 backdrop-blur-sm border-border/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Aperçu parcelle</span>
          </div>
          <div className="flex items-center gap-1.5">
            {coordinates.length > 0 && (
              <Badge variant="outline" className="gap-1 text-xs h-6 px-2 rounded-xl border-border/60">
                <span className="font-semibold">{validCoords.length}</span>
                <span className="text-muted-foreground">pts</span>
              </Badge>
            )}
            {surfaceArea > 0 && (
              <Badge className="font-mono text-xs h-6 px-2 rounded-xl bg-primary/15 text-primary border-0">
                {surfaceArea.toLocaleString()} m²
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Barre d'outils compacte */}
      {enableDrawingMode && (
        <Card className="p-2 rounded-2xl shadow-sm border-border/50">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Mode Dessin/Navigation Toggle */}
            <Button
              type="button"
              size="sm"
              variant={isDrawingMode ? "default" : "outline"}
              onClick={() => toggleDrawingMode(!isDrawingMode)}
              className={`h-8 rounded-xl gap-1.5 px-2.5 text-xs flex-shrink-0 ${
                isDrawingMode 
                  ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                  : 'hover:bg-muted'
              }`}
            >
              {isDrawingMode ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              <span>{isDrawingMode ? 'Terminer' : 'Tracer'}</span>
            </Button>

            {/* Bouton Formes géométriques */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={`h-8 rounded-xl gap-1.5 px-2.5 text-xs ${
                    isAddingConstruction ? 'border-red-400 bg-red-50 text-red-700' : 'hover:bg-muted'
                  }`}
                  disabled={validCoords.length < 3}
                >
                  <Square className="h-3.5 w-3.5" />
                  <span>Bâtiment</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="rounded-xl shadow-lg">
                <DropdownMenuItem onClick={() => startAddingConstruction('circle')} className="gap-2 text-sm rounded-lg">
                  <Circle className="h-4 w-4 text-red-500" />
                  <span>Cercle</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => startAddingConstruction('square')} className="gap-2 text-sm rounded-lg">
                  <Square className="h-4 w-4 text-red-500" />
                  <span>Carré</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => startAddingConstruction('rectangle')} className="gap-2 text-sm rounded-lg">
                  <GripVertical className="h-4 w-4 text-red-500" />
                  <span>Rectangle</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => startAddingConstruction('polygon')} className="gap-2 text-sm rounded-lg">
                  <Hexagon className="h-4 w-4 text-red-500" />
                  <span>Polygone</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Bouton Vérifier voisins (manuel) */}
            <Button
              type="button"
              size="sm"
              variant={showNeighborParcels ? "default" : "outline"}
              onClick={() => showNeighborParcels ? hideNeighborParcels() : checkNeighborParcels()}
              disabled={validCoords.length < 3 || loadingNeighbors}
              className={`h-8 rounded-xl gap-1.5 px-2.5 text-xs ${
                showNeighborParcels 
                  ? 'bg-indigo-500 hover:bg-indigo-600 text-white' 
                  : 'hover:bg-muted'
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              <span>{loadingNeighbors ? '...' : 'Voisins'}</span>
            </Button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Boutons de suppression */}
            {coordinates.length > 0 && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeLastMarker}
                  className="h-8 rounded-xl px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAllMarkers}
                  className="h-8 rounded-xl px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
                >
                  Tout
                </Button>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Indicateur ajout construction */}
      {isAddingConstruction && (
        <Alert className="py-2 px-3 rounded-xl bg-red-50 border-red-200">
          <Square className="h-4 w-4 text-red-500" />
          <AlertDescription className="flex items-center justify-between gap-2 text-xs text-red-700">
            <span>Cliquez sur la parcelle pour placer le bâtiment</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAddingConstruction(null);
                const map = mapInstanceRef.current;
                if (map) {
                  map.getContainer().dataset.addingConstruction = '';
                  map.getContainer().style.cursor = 'grab';
                }
              }}
              className="h-6 text-xs px-2 rounded-lg hover:bg-red-100"
            >
              Annuler
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Alertes de conflit */}
      {conflictingParcels.length > 0 && (
        <Alert variant="destructive" className="py-2 px-3 rounded-xl shadow-sm">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium">{conflictingParcels.length} conflit(s)</span>
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

      {/* Validation minimum marqueurs */}
      {mapConfig.minMarkers && validCoords.length > 0 && validCoords.length < mapConfig.minMarkers && (
        <Alert variant="destructive" className="py-2 px-3 rounded-xl shadow-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Min. {mapConfig.minMarkers} bornes ({validCoords.length} actuel)
          </AlertDescription>
        </Alert>
      )}

      {/* Info parcelles voisines chargées */}
      {showNeighborParcels && neighborParcelsRef.current.length > 0 && (
        <Alert className="py-2 px-3 rounded-xl bg-indigo-50 border-indigo-200">
          <Info className="h-4 w-4 text-indigo-600" />
          <AlertDescription className="text-xs text-indigo-700">
            {neighborParcelsRef.current.length} parcelle(s) voisine(s) affichée(s)
          </AlertDescription>
        </Alert>
      )}

      {/* Carte */}
      <Card className={`overflow-hidden relative z-0 rounded-2xl shadow-lg transition-all duration-200 ${
        isDrawingMode 
          ? 'border-2 border-orange-400/60 ring-4 ring-orange-500/15' 
          : isAddingConstruction
            ? 'border-2 border-red-400/60 ring-4 ring-red-500/15'
            : 'border-2 border-primary/25 ring-2 ring-primary/5'
      }`}>
        <div 
          ref={mapRef} 
          className="h-[280px] w-full relative z-0"
          style={{ cursor: isDrawingMode || isAddingConstruction ? 'crosshair' : 'grab' }}
        />
        {/* Badge mode actif */}
        {(isDrawingMode || isAddingConstruction) && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className={`text-white text-xs h-6 px-2 rounded-lg shadow-md ${
              isDrawingMode ? 'bg-orange-500' : 'bg-red-500'
            }`}>
              {isDrawingMode ? (
                <>
                  <Pencil className="h-3 w-3 mr-1" />
                  Tracé
                </>
              ) : (
                <>
                  <Square className="h-3 w-3 mr-1" />
                  Bâtiment
                </>
              )}
            </Badge>
          </div>
        )}
        
        {/* Indicateur déplacement bornes */}
        {!isDrawingMode && !isAddingConstruction && validCoords.length > 0 && (
          <div className="absolute bottom-2 left-2 z-10">
            <Badge variant="secondary" className="text-xs h-5 px-2 rounded-lg bg-background/90 shadow-sm">
              <Move className="h-3 w-3 mr-1" />
              Glissez les bornes
            </Badge>
          </div>
        )}
      </Card>

      {/* Constructions listées */}
      {constructions.length > 0 && (
        <Card className="p-3 rounded-2xl shadow-sm border-border/50">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
              Constructions ({constructions.length})
            </Label>
            <div className="grid gap-1.5">
              {constructions.map((c, idx) => (
                <div key={c.id} className="flex items-center justify-between bg-muted/40 p-2 rounded-xl text-sm">
                  <div className="flex items-center gap-2">
                    {c.type === 'circle' && <Circle className="h-3.5 w-3.5 text-red-500" />}
                    {c.type === 'square' && <Square className="h-3.5 w-3.5 text-red-500" />}
                    {c.type === 'rectangle' && <GripVertical className="h-3.5 w-3.5 text-red-500" />}
                    {c.type === 'polygon' && <Hexagon className="h-3.5 w-3.5 text-red-500" />}
                    <span className="text-muted-foreground">{c.label}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConstructions(prev => prev.filter(x => x.id !== c.id))}
                    className="h-6 w-6 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Dimensions calculées */}
      {validCoords.length >= 3 && parcelSides.length > 0 && (
        <Card className="p-3 bg-muted/40 rounded-2xl shadow-sm border-border/50">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
              Dimensions
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              {parcelSides.map((side, index) => (
                <div key={index} className="flex items-center justify-between bg-background/70 p-2 rounded-xl text-sm border border-border/30">
                  <span className="text-muted-foreground font-medium text-xs">{side.name}</span>
                  <span className="font-mono font-semibold text-foreground text-xs">{side.length} m</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
      
      {/* Info aide */}
      <Card className="p-2.5 rounded-xl bg-muted/30 border-border/40">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isDrawingMode 
              ? "Touchez pour ajouter des bornes. 'Terminer' pour naviguer."
              : isAddingConstruction
                ? "Touchez l'intérieur de la parcelle pour placer un bâtiment."
                : enableDrawingMode
                  ? "Glissez les bornes pour ajuster. 'Tracer' pour ajouter."
                  : "Utilisez les contrôles pour modifier les bornes."
            }
          </p>
        </div>
      </Card>

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

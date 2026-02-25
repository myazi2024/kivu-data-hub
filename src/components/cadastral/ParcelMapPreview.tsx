import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, MapPin, AlertTriangle, Info, Move, Hand, Plus, Trash2, Target, Pencil, Check, Navigation, Eye, Square, Circle, Triangle, Hexagon, Building2, Layers, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, X, RotateCw, RotateCcw, Compass } from 'lucide-react';
import { BoundaryConflictDialog } from './BoundaryConflictDialog';
import { supabase } from '@/integrations/supabase/client';
import { RoadSideInfo } from './RoadBorderingSidesPanel';
import { ParcelSidesDimensionsPanel } from './ParcelSidesDimensionsPanel';
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

// Type pour les formes géométriques (constructions)
interface BuildingShape {
  id: string;
  type: 'circle' | 'square' | 'rectangle' | 'trapeze' | 'polygon';
  center: { lat: number; lng: number };
  size: number; // en mètres
  rotation?: number;
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
  buildingShapes?: BuildingShape[];
  onBuildingShapesChange?: (shapes: BuildingShape[]) => void;
}

const SHAPE_OPTIONS = [
  { type: 'circle' as const, label: 'Cercle', icon: Circle },
  { type: 'square' as const, label: 'Carré', icon: Square },
  { type: 'rectangle' as const, label: 'Rectangle', icon: Square },
  { type: 'trapeze' as const, label: 'Trapèze', icon: Triangle },
  { type: 'polygon' as const, label: 'Polygone', icon: Hexagon },
];

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
  onSurfaceChange,
  buildingShapes = [],
  onBuildingShapesChange
}: ParcelMapPreviewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polygonRef = useRef<any>(null);
  const dimensionLayersRef = useRef<any[]>([]);
  const conflictLayersRef = useRef<any[]>([]);
  const segmentLayersRef = useRef<any[]>([]);
  const neighborLayersRef = useRef<any[]>([]);
  const buildingLayersRef = useRef<any[]>([]);
  const mapControlsRef = useRef<any[]>([]);
  const userLocationLayersRef = useRef<any[]>([]);

  // Refs pour les callbacks afin d'éviter les closures obsolètes
  const addMarkerCallbackRef = useRef<(lat: number, lng: number) => void>(() => {});
  const addBuildingCallbackRef = useRef<(lat: number, lng: number) => void>(() => {});

  // Déplacement précis (appui prolongé)
  const selectedBorneRef = useRef<string | null>(null);
  const selectedMarkerRef = useRef<any>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const renderSeqRef = useRef(0);
  
  // Ref pour appui prolongé sur les boutons de contrôle
  const controlButtonIntervalRef = useRef<number | null>(null);
  const controlButtonTimeoutRef = useRef<number | null>(null);

  const [surfaceArea, setSurfaceArea] = useState<number>(0);
  const [perimeterLength, setPerimeterLength] = useState<number>(0);
  
  // Ref pour stocker la superficie stable (ne change pas avec rotation/translation)
  const stableSurfaceRef = useRef<number>(0);
  const stablePerimeterRef = useRef<number>(0);
  const lastParcelSidesLengthRef = useRef<string>('');
  const [isMapReady, setIsMapReady] = useState(false);
  const [conflictingParcels, setConflictingParcels] = useState<ConflictingParcel[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [loadingConflicts, setLoadingConflicts] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isGroupDragMode, setIsGroupDragMode] = useState(false);
  const [showNeighbors, setShowNeighbors] = useState(false);
  const [selectedShapeType, setSelectedShapeType] = useState<BuildingShape['type'] | null>(null);
  const [isAddingBuilding, setIsAddingBuilding] = useState(false);
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [selectedBorne, setSelectedBorne] = useState<string | null>(null);
  const [moveStepMeters, setMoveStepMeters] = useState<number>(0.5);
  const [parcelRotationDegrees, setParcelRotationDegrees] = useState<number>(0);
  const [showParcelControls, setShowParcelControls] = useState(false);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [mapBearing, setMapBearing] = useState<number>(0);
  const [editingSideIndex, setEditingSideIndex] = useState<number | null>(null);
  const [editingSideValue, setEditingSideValue] = useState<string>('');
  const dimensionLongPressRef = useRef<number | null>(null);
  
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

  // Mémoriser les coordonnées valides
  const validCoords = useMemo(() => 
    coordinates.filter(
      coord => coord.lat && coord.lng && !isNaN(parseFloat(coord.lat)) && !isNaN(parseFloat(coord.lng))
    ),
    [coordinates]
  );

  // Vérifie si la parcelle est complète (min 3 points)
  const isParcelComplete = validCoords.length >= 3;
  
  // Refs pour stocker les dernières valeurs (utilisées dans les callbacks stables)
  const coordinatesRef = useRef(coordinates);
  const validCoordsRef = useRef(validCoords);
  const roadSidesRef = useRef(roadSides);
  const buildingShapesRef = useRef(buildingShapes);
  const moveStepMetersRef = useRef(moveStepMeters);
  
  // Synchroniser les refs avec les valeurs courantes
  useEffect(() => { coordinatesRef.current = coordinates; }, [coordinates]);
  useEffect(() => { validCoordsRef.current = validCoords; }, [validCoords]);
  useEffect(() => { roadSidesRef.current = roadSides; }, [roadSides]);
  useEffect(() => { buildingShapesRef.current = buildingShapes; }, [buildingShapes]);
  useEffect(() => { moveStepMetersRef.current = moveStepMeters; }, [moveStepMeters]);

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

  // Mettre à jour la ref du callback pour que le handler de clic utilise toujours la version courante
  useEffect(() => {
    addMarkerCallbackRef.current = addMarkerAtPosition;
  }, [addMarkerAtPosition]);

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
    if (onBuildingShapesChange) {
      onBuildingShapesChange([]);
    }
    setShowNeighbors(false);
    // Réinitialiser les données de surface et périmètre
    setSurfaceArea(0);
    setPerimeterLength(0);
    stableSurfaceRef.current = 0;
    stablePerimeterRef.current = 0;
    lastParcelSidesLengthRef.current = '';
    setShowClearAllDialog(false);
  }, [onCoordinatesUpdate, onParcelSidesUpdate, onRoadSidesChange, onBuildingShapesChange]);

  // Calculer l'orientation d'un côté (prend en compte le mapBearing)
  const calculateOrientation = useCallback((lat1: number, lng1: number, lat2: number, lng2: number, bearing: number = 0): string => {
    const geoBearing = Math.atan2(lng2 - lng1, lat2 - lat1) * (180 / Math.PI);
    // Appliquer le décalage du bearing de la carte
    const adjusted = (geoBearing - bearing + 360) % 360;
    
    if (adjusted >= 315 || adjusted < 45) return 'Nord';
    if (adjusted >= 45 && adjusted < 135) return 'Est';
    if (adjusted >= 135 && adjusted < 225) return 'Sud';
    return 'Ouest';
  }, []);

  // Mettre à jour parcelSides quand les coordonnées changent
  const updateParcelSidesFromCoordinates = useCallback((coords: Coordinate[]) => {
    if (!onParcelSidesUpdate) return;
    
    const validCoords = coords.filter(
      coord => coord.lat && coord.lng && !isNaN(parseFloat(coord.lat)) && !isNaN(parseFloat(coord.lng))
    );
    
    if (validCoords.length < 2) return;
    
    const updatedSides: ParcelSide[] = [];
    
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

  // Initialiser/mettre à jour les roadSides quand les coordonnées ou le bearing changent
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
          parseFloat(nextCoord.lng),
          mapBearing
        );
        
        return {
          sideIndex: index,
          bordersRoad: existingSide?.bordersRoad || false,
          roadType: existingSide?.roadType,
          roadName: existingSide?.roadName,
          roadWidth: existingSide?.roadWidth,
          borderType: existingSide?.borderType,
          wallHeight: existingSide?.wallHeight,
          wallMaterial: existingSide?.wallMaterial,
          orientation,
          length,
        };
      });
      
      // Mettre à jour si le nombre de côtés change OU si les orientations ont changé
      const orientationsChanged = roadSides.length === newSides.length && 
        newSides.some((side, i) => roadSides[i]?.orientation !== side.orientation);
      
      if (roadSides.length !== newSides.length || orientationsChanged) {
        onRoadSidesChange(newSides);
      }
    }
  }, [validCoords.length, mapBearing, calculateOrientation]);

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

      // Contrôle de zoom en bas à droite
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Échelle
      L.control.scale({
        position: 'bottomleft',
        metric: true,
        imperial: false,
        maxWidth: 120,
      }).addTo(map);

      // Handler de clic pour le mode dessin - utilise les refs pour éviter les closures obsolètes
      map.on('click', (e: any) => {
        const container = map.getContainer();
        if (container.dataset.markerMoving === 'true') return;

        if (container.dataset.drawingMode === 'true') {
          addMarkerCallbackRef.current(e.latlng.lat, e.latlng.lng);
        } else if (container.dataset.addingBuilding === 'true') {
          addBuildingCallbackRef.current(e.latlng.lat, e.latlng.lng);
        }
      });

      mapInstanceRef.current = map;
      setIsMapReady(true);
      
      // Géolocalisation automatique à l'ouverture - demande immédiate
      const requestGeolocation = () => {
        if (!('geolocation' in navigator)) {
          console.warn('Géolocalisation non supportée par ce navigateur');
          return;
        }
        
        // Demander la position avec haute précision
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            
            // Centrer la carte sur la position de l'utilisateur
            map.setView([latitude, longitude], 18);
            
            // Nettoyer les anciens marqueurs de position
            userLocationLayersRef.current.forEach(layer => {
              try {
                if (map.hasLayer(layer)) map.removeLayer(layer);
              } catch (e) {}
            });
            userLocationLayersRef.current = [];
            
            // Cercle de précision (zone floue)
            const accuracyCircle = L.circle([latitude, longitude], {
              radius: Math.min(accuracy, 50),
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.15,
              weight: 2,
              dashArray: '5,5'
            }).addTo(map);
            userLocationLayersRef.current.push(accuracyCircle);
            
            // Cercle pulsant externe pour attirer l'attention
            const pulseCircle = L.circleMarker([latitude, longitude], {
              radius: 20,
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.3,
              weight: 2
            }).addTo(map);
            userLocationLayersRef.current.push(pulseCircle);
            
            // Marqueur central de position utilisateur (point bleu)
            const userLocationMarker = L.circleMarker([latitude, longitude], {
              radius: 12,
              color: '#ffffff',
              fillColor: '#3b82f6',
              fillOpacity: 1,
              weight: 3
            }).addTo(map);
            userLocationMarker.bindPopup(
              '<div style="text-align:center;"><strong>📍 Votre position</strong><br/><span style="color:#666;">Précision: ~' + Math.round(accuracy) + 'm</span></div>'
            ).openPopup();
            userLocationLayersRef.current.push(userLocationMarker);
            
            // Point central blanc pour effet "bullseye"
            const innerDot = L.circleMarker([latitude, longitude], {
              radius: 5,
              color: '#3b82f6',
              fillColor: '#ffffff',
              fillOpacity: 1,
              weight: 0
            }).addTo(map);
            userLocationLayersRef.current.push(innerDot);
            
            console.log('Position utilisateur chargée:', { latitude, longitude, accuracy });
          },
          (error) => {
            console.warn('Erreur géolocalisation:', error.code, error.message);
            // Afficher un message à l'utilisateur sur la carte
            const errorMessages: Record<number, string> = {
              1: 'Permission refusée. Veuillez autoriser la géolocalisation.',
              2: 'Position non disponible.',
              3: 'Délai de réponse dépassé.'
            };
            console.log('Géolocalisation:', errorMessages[error.code] || error.message);
          },
          { 
            enableHighAccuracy: true, 
            timeout: 10000, 
            maximumAge: 0 // Toujours demander une position fraîche
          }
        );
      };
      
      // Déclencher immédiatement la géolocalisation
      requestGeolocation();
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Mettre à jour le pas de déplacement (mètres) en fonction de l'échelle/zoom
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const computeStep = () => {
      try {
        // Approximation: distance en mètres pour 100px sur l'écran => “échelle” exploitable
        const p1 = map.containerPointToLatLng([0, 0]);
        const p2 = map.containerPointToLatLng([100, 0]);
        const scaleMeters = map.distance(p1, p2);

        let step = 0.5;
        if (scaleMeters > 200 && scaleMeters <= 500) step = 0.5 * Math.pow(2, 1);
        else if (scaleMeters > 500 && scaleMeters <= 1000) step = 0.5 * Math.pow(2, 2);
        else if (scaleMeters > 1000) step = 0.5 * Math.pow(2, 3);

        setMoveStepMeters(step);
      } catch (err) {
        console.error('computeStep error', err);
      }
    };

    computeStep();
    map.on('zoomend', computeStep);
    map.on('moveend', computeStep);

    return () => {
      map.off('zoomend', computeStep);
      map.off('moveend', computeStep);
    };
  }, [isMapReady]);

  // Ajouter une forme de construction
  const addBuildingShape = useCallback((lat: number, lng: number) => {
    if (!selectedShapeType || !isParcelComplete) return;
    
    // Vérifier si le point est dans la parcelle
    const latLngs = validCoords.map(c => [parseFloat(c.lat), parseFloat(c.lng)] as [number, number]);
    if (!isPointInPolygon([lat, lng], latLngs)) {
      return; // Le point n'est pas dans la parcelle
    }
    
    const newShape: BuildingShape = {
      id: `building-${Date.now()}`,
      type: selectedShapeType,
      center: { lat, lng },
      size: 5, // 5 mètres par défaut
    };
    
    const updatedShapes = [...buildingShapes, newShape];
    if (onBuildingShapesChange) {
      onBuildingShapesChange(updatedShapes);
    }
    
    // Désactiver le mode ajout après l'ajout
    setIsAddingBuilding(false);
    setSelectedShapeType(null);
    const map = mapInstanceRef.current;
    if (map) {
      map.getContainer().dataset.addingBuilding = 'false';
      map.getContainer().style.cursor = 'grab';
    }
  }, [selectedShapeType, isParcelComplete, validCoords, buildingShapes, onBuildingShapesChange]);

  // Mettre à jour la ref du callback building pour éviter les closures obsolètes
  useEffect(() => {
    addBuildingCallbackRef.current = addBuildingShape;
  }, [addBuildingShape]);

  // Vérifier les parcelles voisines (manuel)
  const checkNeighborParcels = useCallback(async () => {
    if (!isMapReady || !mapInstanceRef.current || validCoords.length < 3) return;
    
    setLoadingConflicts(true);
    const L = await import('leaflet');
    const map = mapInstanceRef.current;
    
    // Nettoyer les anciens affichages de voisins
    neighborLayersRef.current.forEach(layer => {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    });
    neighborLayersRef.current = [];
    
    const latLngs = validCoords.map(c => [parseFloat(c.lat), parseFloat(c.lng)] as [number, number]);
    const bounds = calculateBounds(latLngs);
    
    try {
      const { data: nearbyParcels, error } = await supabase
        .from('cadastral_parcels')
        .select('*')
        .neq('parcel_number', currentParcelNumber || '')
        .gte('latitude', bounds.minLat)
        .lte('latitude', bounds.maxLat)
        .gte('longitude', bounds.minLng)
        .lte('longitude', bounds.maxLng)
        .not('gps_coordinates', 'is', null);

      if (error) throw error;

      const conflicts: ConflictingParcel[] = [];

      nearbyParcels?.forEach((parcel: any) => {
        try {
          const parcelCoords = parcel.gps_coordinates as any[];
          if (!parcelCoords || parcelCoords.length < 3) return;

          const neighborLatLngs: [number, number][] = parcelCoords
            .filter(c => c.lat && c.lng)
            .map(c => [parseFloat(c.lat), parseFloat(c.lng)]);

          if (neighborLatLngs.length < 3) return;

          // Afficher la parcelle voisine
          const neighborPolygon = L.polygon(neighborLatLngs, {
            color: '#6366f1',
            fillColor: '#6366f1',
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '5, 5'
          }).addTo(map);

          neighborPolygon.bindPopup(`
            <div style="font-size: 12px; min-width: 140px;">
              <strong style="color: #6366f1;">Parcelle voisine</strong><br/>
              <strong>N°:</strong> ${parcel.parcel_number}<br/>
              <strong>Propriétaire:</strong> ${parcel.current_owner_name || 'Inconnu'}
            </div>
          `);

          neighborLayersRef.current.push(neighborPolygon);

          // Vérifier le chevauchement
          const overlap = checkPolygonOverlap(latLngs, neighborLatLngs);
          if (overlap.hasOverlap) {
            conflicts.push({
              parcelNumber: parcel.parcel_number,
              ownerName: parcel.current_owner_name || 'Propriétaire inconnu',
              location: parcel.location || `${parcel.quartier}, ${parcel.ville}`,
              coordinates: neighborLatLngs,
              overlapArea: overlap.area
            });
          }
        } catch (err) {
          console.error('Error processing parcel:', err);
        }
      });

      setConflictingParcels(conflicts);
      setShowNeighbors(true);
    } catch (error) {
      console.error('Error checking neighbors:', error);
    } finally {
      setLoadingConflicts(false);
    }
  }, [isMapReady, validCoords, currentParcelNumber]);

  // Masquer les parcelles voisines
  const hideNeighborParcels = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    
    neighborLayersRef.current.forEach(layer => {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    });
    neighborLayersRef.current = [];
    setShowNeighbors(false);
    setConflictingParcels([]);
  }, []);

  // Mettre à jour les marqueurs et polygone
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;

    let cancelled = false;
    const seq = ++renderSeqRef.current;

    const updateMap = async () => {
      try {
        const L = await import('leaflet');
        if (cancelled || seq !== renderSeqRef.current) return;

        const map = mapInstanceRef.current;
        if (!map) return;

        const container = map.getContainer();
        if (!container.dataset.markerMoving) container.dataset.markerMoving = 'false';

        // Nettoyer les anciens éléments
        markersRef.current.forEach(marker => {
          try {
            if (marker && map.hasLayer(marker)) map.removeLayer(marker);
          } catch (e) {
            console.error('remove marker error', e);
          }
        });
        markersRef.current = [];

        if (polygonRef.current) {
          try {
            if (map.hasLayer(polygonRef.current)) map.removeLayer(polygonRef.current);
          } catch (e) {
            console.error('remove polygon error', e);
          }
          polygonRef.current = null;
        }

        dimensionLayersRef.current.forEach(layer => {
          try {
            if (layer && map.hasLayer(layer)) map.removeLayer(layer);
          } catch (e) {
            console.error('remove dimension error', e);
          }
        });
        dimensionLayersRef.current = [];

        segmentLayersRef.current.forEach(layer => {
          try {
            if (layer && map.hasLayer(layer)) map.removeLayer(layer);
          } catch (e) {
            console.error('remove segment error', e);
          }
        });
        segmentLayersRef.current = [];

        buildingLayersRef.current.forEach(layer => {
          try {
            if (layer && map.hasLayer(layer)) map.removeLayer(layer);
          } catch (e) {
            console.error('remove building layer error', e);
          }
        });
        buildingLayersRef.current = [];

        const latLngs: [number, number][] = [];
        const markerColor = mapConfig.markerColor || '#3b82f6';
        const isMarkerMoveMode = Boolean(selectedBorneRef.current);
        const shouldAutoCenter = !isDrawingMode && !isGroupDragMode && !selectedBorne && !isMarkerMoveMode;

        // Créer les marqueurs
        validCoords.forEach((coord, index) => {
          const lat = parseFloat(coord.lat);
          const lng = parseFloat(coord.lng);
          if (Number.isNaN(lat) || Number.isNaN(lng)) return;
          latLngs.push([lat, lng]);

          const isSelected = selectedBorne === coord.borne;
          const marker = L.marker([lat, lng], {
            draggable: !isGroupDragMode && !isDrawingMode && !isMarkerMoveMode && mapConfig.enableDragging !== false,
            icon: L.divIcon({
              className: 'custom-marker',
              html: `<div style="
                background-color: ${markerColor};
                color: white;
                width: ${isSelected ? 32 : 28}px;
                height: ${isSelected ? 32 : 28}px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                border: ${isSelected ? 3 : 2}px solid white;
                box-shadow: 0 2px 10px rgba(0,0,0,0.35);
              ">
                <span style="transform: rotate(45deg); font-weight: 800; font-size: 11px;">${index + 1}</span>
              </div>`,
              iconSize: [isSelected ? 32 : 28, isSelected ? 32 : 28],
              iconAnchor: [14, 28],
            }),
          }).addTo(map);

          // Appui prolongé = sélection + mode déplacement précis
          const startLongPress = () => {
            if (isDrawingMode || isGroupDragMode || isAddingBuilding) return;
            if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);

            longPressTimerRef.current = window.setTimeout(() => {
              selectedBorneRef.current = coord.borne;
              selectedMarkerRef.current = marker;
              setSelectedBorne(coord.borne);

              const mapNow = mapInstanceRef.current;
              if (mapNow) {
                const cont = mapNow.getContainer();
                cont.dataset.markerMoving = 'true';
                mapNow.dragging.disable();
                mapNow.scrollWheelZoom.disable();
                mapNow.doubleClickZoom.disable();
                mapNow.touchZoom.disable();
              }
            }, 450);
          };

          const cancelLongPress = () => {
            if (longPressTimerRef.current) {
              window.clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
            }
          };

          marker.on('mousedown', startLongPress);
          marker.on('touchstart', startLongPress);
          marker.on('mouseup', cancelLongPress);
          marker.on('touchend', cancelLongPress);
          marker.on('mouseout', cancelLongPress);
          marker.on('dragstart', cancelLongPress);

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

          markersRef.current.push(marker);
        });

        // Dessiner le polygone
        const minMarkers = mapConfig.minMarkers || 3;
        if (latLngs.length >= minMarkers) {
          // Segments avec interaction
          validCoords.forEach((coord, index) => {
            const nextIndex = (index + 1) % validCoords.length;
            const nextCoord = validCoords[nextIndex];

            const roadSide = roadSides.find(s => s.sideIndex === index);
            const isRoadBordering = roadSide?.bordersRoad && roadSide?.isConfirmed;
            const lineColor = mapConfig.lineColor || '#3b82f6';

            const segment = L.polyline(
              [
                [parseFloat(coord.lat), parseFloat(coord.lng)],
                [parseFloat(nextCoord.lat), parseFloat(nextCoord.lng)]
              ],
              {
                color: isRoadBordering ? '#f59e0b' : lineColor,
                weight: isRoadBordering ? 4 : (mapConfig.lineWidth || 3),
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

          // Calculer la surface et le périmètre à partir des dimensions stockées (stables)
          if (mapConfig.autoCalculateSurface) {
            // Créer une clé représentant les longueurs des côtés pour détecter les vrais changements
            const currentSidesKey = parcelSides.map(s => s.length).join(',');
            
            // Calculer le périmètre à partir des dimensions stockées
            if (parcelSides.length > 0 && parcelSides.length === latLngs.length) {
              const perimeter = parcelSides.reduce((sum, side) => {
                const len = parseFloat(side.length);
                return sum + (isNaN(len) ? 0 : len);
              }, 0);
              const roundedPerimeter = Math.round(perimeter * 100) / 100;
              
              // Ne recalculer la superficie que si les dimensions des côtés ont vraiment changé
              // (pas lors d'une simple rotation/translation)
              if (lastParcelSidesLengthRef.current !== currentSidesKey || stableSurfaceRef.current === 0) {
                lastParcelSidesLengthRef.current = currentSidesKey;
                const area = calculatePolygonArea(latLngs);
                stableSurfaceRef.current = area;
                stablePerimeterRef.current = roundedPerimeter;
              }
              
              // Utiliser les valeurs stables
              setSurfaceArea(stableSurfaceRef.current);
              setPerimeterLength(stablePerimeterRef.current);
              if (onSurfaceChange) {
                onSurfaceChange(stableSurfaceRef.current);
              }
            } else {
              // Pas de parcelSides valides, calculer normalement
              const area = calculatePolygonArea(latLngs);
              setSurfaceArea(area);
              setPerimeterLength(0);
              stableSurfaceRef.current = area;
              stablePerimeterRef.current = 0;
              lastParcelSidesLengthRef.current = '';
              if (onSurfaceChange) {
                onSurfaceChange(area);
              }
            }
          }

          // Afficher les dimensions
          if (mapConfig.showSideDimensions) {
            displaySideDimensions(L, map, latLngs);
          }

          if (shouldAutoCenter) {
            map.fitBounds(polygon.getBounds(), { padding: [40, 40] });
          }
        } else if (latLngs.length > 0) {
          if (shouldAutoCenter) {
            map.setView(latLngs[0], mapConfig.defaultZoom || 15);
          }
          setSurfaceArea(0);
          setPerimeterLength(0);
          stableSurfaceRef.current = 0;
          stablePerimeterRef.current = 0;
          lastParcelSidesLengthRef.current = '';
        }

        // Dessiner les formes de construction
        buildingShapes.forEach(shape => {
          const shapeLayer = drawBuildingShape(L, map, shape);
          if (shapeLayer) {
            buildingLayersRef.current.push(shapeLayer);
          }
        });
      } catch (err) {
        console.error('ParcelMapPreview updateMap error:', err);
      }
    };

    // Utiliser requestAnimationFrame pour éviter les mises à jour trop rapides
    const rafId = requestAnimationFrame(() => {
      updateMap();
    });

    return () => {
      cancelAnimationFrame(rafId);
      cancelled = true;
    };
  }, [isMapReady, JSON.stringify(validCoords), JSON.stringify(roadSides), mapConfig, isGroupDragMode, isDrawingMode, selectedBorne, isAddingBuilding]);

  // Dessiner une forme de construction
  const drawBuildingShape = (L: any, map: any, shape: BuildingShape) => {
    const metersToLat = 1 / 111320;
    const metersToLng = 1 / (111320 * Math.cos(shape.center.lat * Math.PI / 180));
    
    let layer;
    
    switch (shape.type) {
      case 'circle':
        layer = L.circle([shape.center.lat, shape.center.lng], {
          radius: shape.size,
          color: '#dc2626',
          fillColor: '#dc2626',
          fillOpacity: 0.4,
          weight: 2,
        }).addTo(map);
        break;
        
      case 'square':
        const halfSize = shape.size * metersToLat;
        const halfSizeLng = shape.size * metersToLng;
        layer = L.rectangle([
          [shape.center.lat - halfSize, shape.center.lng - halfSizeLng],
          [shape.center.lat + halfSize, shape.center.lng + halfSizeLng]
        ], {
          color: '#dc2626',
          fillColor: '#dc2626',
          fillOpacity: 0.4,
          weight: 2,
        }).addTo(map);
        break;
        
      case 'rectangle':
        const halfWidth = shape.size * metersToLat;
        const halfHeight = (shape.size * 0.6) * metersToLng;
        layer = L.rectangle([
          [shape.center.lat - halfWidth, shape.center.lng - halfHeight],
          [shape.center.lat + halfWidth, shape.center.lng + halfHeight]
        ], {
          color: '#dc2626',
          fillColor: '#dc2626',
          fillOpacity: 0.4,
          weight: 2,
        }).addTo(map);
        break;
        
      default:
        const radius = shape.size * metersToLat;
        const points: [number, number][] = [];
        const sides = shape.type === 'trapeze' ? 4 : 6;
        for (let i = 0; i < sides; i++) {
          const angle = (2 * Math.PI * i) / sides;
          points.push([
            shape.center.lat + radius * Math.cos(angle),
            shape.center.lng + radius * Math.sin(angle) * metersToLng / metersToLat
          ]);
        }
        layer = L.polygon(points, {
          color: '#dc2626',
          fillColor: '#dc2626',
          fillOpacity: 0.4,
          weight: 2,
        }).addTo(map);
    }
    
    if (layer) {
      layer.bindPopup(`
        <div style="font-size: 12px;">
          <strong style="color: #dc2626;">Construction</strong><br/>
          <span>Type: ${shape.type}</span>
        </div>
      `);
    }
    
    return layer;
  };

  // Gérer le mode déplacement groupé
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;
    
    const map = mapInstanceRef.current;
    const mapContainer = map.getContainer();
    
    if (isGroupDragMode && markersRef.current.length > 0) {
      mapContainer.style.cursor = 'move';
      
      markersRef.current.forEach(marker => {
        if (marker && marker.dragging) marker.dragging.disable();
      });
      
      let isDragging = false;
      let startPoint: { lat: number; lng: number } | null = null;
      
      const onMouseDown = (e: any) => {
        if (e.originalEvent?.target?.closest('.leaflet-control')) return;
        isDragging = true;
        startPoint = e.latlng;
        map.dragging.disable();
        mapContainer.style.cursor = 'grabbing';
      };
      
      const onMouseMove = (e: any) => {
        if (!isDragging || !startPoint) return;
        
        const currentPoint = e.latlng;
        const deltaLat = currentPoint.lat - startPoint.lat;
        const deltaLng = currentPoint.lng - startPoint.lng;
        
        markersRef.current.forEach(marker => {
          if (marker) {
            const markerPos = marker.getLatLng();
            marker.setLatLng([markerPos.lat + deltaLat, markerPos.lng + deltaLng]);
          }
        });
        
        if (polygonRef.current && markersRef.current.length >= 3) {
          const newLatLngs: [number, number][] = markersRef.current.map(m => {
            const pos = m.getLatLng();
            return [pos.lat, pos.lng];
          });
          polygonRef.current.setLatLngs(newLatLngs);
        }
        
        segmentLayersRef.current.forEach((segment, index) => {
          const nextIndex = (index + 1) % markersRef.current.length;
          const marker1 = markersRef.current[index];
          const marker2 = markersRef.current[nextIndex];
          if (marker1 && marker2) {
            const pos1 = marker1.getLatLng();
            const pos2 = marker2.getLatLng();
            segment.setLatLngs([[pos1.lat, pos1.lng], [pos2.lat, pos2.lng]]);
          }
        });
        
        startPoint = currentPoint;
      };
      
      const onMouseUp = () => {
        if (!isDragging) return;
        isDragging = false;
        startPoint = null;
        mapContainer.style.cursor = 'move';
        map.dragging.enable();
        
        const updatedCoords = [...coordinates];
        markersRef.current.forEach((marker, markerIndex) => {
          if (!marker) return;
          const validCoord = validCoords[markerIndex];
          if (!validCoord) return;
          const fullIndex = coordinates.findIndex(c => c.borne === validCoord.borne);
          if (fullIndex === -1) return;
          const newPos = marker.getLatLng();
          updatedCoords[fullIndex] = {
            ...updatedCoords[fullIndex],
            lat: newPos.lat.toFixed(6),
            lng: newPos.lng.toFixed(6)
          };
        });
        
        onCoordinatesUpdate(updatedCoords);
        updateParcelSidesFromCoordinates(updatedCoords);
      };
      
      map.on('mousedown', onMouseDown);
      map.on('mousemove', onMouseMove);
      map.on('mouseup', onMouseUp);
      
      return () => {
        map.off('mousedown', onMouseDown);
        map.off('mousemove', onMouseMove);
        map.off('mouseup', onMouseUp);
        mapContainer.style.cursor = '';
        map.dragging.enable();
        
        if (mapConfig.enableDragging !== false) {
          markersRef.current.forEach(marker => {
            if (marker && marker.dragging) marker.dragging.enable();
          });
        }
      };
    } else if (!isGroupDragMode) {
      mapContainer.style.cursor = '';
      if (mapConfig.enableDragging !== false && markersRef.current.length > 0) {
        markersRef.current.forEach(marker => {
          if (marker && marker.dragging) marker.dragging.enable();
        });
      }
    }
  }, [isGroupDragMode, isMapReady, mapConfig.enableDragging, coordinates, validCoords, onCoordinatesUpdate, updateParcelSidesFromCoordinates]);

  // Calculer les limites géographiques
  const calculateBounds = (coords: [number, number][]) => {
    const lats = coords.map(c => c[0]);
    const lngs = coords.map(c => c[1]);
    return {
      minLat: Math.min(...lats) - 0.005,
      maxLat: Math.max(...lats) + 0.005,
      minLng: Math.min(...lngs) - 0.005,
      maxLng: Math.max(...lngs) + 0.005
    };
  };

  // Vérifier chevauchement polygones
  const checkPolygonOverlap = (
    poly1: [number, number][], 
    poly2: [number, number][]
  ): { hasOverlap: boolean; area?: number } => {
    const hasPointInside = poly1.some(point => isPointInPolygon(point, poly2)) ||
                           poly2.some(point => isPointInPolygon(point, poly1));

    if (!hasPointInside) return { hasOverlap: false };

    const overlapPoints = poly1.filter(point => isPointInPolygon(point, poly2));
    if (overlapPoints.length > 2) {
      const area = calculatePolygonArea(overlapPoints);
      return { hasOverlap: true, area };
    }

    return { hasOverlap: true };
  };

  // Point dans polygone
  const isPointInPolygon = (point: [number, number], polygon: [number, number][]): boolean => {
    let inside = false;
    const [x, y] = point;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  };

  // Calculer surface polygone
  const calculatePolygonArea = (coords: [number, number][]): number => {
    if (coords.length < 3) return 0;
    
    let area = 0;
    const toRad = Math.PI / 180;
    const R = 6371000;
    
    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length;
      const lat1 = coords[i][0] * toRad;
      const lat2 = coords[j][0] * toRad;
      const lng1 = coords[i][1] * toRad;
      const lng2 = coords[j][1] * toRad;
      
      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    
    area = Math.abs(area * R * R / 2);
    return Math.round(area * 100) / 100;
  };

  // Redimensionner un côté de la parcelle en déplaçant la borne de fin
  const resizeSide = useCallback((sideIndex: number, newLengthMeters: number) => {
    if (validCoords.length < 2 || sideIndex < 0 || sideIndex >= validCoords.length) return;
    
    const nextIndex = (sideIndex + 1) % validCoords.length;
    const startCoord = validCoords[sideIndex];
    const endCoord = validCoords[nextIndex];
    
    const lat1 = parseFloat(startCoord.lat);
    const lng1 = parseFloat(startCoord.lng);
    const lat2 = parseFloat(endCoord.lat);
    const lng2 = parseFloat(endCoord.lng);
    
    if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) return;
    
    const currentLength = calculateDistance(lat1, lng1, lat2, lng2);
    if (currentLength === 0) return;
    
    const ratio = newLengthMeters / currentLength;
    
    // Calculer la nouvelle position de la borne de fin
    const metersPerDegLat = 111320;
    const metersPerDegLng = 111320 * Math.cos((lat1 * Math.PI) / 180);
    
    const dx = (lng2 - lng1) * metersPerDegLng;
    const dy = (lat2 - lat1) * metersPerDegLat;
    
    const newDx = dx * ratio;
    const newDy = dy * ratio;
    
    const newLat = lat1 + newDy / metersPerDegLat;
    const newLng = lng1 + newDx / metersPerDegLng;
    
    // Mettre à jour les coordonnées
    const endBorne = validCoords[nextIndex].borne;
    const coordIndex = coordinates.findIndex(c => c.borne === endBorne);
    if (coordIndex === -1) return;
    
    const updated = [...coordinates];
    updated[coordIndex] = {
      ...updated[coordIndex],
      lat: newLat.toFixed(6),
      lng: newLng.toFixed(6),
    };
    
    onCoordinatesUpdate(updated);
    updateParcelSidesFromCoordinates(updated);
  }, [validCoords, coordinates, onCoordinatesUpdate, updateParcelSidesFromCoordinates]);

  // Confirmer l'édition d'une dimension
  const confirmDimensionEdit = useCallback(() => {
    if (editingSideIndex === null) return;
    const newLength = parseFloat(editingSideValue);
    if (isNaN(newLength) || newLength <= 0) {
      setEditingSideIndex(null);
      setEditingSideValue('');
      return;
    }
    resizeSide(editingSideIndex, newLength);
    setEditingSideIndex(null);
    setEditingSideValue('');
  }, [editingSideIndex, editingSideValue, resizeSide]);

  // Afficher dimensions des côtés (interactives : double-clic / appui prolongé pour éditer)
  const displaySideDimensions = (L: any, map: any, coords: [number, number][]) => {
    coords.forEach((coord, index) => {
      const nextIndex = (index + 1) % coords.length;
      const nextCoord = coords[nextIndex];
      
      const midLat = (coord[0] + nextCoord[0]) / 2;
      const midLng = (coord[1] + nextCoord[1]) / 2;
      
      const storedSide = parcelSides[index];
      const displayDistance = storedSide?.length 
        ? parseFloat(storedSide.length) 
        : calculateDistance(coord[0], coord[1], nextCoord[0], nextCoord[1]);
      
      const label = L.divIcon({
        className: 'dimension-label',
        html: `<div data-side-index="${index}" style="
          background: rgba(255,255,255,0.95);
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 1px 4px rgba(0,0,0,0.25);
          border: 1.5px solid hsl(var(--primary) / 0.3);
          cursor: pointer;
          user-select: none;
          transition: all 0.15s ease;
        ">${displayDistance.toFixed(1)}m ✏️</div>`,
        iconSize: [60, 20],
        iconAnchor: [30, 10]
      });
      
      const marker = L.marker([midLat, midLng], { icon: label, interactive: true }).addTo(map);
      
      // Double-clic pour éditer (desktop)
      marker.on('dblclick', (e: any) => {
        e.originalEvent?.stopPropagation();
        e.originalEvent?.preventDefault();
        setEditingSideIndex(index);
        setEditingSideValue(displayDistance.toFixed(1));
      });
      
      // Appui prolongé pour éditer (mobile)
      let longPressTimer: number | null = null;
      marker.on('mousedown touchstart', () => {
        longPressTimer = window.setTimeout(() => {
          setEditingSideIndex(index);
          setEditingSideValue(displayDistance.toFixed(1));
        }, 500);
      });
      marker.on('mouseup touchend mouseout', () => {
        if (longPressTimer) {
          window.clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      });
      
      dimensionLayersRef.current.push(marker);
    });
  };

  // Mise à jour de roadSide
  const handleRoadSideUpdate = useCallback((sideIndex: number, updates: Partial<RoadSideInfo>) => {
    if (!onRoadSidesChange) return;
    const updatedSides = roadSides.map(side => 
      side.sideIndex === sideIndex ? { ...side, ...updates } : side
    );
    onRoadSidesChange(updatedSides);
  }, [roadSides, onRoadSidesChange]);

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

  // Toggle mode ajout construction
  const startAddingBuilding = useCallback((shapeType: BuildingShape['type']) => {
    setSelectedShapeType(shapeType);
    setIsAddingBuilding(true);
    setShowShapePicker(false);
    const map = mapInstanceRef.current;
    if (map) {
      map.getContainer().dataset.addingBuilding = 'true';
      map.getContainer().style.cursor = 'crosshair';
    }
  }, []);

  // Supprimer dernière construction
  const removeLastBuilding = useCallback(() => {
    if (buildingShapes.length === 0 || !onBuildingShapesChange) return;
    onBuildingShapesChange(buildingShapes.slice(0, -1));
  }, [buildingShapes, onBuildingShapesChange]);

  const exitMarkerMoveMode = useCallback(() => {
    selectedBorneRef.current = null;
    selectedMarkerRef.current = null;
    setSelectedBorne(null);

    const map = mapInstanceRef.current;
    if (!map) return;

    const container = map.getContainer();
    container.dataset.markerMoving = 'false';

    // Restaurer les interactions selon le mode courant
    if (isDrawingMode) {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.touchZoom.disable();
      container.dataset.drawingMode = 'true';
      container.style.cursor = 'crosshair';
      return;
    }

    map.dragging.enable();
    map.scrollWheelZoom.enable();
    map.doubleClickZoom.enable();
    map.touchZoom.enable();
    container.style.cursor = isAddingBuilding ? 'crosshair' : 'grab';
  }, [isDrawingMode, isAddingBuilding]);

  const nudgeSelectedMarker = useCallback((direction: 'N' | 'S' | 'E' | 'W') => {
    const borne = selectedBorneRef.current;
    if (!borne) return;

    const index = coordinates.findIndex(c => c.borne === borne);
    if (index === -1) return;

    const lat = parseFloat(coordinates[index].lat);
    const lng = parseFloat(coordinates[index].lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    const meters = moveStepMeters;
    const deltaLat = meters / 111320;
    const deltaLng = meters / (111320 * Math.cos((lat * Math.PI) / 180));

    let newLat = lat;
    let newLng = lng;

    if (direction === 'N') newLat += deltaLat;
    if (direction === 'S') newLat -= deltaLat;
    if (direction === 'E') newLng += deltaLng;
    if (direction === 'W') newLng -= deltaLng;

    const updated = [...coordinates];
    updated[index] = {
      ...updated[index],
      lat: newLat.toFixed(6),
      lng: newLng.toFixed(6),
    };

    onCoordinatesUpdate(updated);
    updateParcelSidesFromCoordinates(updated);
  }, [coordinates, moveStepMeters, onCoordinatesUpdate, updateParcelSidesFromCoordinates]);

  // Déplacer toute la parcelle (toutes les bornes ensemble)
  // IMPORTANT: ne pas recalculer les longueurs ici (les dimensions doivent rester stables)
  const nudgeEntireParcel = useCallback((direction: 'N' | 'S' | 'E' | 'W') => {
    const currentValid = validCoordsRef.current;
    if (currentValid.length < 2) return;

    const currentCoords = coordinatesRef.current;
    const centerLat =
      currentValid.reduce((sum, c) => sum + parseFloat(c.lat), 0) / currentValid.length;

    const meters = moveStepMetersRef.current;
    const deltaLat = Number((meters / 111320).toFixed(6));
    const deltaLng = Number(
      (meters / (111320 * Math.cos((centerLat * Math.PI) / 180))).toFixed(6)
    );

    const updated = currentCoords.map((coord) => {
      const lat = parseFloat(coord.lat);
      const lng = parseFloat(coord.lng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return coord;

      let newLat = lat;
      let newLng = lng;

      if (direction === 'N') newLat += deltaLat;
      if (direction === 'S') newLat -= deltaLat;
      if (direction === 'E') newLng += deltaLng;
      if (direction === 'W') newLng -= deltaLng;

      return {
        ...coord,
        lat: newLat.toFixed(6),
        lng: newLng.toFixed(6),
      };
    });

    onCoordinatesUpdate(updated);
  }, [onCoordinatesUpdate]);

  // Rotation de la parcelle autour de son centre (visuelle uniquement)
  // Les orientations des côtés restent fixes car elles représentent des directions géographiques réelles
  const rotateParcel = useCallback((angleDegrees: number) => {
    const currentValid = validCoordsRef.current;
    if (currentValid.length < 2) return;

    const currentCoords = coordinatesRef.current;

    // Centre (en degrés)
    const centerLat =
      currentValid.reduce((sum, c) => sum + parseFloat(c.lat), 0) / currentValid.length;
    const centerLng =
      currentValid.reduce((sum, c) => sum + parseFloat(c.lng), 0) / currentValid.length;

    const angleRad = (angleDegrees * Math.PI) / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);

    // Conversion locale degrés <-> mètres (approx)
    const metersPerDegLat = 111320;
    const metersPerDegLng = 111320 * Math.cos((centerLat * Math.PI) / 180);

    const updated = currentCoords.map((coord) => {
      const lat = parseFloat(coord.lat);
      const lng = parseFloat(coord.lng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return coord;

      const x = (lng - centerLng) * metersPerDegLng;
      const y = (lat - centerLat) * metersPerDegLat;

      const newX = x * cosA - y * sinA;
      const newY = x * sinA + y * cosA;

      const newLat = centerLat + newY / metersPerDegLat;
      const newLng = centerLng + newX / metersPerDegLng;

      return {
        ...coord,
        lat: newLat.toFixed(6),
        lng: newLng.toFixed(6),
      };
    });

    setParcelRotationDegrees((prev) => (prev + angleDegrees) % 360);
    onCoordinatesUpdate(updated);
    // Pas de recalcul des orientations - elles représentent des directions fixes
  }, [onCoordinatesUpdate]);

  // Retour haptique (vibration légère)
  const triggerHaptic = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate(8);
    }
  }, []);

  // Fonctions pour appui prolongé sur les boutons de contrôle
  const startLongPress = useCallback((action: () => void) => {
    // Toujours repartir d'un état propre
    if (controlButtonTimeoutRef.current) {
      clearTimeout(controlButtonTimeoutRef.current);
      controlButtonTimeoutRef.current = null;
    }
    if (controlButtonIntervalRef.current) {
      clearInterval(controlButtonIntervalRef.current);
      controlButtonIntervalRef.current = null;
    }

    // Exécuter immédiatement au premier appui avec haptic
    action();
    triggerHaptic();

    // Puis répéter rapidement tant que l'utilisateur maintient
    controlButtonTimeoutRef.current = window.setTimeout(() => {
      controlButtonIntervalRef.current = window.setInterval(() => {
        action();
        triggerHaptic();
      }, 50); // 50ms pour une répétition plus rapide
    }, 150); // 150ms avant de commencer la répétition
  }, [triggerHaptic]);

  const stopLongPress = useCallback(() => {
    if (controlButtonTimeoutRef.current) {
      clearTimeout(controlButtonTimeoutRef.current);
      controlButtonTimeoutRef.current = null;
    }
    if (controlButtonIntervalRef.current) {
      clearInterval(controlButtonIntervalRef.current);
      controlButtonIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    const onWindowStop = () => stopLongPress();
    window.addEventListener('pointerup', onWindowStop);
    window.addEventListener('blur', onWindowStop);

    return () => {
      window.removeEventListener('pointerup', onWindowStop);
      window.removeEventListener('blur', onWindowStop);
      stopLongPress();
    };
  }, [stopLongPress]);

  const getLongPressProps = useCallback(
    (action: () => void) => ({
      onPointerDown: (e: any) => {
        e.preventDefault?.();
        e.stopPropagation?.();
        try {
          e.currentTarget?.setPointerCapture?.(e.pointerId);
        } catch {}
        startLongPress(action);
      },
      onPointerUp: (e: any) => {
        e.preventDefault?.();
        e.stopPropagation?.();
        stopLongPress();
      },
      onPointerCancel: () => stopLongPress(),
      onPointerLeave: () => stopLongPress(),
      onContextMenu: (e: any) => e.preventDefault?.(),
    }),
    [startLongPress, stopLongPress]
  );

  return (
    <div className="space-y-3 max-w-[360px] mx-auto">
      {/* En-tête avec stats */}
      <Card className="p-3 bg-card border-border/50 rounded-2xl shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Croquis parcelle</p>
              <p className="text-xs text-muted-foreground">Tracez les contours</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {validCoords.length > 0 && (
              <Badge variant="outline" className="text-xs h-6 px-2 rounded-xl">
                {validCoords.length} pts
              </Badge>
            )}
            {surfaceArea > 0 && (
              <Badge className="text-xs h-6 px-2 rounded-xl bg-primary/15 text-primary border-0">
                {surfaceArea.toLocaleString()} m²
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Carte avec contrôles intégrés */}
      <Card className={`overflow-hidden relative rounded-2xl shadow-lg transition-all ${
        isDrawingMode 
          ? 'border-2 border-orange-400/60 ring-4 ring-orange-500/15' 
          : isAddingBuilding
            ? 'border-2 border-red-400/60 ring-4 ring-red-500/15'
            : showParcelControls
              ? 'border-2 border-blue-400/60 ring-4 ring-blue-500/15'
              : 'border-2 border-primary/25'
      }`}>
        <div 
          ref={mapRef} 
          className="h-[340px] w-full"
          style={{ cursor: isDrawingMode || isAddingBuilding ? 'crosshair' : 'grab' }}
        />
        
        {/* Overlay d'édition de dimension */}
        {editingSideIndex !== null && (
          <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-black/30 rounded-2xl">
            <div className="bg-card rounded-xl p-4 shadow-2xl border border-border/50 w-56 space-y-3">
              <p className="text-xs font-semibold text-foreground text-center">
                Modifier Côté {editingSideIndex + 1}
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={editingSideValue}
                  onChange={(e) => setEditingSideValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmDimensionEdit();
                    if (e.key === 'Escape') { setEditingSideIndex(null); setEditingSideValue(''); }
                  }}
                  autoFocus
                  className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <span className="text-sm font-medium text-muted-foreground">m</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 rounded-lg text-xs"
                  onClick={() => { setEditingSideIndex(null); setEditingSideValue(''); }}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 h-8 rounded-lg text-xs"
                  onClick={confirmDimensionEdit}
                >
                  Appliquer
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Boutons Tracer/Terminer + Superficie/Périmètre sur la carte (en haut à gauche) */}
        {enableDrawingMode && (
          <div className="absolute top-2 left-2 z-[1000] flex items-center gap-1.5">
            <Button 
              type="button"
              size="sm" 
              onClick={() => toggleDrawingMode(!isDrawingMode)}
              className={`h-8 rounded-xl gap-1 px-3 text-xs shadow-md ${
                isDrawingMode 
                  ? 'bg-orange-500 text-white hover:bg-orange-600' 
                  : 'bg-white/95 text-foreground hover:bg-white border border-border/50'
              }`}
            >
              {isDrawingMode ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              {isDrawingMode ? 'Terminer' : 'Tracer'}
            </Button>
            
            {/* Superficie et Périmètre - affichés sur la même ligne avec le même style que les dimensions */}
            {surfaceArea > 0 && !isDrawingMode && (
              <div 
                className="flex items-center gap-1.5"
                style={{
                  fontFamily: 'inherit',
                  fontSize: '10px',
                  fontWeight: 600,
                }}
              >
                <span 
                  className="px-1.5 py-0.5 rounded shadow-sm"
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    border: '1px solid rgba(0,0,0,0.1)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {surfaceArea.toLocaleString()} m²
                </span>
                {perimeterLength > 0 && (
                  <span 
                    className="px-1.5 py-0.5 rounded shadow-sm"
                    style={{
                      background: 'rgba(255,255,255,0.95)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      border: '1px solid rgba(0,0,0,0.1)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    P: {perimeterLength.toLocaleString()} m
                  </span>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Indicateur Nord / Boussole + Boutons suppression - coin inférieur gauche */}
        <div className="absolute bottom-10 left-2 z-[1000] flex flex-col items-center gap-1.5">
          {/* Boussole avec indicateur Nord */}
          <div 
            className="relative w-10 h-10 bg-white/95 dark:bg-card/95 backdrop-blur-sm rounded-full shadow-lg border border-border/50 flex items-center justify-center"
            style={{ transform: `rotate(${-mapBearing}deg)` }}
          >
            {/* Flèche Nord */}
            <div className="absolute top-0.5 left-1/2 -translate-x-1/2">
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-red-500" />
            </div>
            {/* Indicateur N */}
            <span className="absolute top-2 text-[7px] font-bold text-red-500">N</span>
            {/* Indicateur S */}
            <span className="absolute bottom-1 text-[6px] font-medium text-muted-foreground">S</span>
            {/* Indicateur E */}
            <span className="absolute right-1 text-[6px] font-medium text-muted-foreground">E</span>
            {/* Indicateur O */}
            <span className="absolute left-1 text-[6px] font-medium text-muted-foreground">O</span>
            {/* Centre */}
            <div className="w-1.5 h-1.5 rounded-full bg-primary/30" />
          </div>
          
          {/* Bouton calibrer orientation */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 w-10 p-0 rounded-xl bg-white/95 hover:bg-blue-50 shadow-md border-border/50"
                title="Calibrer l'orientation de la carte"
              >
                <Compass className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="right" 
              align="end" 
              className="w-56 p-3 rounded-xl shadow-lg bg-background border"
              sideOffset={5}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Compass className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Orientation carte</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ajustez l'orientation de la carte pour qu'elle corresponde à l'orientation réelle du terrain.
                </p>
                
                {/* Contrôles de rotation de la carte */}
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newBearing = (mapBearing - 15 + 360) % 360;
                      setMapBearing(newBearing);
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.setBearing?.(newBearing);
                      }
                    }}
                    className="h-8 w-8 p-0 rounded-lg"
                    title="-15°"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex-1 text-center">
                    <span className="text-sm font-medium">{mapBearing.toFixed(0)}°</span>
                  </div>
                  
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newBearing = (mapBearing + 15) % 360;
                      setMapBearing(newBearing);
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.setBearing?.(newBearing);
                      }
                    }}
                    className="h-8 w-8 p-0 rounded-lg"
                    title="+15°"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Bouton recalibrer au Nord */}
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  onClick={() => {
                    setMapBearing(0);
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.setBearing?.(0);
                    }
                  }}
                  className="w-full h-8 rounded-lg text-xs"
                >
                  <Navigation className="h-3 w-3 mr-1" />
                  Recalibrer au Nord
                </Button>
                
                <p className="text-[10px] text-muted-foreground text-center">
                  Le Nord (N) est indiqué par la flèche rouge sur la boussole
                </p>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Boutons de suppression */}
          {enableDrawingMode && validCoords.length > 0 && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={removeLastMarker}
                className="h-8 w-10 p-0 rounded-xl bg-white/95 hover:bg-destructive/10 hover:text-destructive shadow-md border-border/50"
                title="Supprimer dernière borne"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowClearAllDialog(true)}
                className="h-8 w-10 p-0 rounded-xl bg-white/95 hover:bg-destructive/10 hover:text-destructive shadow-md border-border/50"
                title="Supprimer toutes les bornes"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        
        {/* Boutons de contrôle sur la carte (à droite) */}
        <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-1.5">
          {/* Bouton vérification voisins */}
          {isParcelComplete && (
            <Button
              type="button"
              size="sm"
              variant={showNeighbors ? "default" : "outline"}
              onClick={showNeighbors ? hideNeighborParcels : checkNeighborParcels}
              disabled={loadingConflicts}
              className={`h-8 w-8 p-0 rounded-xl shadow-md ${
                showNeighbors ? 'bg-indigo-500 text-white' : 'bg-white hover:bg-gray-50'
              }`}
              title={showNeighbors ? 'Masquer voisins' : 'Voir parcelles voisines'}
            >
              <Eye className={`h-4 w-4 ${loadingConflicts ? 'animate-pulse' : ''}`} />
            </Button>
          )}
          
          {/* Bouton ajout construction */}
          {isParcelComplete && onBuildingShapesChange && (
            <Popover open={showShapePicker} onOpenChange={setShowShapePicker}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant={isAddingBuilding ? "default" : "outline"}
                  className={`h-8 w-8 p-0 rounded-xl shadow-md ${
                    isAddingBuilding ? 'bg-red-500 text-white' : 'bg-white hover:bg-gray-50'
                  }`}
                  title="Ajouter une construction"
                >
                  <Building2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                side="left" 
                align="start" 
                className="w-48 p-2 rounded-xl shadow-lg z-[1001]"
              >
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground px-2 py-1">
                    Forme de construction
                  </p>
                  {SHAPE_OPTIONS.map((option) => (
                    <Button
                      key={option.type}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => startAddingBuilding(option.type)}
                      className="w-full justify-start gap-2 h-8 rounded-lg text-sm"
                    >
                      <option.icon className="h-4 w-4 text-red-500" />
                      {option.label}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        
        {/* Mode Dessin indicateur */}
        {isDrawingMode && (
          <div className="absolute bottom-10 left-2 z-[1000]">
            <Badge className="bg-orange-500/90 text-white text-[10px] h-5 px-2 rounded-lg shadow-md">
              Touchez pour ajouter
            </Badge>
          </div>
        )}
        
        {isAddingBuilding && !isDrawingMode && (
          <div className="absolute bottom-10 left-2 z-[1000]">
            <Badge className="bg-red-500 text-white text-xs h-6 px-2 rounded-lg shadow-md animate-pulse">
              <Building2 className="h-3 w-3 mr-1" />
              {SHAPE_OPTIONS.find(s => s.type === selectedShapeType)?.label}
            </Badge>
          </div>
        )}
        
        {showNeighbors && !isDrawingMode && !isAddingBuilding && (
          <div className="absolute bottom-10 left-2 z-[1000]">
            <Badge className="bg-indigo-500 text-white text-xs h-6 px-2 rounded-lg shadow-md">
              <Eye className="h-3 w-3 mr-1" />
              Voisins
            </Badge>
          </div>
        )}
        
        {/* Panneau de contrôle parcelle compact (déplacement + rotation) - aligné avec zoom, au-dessus de l'attribution - taille réduite sur desktop */}
        {!isDrawingMode && !selectedBorne && validCoords.length >= 3 && (
          <div className="absolute bottom-8 right-14 z-[1000] md:scale-[0.65] md:origin-bottom-right">
            <div className="flex flex-col items-end gap-0.5">
              {/* Indicateurs compacts */}
              <div className="flex items-center gap-1 bg-white/90 dark:bg-card/90 backdrop-blur-sm rounded-lg px-1 py-0.5 shadow-sm border border-blue-400/30">
                <span className="text-[8px] text-blue-600 dark:text-blue-400 font-medium">{moveStepMeters.toFixed(1)}m</span>
                <span className="text-[8px] text-muted-foreground">|</span>
                <span className="text-[8px] text-blue-600 dark:text-blue-400 font-medium">{parcelRotationDegrees.toFixed(0)}°</span>
              </div>
              
              {/* Contrôles compacts en ligne */}
              <div className="flex items-center gap-0.5 bg-white/95 dark:bg-card/95 backdrop-blur-sm rounded-lg p-0.5 shadow-md border border-blue-400/30">
                {/* Flèches directionnelles */}
                <div className="flex flex-col gap-0.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    {...getLongPressProps(() => nudgeEntireParcel('N'))}
                    className="h-6 w-6 p-0 rounded-md border-0 bg-transparent hover:bg-blue-100 dark:hover:bg-blue-900/30 active:bg-blue-200 dark:active:bg-blue-800/50 touch-none select-none"
                    title="Nord (maintenir pour répéter)"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <div className="flex gap-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      {...getLongPressProps(() => nudgeEntireParcel('W'))}
                      className="h-6 w-6 p-0 rounded-md border-0 bg-transparent hover:bg-blue-100 dark:hover:bg-blue-900/30 active:bg-blue-200 dark:active:bg-blue-800/50 touch-none select-none"
                      title="Ouest (maintenir pour répéter)"
                    >
                      <ArrowLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      {...getLongPressProps(() => nudgeEntireParcel('E'))}
                      className="h-6 w-6 p-0 rounded-md border-0 bg-transparent hover:bg-blue-100 dark:hover:bg-blue-900/30 active:bg-blue-200 dark:active:bg-blue-800/50 touch-none select-none"
                      title="Est (maintenir pour répéter)"
                    >
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    {...getLongPressProps(() => nudgeEntireParcel('S'))}
                    className="h-6 w-6 p-0 rounded-md border-0 bg-transparent hover:bg-blue-100 dark:hover:bg-blue-900/30 active:bg-blue-200 dark:active:bg-blue-800/50 touch-none select-none"
                    title="Sud (maintenir pour répéter)"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>
                
                {/* Séparateur fin */}
                <div className="w-px h-10 bg-border/50 mx-0.5" />
                
                {/* Rotation */}
                <div className="flex flex-col gap-0.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    {...getLongPressProps(() => rotateParcel(-1))}
                    className="h-6 w-6 p-0 rounded-md border-0 bg-transparent hover:bg-blue-100 dark:hover:bg-blue-900/30 active:bg-blue-200 dark:active:bg-blue-800/50 touch-none select-none"
                    title="-1° (maintenir pour répéter)"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    {...getLongPressProps(() => rotateParcel(1))}
                    className="h-6 w-6 p-0 rounded-md border-0 bg-transparent hover:bg-blue-100 dark:hover:bg-blue-900/30 active:bg-blue-200 dark:active:bg-blue-800/50 touch-none select-none"
                    title="+1° (maintenir pour répéter)"
                  >
                    <RotateCw className="h-3 w-3" />
                  </Button>
                </div>
                
              </div>
            </div>
          </div>
        )}
        
        {/* Panel de déplacement précis de borne */}
        {selectedBorne && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[1000]">
            <Card className="p-2 rounded-2xl shadow-lg bg-white/95 dark:bg-card/95 backdrop-blur-sm border-primary/30">
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs h-5 px-2 rounded-lg bg-primary/10 border-primary/30">
                    Borne {selectedBorne}
                  </Badge>
                  <Badge variant="outline" className="text-xs h-5 px-1.5 rounded-lg text-muted-foreground">
                    {moveStepMeters.toFixed(1)}m/mvt
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-0.5">
                  <div />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => nudgeSelectedMarker('N')}
                    className="h-8 w-8 p-0 rounded-lg"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <div />
                  
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => nudgeSelectedMarker('W')}
                    className="h-8 w-8 p-0 rounded-lg"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      selectedBorneRef.current = null;
                      selectedMarkerRef.current = null;
                      setSelectedBorne(null);
                      const map = mapInstanceRef.current;
                      if (map) {
                        const container = map.getContainer();
                        container.dataset.markerMoving = 'false';
                        map.dragging.enable();
                        map.scrollWheelZoom.enable();
                        map.doubleClickZoom.enable();
                        map.touchZoom.enable();
                      }
                    }}
                    className="h-8 w-8 p-0 rounded-lg"
                    title="Quitter mode déplacement"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => nudgeSelectedMarker('E')}
                    className="h-8 w-8 p-0 rounded-lg"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  
                  <div />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => nudgeSelectedMarker('S')}
                    className="h-8 w-8 p-0 rounded-lg"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <div />
                </div>
                
                <p className="text-[10px] text-muted-foreground">Appui long sur borne = sélection</p>
              </div>
            </Card>
          </div>
        )}
      </Card>

      {/* Alertes conflits */}
      {conflictingParcels.length > 0 && (
        <Alert variant="destructive" className="py-2 px-3 rounded-2xl shadow-sm">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">{conflictingParcels.length} conflit(s)</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConflictDialog(true)}
              className="h-7 text-xs rounded-xl px-2"
            >
              Signaler
            </Button>
          </AlertDescription>
        </Alert>
      )}


      {/* Constructions ajoutées */}
      {buildingShapes.length > 0 && (
        <Card className="p-3 bg-red-50 dark:bg-red-950/20 rounded-2xl shadow-sm border-red-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                {buildingShapes.length} construction{buildingShapes.length > 1 ? 's' : ''}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeLastBuilding}
              className="h-7 text-xs rounded-lg text-red-600 hover:bg-red-100"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Supprimer
            </Button>
          </div>
        </Card>
      )}

      {/* Info */}
      <Card className="p-2.5 rounded-xl bg-muted/30 border-border/40">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isAddingBuilding 
              ? "Touchez dans la parcelle pour placer la construction."
              : isDrawingMode 
                ? "Touchez la carte pour ajouter des bornes."
                : "Utilisez les boutons sur la carte pour les fonctions avancées."
            }
          </p>
        </div>
      </Card>

      {/* Panel fusionné Dimensions & Routes */}
      {validCoords.length >= 3 && parcelSides.length > 0 && onRoadSidesChange && mapConfig.enableRoadBorderingFeature !== false && (
        <ParcelSidesDimensionsPanel
          parcelSides={parcelSides}
          roadSides={roadSides}
          onRoadSideUpdate={handleRoadSideUpdate}
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

      {/* Dialogue de confirmation pour supprimer toutes les bornes - placé en dehors du conteneur carte avec z-index élevé */}
      <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <AlertDialogContent className="max-w-[180px] rounded-xl p-2 shadow-2xl z-[99999] bg-background border border-border">
          <AlertDialogHeader className="space-y-1">
            <div className="flex items-center gap-1.5">
              <div className="h-6 w-6 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xs font-semibold">
                Supprimer tout ?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-[10px] text-muted-foreground leading-tight">
              Supprime toutes les bornes et données associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-1 p-1.5 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-[9px] text-muted-foreground flex items-start gap-1">
              <Info className="h-2.5 w-2.5 mt-0.5 flex-shrink-0 text-primary" />
              <span>Utilisez <Trash2 className="inline h-2 w-2" /> pour une seule borne.</span>
            </p>
          </div>
          <AlertDialogFooter className="mt-1.5 gap-1 sm:gap-1">
            <AlertDialogCancel className="h-6 px-2 rounded-lg text-[10px]">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={clearAllMarkers}
              className="h-6 px-2 rounded-lg text-[10px] bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

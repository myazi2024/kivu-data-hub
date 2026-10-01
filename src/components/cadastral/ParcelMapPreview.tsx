import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { isGenericSideName } from '@/utils/parcelSideNumbering';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { AlertCircle, MapPin, AlertTriangle, Info, Move, Hand, Plus, Trash2, Target, Pencil, Check, Navigation, Eye, Building2, Layers, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, X, RotateCw, RotateCcw, Compass, Copy } from 'lucide-react';
import { BoundaryConflictDialog } from './BoundaryConflictDialog';
import { DimensionEditOverlay } from './parcel-map-preview/DimensionEditOverlay';
import { BorneCoordsEditOverlay } from './parcel-map-preview/BorneCoordsEditOverlay';
import { BuildingVertexEditOverlay } from './parcel-map-preview/BuildingVertexEditOverlay';
import { CompassControl } from './parcel-map-preview/CompassControl';
import { MarkerMovePanel } from './parcel-map-preview/MarkerMovePanel';
import { ParcelControlPanel } from './parcel-map-preview/ParcelControlPanel';
import { ClearAllDialog } from './parcel-map-preview/ClearAllDialog';
import { BuildingDeleteConfirmDialog } from './parcel-map-preview/BuildingDeleteConfirmDialog';
import { BuildingsListCard } from './parcel-map-preview/BuildingsListCard';
import { supabase } from '@/integrations/supabase/client';
import { useTestEnvironment, applyTestFilter } from '@/hooks/useTestEnvironment';
import { RoadSideInfo } from './RoadBorderingSidesPanel';
import { ParcelSidesDimensionsPanel, ServitudeInfo } from './ParcelSidesDimensionsPanel';
import { useMapConfig, MapConfig } from '@/hooks/useMapConfig';
import type { Coordinate, ConflictingParcel, ParcelSide, BuildingShape, ParcelMapPreviewProps } from './parcel-map-preview/types';
import { calculateBuildingArea, calculateDistance, calculateBounds, calculatePolygonArea, isPointInPolygon, checkPolygonOverlap } from './parcel-map-preview/geometry';
import { useParcelMarkers } from './parcel-map-preview/useParcelMarkers';
import { useBuildingLayers } from './parcel-map-preview/useBuildingLayers';


export const ParcelMapPreview = ({ 
  coordinates, 
  onCoordinatesUpdate, 
  config: propConfig,
  currentParcelNumber,
  roadSides = [],
  onRoadSidesChange,
  parcelSides = [],
  onParcelSidesUpdate,
  enableDrawingMode = true,
  onSurfaceChange,
  buildingShapes = [],
  onBuildingShapesChange,
  servitude,
  onServitudeChange,
  isTerrainNu = false,
  requiredBuildingCount = 0,
  constructionLabels = [],
  heightInputExternal = false,
}: ParcelMapPreviewProps) => {
  const { isTestRoute } = useTestEnvironment();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polygonRef = useRef<any>(null);
  const dimensionLayersRef = useRef<any[]>([]);
  /** Minuteries d'appui prolongé attachées aux marqueurs — annulées au redessin et au démontage. */
  const markerLongPressTimersRef = useRef<Set<number>>(new Set());
  const clearMarkerLongPressTimers = useCallback(() => {
    markerLongPressTimersRef.current.forEach(id => window.clearTimeout(id));
    markerLongPressTimersRef.current.clear();
  }, []);
  const conflictLayersRef = useRef<any[]>([]);
  const segmentLayersRef = useRef<any[]>([]);
  const neighborLayersRef = useRef<any[]>([]);
  const buildingLayersRef = useRef<any[]>([]);
  const buildingPolygonsRef = useRef<Map<string, any>>(new Map());
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

  // Refs pour le drag des sommets de construction
  const bvDragActiveRef = useRef(false);
  const bvDragShapeIdRef = useRef<string | null>(null);
  const bvDragVertexIdxRef = useRef<number>(-1);
  const bvDragMarkerRef = useRef<any>(null);
  const bvDragHandlersRef = useRef<{ move: (e: any) => void; touchMove: (e: any) => void } | null>(null);
  
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
  const [isDrawingBuilding, setIsDrawingBuilding] = useState(false);
  const [buildingVertices, setBuildingVertices] = useState<{ lat: number; lng: number }[]>([]);
  const buildingVerticesRef = useRef<{ lat: number; lng: number }[]>([]);
  const [selectedBuildingTarget, setSelectedBuildingTarget] = useState<number | null>(null);
  const [showBuildingTargetSelector, setShowBuildingTargetSelector] = useState(false);
  const [selectedBorne, setSelectedBorne] = useState<string | null>(null);
  const [moveStepMeters, setMoveStepMeters] = useState<number>(0.5);
  const [parcelRotationDegrees, setParcelRotationDegrees] = useState<number>(0);
  // Ref pour stocker les coordonnées originales avant rotation (prévient la dérive)
  const originalCoordsBeforeRotationRef = useRef<Coordinate[] | null>(null);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [mapBearing, setMapBearing] = useState<number>(0);
  const [editingSideIndex, setEditingSideIndex] = useState<number | null>(null);
  const [editingSideValue, setEditingSideValue] = useState<string>('');
  const dimensionLongPressRef = useRef<number | null>(null);
  const [editingBorneIndex, setEditingBorneIndex] = useState<number | null>(null);
  const [editingBorneCoords, setEditingBorneCoords] = useState<{ lat: string; lng: string }>({ lat: '', lng: '' });
  const [editingBuildingVertex, setEditingBuildingVertex] = useState<{ shapeId: string; vertexIdx: number } | null>(null);
  const [editingBuildingVertexCoords, setEditingBuildingVertexCoords] = useState<{ lat: string; lng: string }>({ lat: '', lng: '' });
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(null);
  const [pendingBuildingDeletion, setPendingBuildingDeletion] = useState<string | null>(null);

  // Signature compacte des constructions : évite les redraws inutiles pendant
  // le pan/zoom tout en garantissant un redraw à chaque changement réel.
  const buildingShapesSignature = useMemo(
    () => buildingShapes.map(s => `${s.id}:${s.linkedIndex ?? ''}:${s.heightM ?? ''}:${s.vertices.map(v => `${v.lat.toFixed(7)},${v.lng.toFixed(7)}`).join('|')}`).join(';'),
    [buildingShapes],
  );

  
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
    
    originalCoordsBeforeRotationRef.current = null; // Reset rotation baseline
    updateParcelSidesFromCoordinates(updatedCoords);
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
    
    originalCoordsBeforeRotationRef.current = null; // Reset rotation baseline
    updateParcelSidesFromCoordinates(updatedCoords);
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
    originalCoordsBeforeRotationRef.current = null;
    setParcelRotationDegrees(0);
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
      
      // Le côté i relie la borne i à la borne i+1 : l'appariement est strictement
      // positionnel. Un nom personnalisé (ex. « Côté Nord ») est conservé, un nom
      // générique est renuméroté selon la position pour rester séquentiel.
      const existingSide = parcelSides[i];

      updatedSides.push({
        name: isGenericSideName(existingSide?.name) ? `Côté ${i + 1}` : existingSide.name,
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
          roadSurface: existingSide?.roadSurface,
          hasStreetLighting: existingSide?.hasStreetLighting,
          streetLampCount: existingSide?.streetLampCount,
          hasGutter: existingSide?.hasGutter,
          gutterConnected: existingSide?.gutterConnected,
          isConfirmed: existingSide?.isConfirmed,
          borderType: existingSide?.borderType,
          hasRoad: existingSide?.hasRoad,
          hasWall: existingSide?.hasWall,
          boundaryKind: existingSide?.boundaryKind,
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

  // calculateDistance est définie en dehors du composant (fonction pure)

  // Initialiser la carte une seule fois
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) return;
    // Guard contre double-init (HMR/StrictMode) : si le container Leaflet a déjà un _leaflet_id résiduel
    if ((mapRef.current as any)._leaflet_id) {
      try { delete (mapRef.current as any)._leaflet_id; } catch {}
    }

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
        zoom: 19,
        maxZoom: 22,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxNativeZoom: 19,
        maxZoom: 22,
      }).addTo(map);

      // Contrôle de zoom personnalisé : + = zoom max, - = zoom min
      const ZoomMaxControl = L.Control.extend({
        options: { position: 'bottomright' },
        onAdd: function(map: any) {
          const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-zoom');
          
          const zoomIn = L.DomUtil.create('a', 'leaflet-control-zoom-in', container);
          zoomIn.innerHTML = '+';
          zoomIn.title = 'Zoom avant';
          zoomIn.href = '#';
          zoomIn.role = 'button';
          zoomIn.setAttribute('aria-label', 'Zoom avant');
          L.DomEvent.on(zoomIn, 'click', function(e: any) {
            L.DomEvent.preventDefault(e);
            map.setZoom(Math.min(map.getZoom() + 1, map.getMaxZoom()));
          });
          
          const zoomOut = L.DomUtil.create('a', 'leaflet-control-zoom-out', container);
          zoomOut.innerHTML = '\u2212';
          zoomOut.title = 'Zoom arrière';
          zoomOut.href = '#';
          zoomOut.role = 'button';
          zoomOut.setAttribute('aria-label', 'Zoom arrière');
          L.DomEvent.on(zoomOut, 'click', function(e: any) {
            L.DomEvent.preventDefault(e);
            map.setZoom(Math.max(map.getZoom() - 1, map.getMinZoom()));
          });
          
          L.DomEvent.disableClickPropagation(container);
          return container;
        }
      });
      new ZoomMaxControl().addTo(map);

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
            // Guard: vérifier que la carte est toujours montée et initialisée
            if (mapInstanceRef.current && (map as any)?._loaded && map.getContainer()?.isConnected) {
              try { map.setView([latitude, longitude], 18); } catch (e) { console.warn('setView skipped:', e); }
            }
            
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

    return () => {
      map.off('zoomend', computeStep);
    };
  }, [isMapReady]);

  // Synchroniser la ref des sommets de construction en cours
  useEffect(() => { buildingVerticesRef.current = buildingVertices; }, [buildingVertices]);

  // Ajouter un sommet de construction (clic sur carte en mode tracé construction)
  const addBuildingVertex = useCallback((lat: number, lng: number) => {
    if (!isParcelComplete) return;
    
    // Vérifier si le point est dans la parcelle
    // Si en dehors → ignorer silencieusement (le drag de la carte reste possible depuis l'extérieur)
    const latLngs = validCoords.map(c => [parseFloat(c.lat), parseFloat(c.lng)] as [number, number]);
    if (!isPointInPolygon([lat, lng], latLngs)) {
      return;
    }
    
    const newVertices = [...buildingVerticesRef.current, { lat, lng }];
    setBuildingVertices(newVertices);
  }, [isParcelComplete, validCoords]);

  // Mettre à jour la ref du callback building pour éviter les closures obsolètes
  useEffect(() => {
    addBuildingCallbackRef.current = addBuildingVertex;
  }, [addBuildingVertex]);

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
      let nearbyQuery = supabase
        .from('cadastral_parcels')
        .select('*')
        .neq('parcel_number', currentParcelNumber || '')
        .gte('latitude', bounds.minLat)
        .lte('latitude', bounds.maxLat)
        .gte('longitude', bounds.minLng)
        .lte('longitude', bounds.maxLng)
        .not('gps_coordinates', 'is', null);
      nearbyQuery = applyTestFilter(nearbyQuery, 'parcel_number', isTestRoute);
      const { data: nearbyParcels, error } = await nearbyQuery;

      if (error) throw error;

      const conflicts: ConflictingParcel[] = [];
      let skippedParcels = 0;

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
          skippedParcels += 1;
          console.error('Error processing parcel:', err);
        }
      });

      setConflictingParcels(conflicts);
      setShowNeighbors(true);
      if (skippedParcels > 0) {
        toast.warning(`${skippedParcels} parcelle(s) voisine(s) non analysée(s)`, {
          description: "Leurs contours sont illisibles : le contrôle de chevauchement est incomplet pour ces parcelles.",
        });
      }
    } catch (error) {
      console.error('Error checking neighbors:', error);
      toast.error("Vérification des parcelles voisines impossible", {
        description: "Le contrôle des chevauchements n'a pas abouti. Vérifiez votre connexion puis réessayez.",
      });
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
      const cancelLongPress = () => {
        if (longPressTimer) {
          window.clearTimeout(longPressTimer);
          markerLongPressTimersRef.current.delete(longPressTimer);
          longPressTimer = null;
        }
      };
      marker.on('mousedown touchstart', () => {
        cancelLongPress();
        longPressTimer = window.setTimeout(() => {
          if (longPressTimer) markerLongPressTimersRef.current.delete(longPressTimer);
          longPressTimer = null;
          setEditingSideIndex(index);
          setEditingSideValue(displayDistance.toFixed(1));
        }, 500);
        markerLongPressTimersRef.current.add(longPressTimer);
      });
      marker.on('mouseup touchend mouseout', cancelLongPress);
      
      dimensionLayersRef.current.push(marker);
    });
  };


  // Mettre à jour les marqueurs et polygone
  useParcelMarkers({
    isMapReady,
    mapInstanceRef,
    renderSeqRef,
    markersRef,
    polygonRef,
    dimensionLayersRef,
    segmentLayersRef,
    clearMarkerLongPressTimers,
    longPressTimerRef,
    selectedBorneRef,
    selectedMarkerRef,
    stableSurfaceRef,
    stablePerimeterRef,
    lastParcelSidesLengthRef,
    validCoords,
    roadSides,
    mapConfig,
    isGroupDragMode,
    isDrawingMode,
    selectedBorne,
    isDrawingBuilding,
    buildingVertices,
    coordinates,
    onCoordinatesUpdate,
    updateParcelSidesFromCoordinates,
    setSelectedBorne,
    setEditingBorneIndex,
    setEditingBorneCoords,
    onRoadSidesChange,
    parcelSides,
    setSurfaceArea,
    setPerimeterLength,
    onSurfaceChange,
    displaySideDimensions,
  });


  // Effet dédié au rendu des constructions (formes validées + tracé en cours).
  useBuildingLayers({
    isMapReady,
    mapInstanceRef,
    buildingLayersRef,
    buildingPolygonsRef,
    buildingVerticesRef,
    markerLongPressTimersRef,
    bvDragActiveRef,
    bvDragShapeIdRef,
    bvDragVertexIdxRef,
    bvDragMarkerRef,
    buildingShapes,
    buildingShapesSignature,
    buildingVertices,
    isDrawingBuilding,
    isDrawingMode,
    isGroupDragMode,
    constructionLabels,
    onBuildingShapesChange,
    setEditingBuildingVertex,
    setEditingBuildingVertexCoords,
  });


  // Surbrillance de la construction survolée dans la liste sous la carte
  useEffect(() => {
    buildingPolygonsRef.current.forEach((poly, id) => {
      try {
        poly.setStyle(
          id === hoveredBuildingId
            ? { color: '#facc15', fillColor: '#facc15', fillOpacity: 0.45, weight: 3 }
            : { color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.3, weight: 2 },
        );
      } catch {}
    });
  }, [hoveredBuildingId, buildingShapesSignature]);


  // Pendant le tracé d'une construction : forcer l'activation du drag/zoom de la carte
  // après chaque redraw, et désactiver explicitement le drag des marqueurs de bornes
  // pour qu'ils n'interceptent pas le mousedown du pan.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isDrawingBuilding) return;
    try {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
    } catch {}
    markersRef.current.forEach((m: any) => {
      try { m.dragging?.disable(); } catch {}
    });
  }, [isDrawingBuilding, isMapReady, buildingVertices, validCoords]);

  // Supprimer une construction par ID (préserve les linkedIndex des autres)
  const removeBuildingById = useCallback((buildingId: string) => {
    if (!onBuildingShapesChange) return;
    const removed = buildingShapes.find(s => s.id === buildingId);
    if (!removed) return;
    const removedIdx = buildingShapes.findIndex(s => s.id === buildingId);
    const remaining = buildingShapes.filter(s => s.id !== buildingId);
    // Fermer l'éditeur de sommet s'il visait cette construction
    setEditingBuildingVertex(prev => (prev && prev.shapeId === buildingId ? null : prev));
    setHoveredBuildingId(prev => (prev === buildingId ? null : prev));
    onBuildingShapesChange(remaining);
    const label = constructionLabels[removed.linkedIndex ?? removedIdx] || 'Construction';
    toast.success(`${label} supprimée`, {
      action: {
        label: 'Annuler',
        onClick: () => {
          const restored = [...buildingShapesRef.current];
          restored.splice(Math.min(removedIdx, restored.length), 0, removed);
          onBuildingShapesChange(restored);
        },
      },
    });
  }, [buildingShapes, onBuildingShapesChange, constructionLabels]);


  // Réattribuer le linkedIndex d'une construction tracée
  const reassignBuildingLinkedIndex = useCallback((buildingId: string, newLinkedIndex: number) => {
    if (!onBuildingShapesChange) return;
    // Trouver si une autre construction a déjà ce linkedIndex → permuter
    const updated = buildingShapes.map(s => {
      if (s.id === buildingId) return { ...s, linkedIndex: newLinkedIndex };
      if (s.linkedIndex === newLinkedIndex) {
        // Permuter : donner l'ancien linkedIndex de la construction qu'on réattribue
        const oldLinkedIndex = buildingShapes.find(b => b.id === buildingId)?.linkedIndex;
        return { ...s, linkedIndex: oldLinkedIndex ?? s.linkedIndex };
      }
      return s;
    });
    onBuildingShapesChange(updated);
    toast.success('Attribution mise à jour');
  }, [buildingShapes, onBuildingShapesChange]);

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

  // Toggle mode tracé construction
  const cancelDrawingBuilding = useCallback(() => {
    setIsDrawingBuilding(false);
    setBuildingVertices([]);
    setSelectedBuildingTarget(null);
    setShowBuildingTargetSelector(false);
    const map = mapInstanceRef.current;
    if (map) {
      map.getContainer().dataset.addingBuilding = 'false';
      map.getContainer().style.cursor = 'grab';
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
    }
  }, []);

  const startDrawingBuilding = useCallback(() => {
    if (isDrawingBuilding) {
      cancelDrawingBuilding();
      return;
    }

    // Déterminer les indices non encore tracés
    const usedIndices = new Set(buildingShapes.map(s => s.linkedIndex));
    const availableIndices = Array.from({ length: requiredBuildingCount }, (_, i) => i).filter(i => !usedIndices.has(i));

    if (requiredBuildingCount > 1 && availableIndices.length > 1) {
      // Afficher le sélecteur — ne pas encore démarrer le tracé
      setShowBuildingTargetSelector(true);
      return;
    }

    // Attribution automatique (1 seule cible ou 1 seule restante)
    const targetIdx = availableIndices.length === 1 ? availableIndices[0] : 0;
    setSelectedBuildingTarget(targetIdx);
    actuallyStartDrawing();
  }, [isDrawingBuilding, cancelDrawingBuilding, buildingShapes, requiredBuildingCount]);

  // Démarrer effectivement le tracé (appelé après sélection de la cible)
  const actuallyStartDrawing = useCallback(() => {
    setIsDrawingBuilding(true);
    setBuildingVertices([]);
    setShowBuildingTargetSelector(false);
    setIsDrawingMode(false);

    const map = mapInstanceRef.current;
    if (map) {
      // Garder le drag/zoom actifs : permet de recentrer la carte en cliquant-glissant
      // depuis l'extérieur de la parcelle pendant le tracé d'une construction.
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
      map.getContainer().dataset.drawingMode = 'false';
      map.getContainer().dataset.addingBuilding = 'true';
      map.getContainer().style.cursor = 'crosshair';
    }
  }, []);

  // Valider la construction en cours
  const validateBuilding = useCallback(() => {
    if (buildingVertices.length < 3 || !onBuildingShapesChange) return;
    
    const sides: { name: string; length: string }[] = [];
    let perimeter = 0;
    
    for (let i = 0; i < buildingVertices.length; i++) {
      const next = buildingVertices[(i + 1) % buildingVertices.length];
      const dist = calculateDistance(buildingVertices[i].lat, buildingVertices[i].lng, next.lat, next.lng);
      sides.push({ name: `Côté ${i + 1}`, length: dist.toFixed(2) });
      perimeter += dist;
    }
    
    const areaSqm = calculateBuildingArea(buildingVertices);
    const targetIdx = selectedBuildingTarget ?? buildingShapes.length;
    
    const newShape: BuildingShape = {
      id: `building-${Date.now()}`,
      vertices: [...buildingVertices],
      sides,
      areaSqm: Math.round(areaSqm * 100) / 100,
      perimeterM: Math.round(perimeter * 100) / 100,
      linkedIndex: targetIdx,
    };
    
    const label = constructionLabels[targetIdx] || `Construction ${targetIdx + 1}`;
    onBuildingShapesChange([...buildingShapes, newShape]);
    cancelDrawingBuilding();
    toast.success(`${label} ajoutée: ${newShape.areaSqm} m², ${newShape.perimeterM} m de périmètre`);
  }, [buildingVertices, buildingShapes, onBuildingShapesChange, cancelDrawingBuilding, constructionLabels, selectedBuildingTarget]);

  // Calquer la construction sur l'emprise exacte de la parcelle
  const traceBuildingFromParcel = useCallback(() => {
    if (!onBuildingShapesChange) return;
    const verts = validCoords.map(c => ({ lat: parseFloat(c.lat), lng: parseFloat(c.lng) }));
    if (verts.length < 3) return;

    const sides: { name: string; length: string }[] = [];
    let perimeter = 0;
    for (let i = 0; i < verts.length; i++) {
      const next = verts[(i + 1) % verts.length];
      const dist = calculateDistance(verts[i].lat, verts[i].lng, next.lat, next.lng);
      sides.push({ name: `Côté ${i + 1}`, length: dist.toFixed(2) });
      perimeter += dist;
    }

    const areaSqm = calculateBuildingArea(verts);
    const targetIdx = selectedBuildingTarget ?? buildingShapes.length;

    const newShape: BuildingShape = {
      id: `building-${Date.now()}`,
      vertices: verts,
      sides,
      areaSqm: Math.round(areaSqm * 100) / 100,
      perimeterM: Math.round(perimeter * 100) / 100,
      linkedIndex: targetIdx,
    };

    const label = constructionLabels[targetIdx] || `Construction ${targetIdx + 1}`;
    onBuildingShapesChange([...buildingShapes, newShape]);
    cancelDrawingBuilding();
    toast.success(`${label} calquée sur la parcelle: ${newShape.areaSqm} m², ${newShape.perimeterM} m de périmètre`);
  }, [validCoords, buildingShapes, onBuildingShapesChange, cancelDrawingBuilding, constructionLabels, selectedBuildingTarget]);

  // Supprimer le dernier sommet en cours de tracé

  const removeLastBuildingVertex = useCallback(() => {
    setBuildingVertices(prev => prev.slice(0, -1));
  }, []);


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

    if (isDrawingBuilding) {
      // Garder drag/zoom actifs pour permettre le recentrage hors-parcelle
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
      container.dataset.addingBuilding = 'true';
      container.style.cursor = 'crosshair';
      return;
    }

    map.dragging.enable();
    map.scrollWheelZoom.enable();
    map.doubleClickZoom.enable();
    map.touchZoom.enable();
    container.style.cursor = 'grab';
  }, [isDrawingMode, isDrawingBuilding]);

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
    const currentCoords = coordinatesRef.current;
    const currentValid = validCoordsRef.current;
    if (currentValid.length < 2) return;

    // Stocker les coordonnées originales au premier appel de rotation
    if (!originalCoordsBeforeRotationRef.current) {
      originalCoordsBeforeRotationRef.current = currentCoords.map(c => ({ ...c }));
    }

    const newTotalAngle = (parcelRotationDegrees + angleDegrees) % 360;
    const origCoords = originalCoordsBeforeRotationRef.current;

    // Calculer le centre à partir des originaux
    const origValid = origCoords.filter(
      c => c.lat && c.lng && !isNaN(parseFloat(c.lat)) && !isNaN(parseFloat(c.lng))
    );
    if (origValid.length < 2) return;

    const centerLat = origValid.reduce((sum, c) => sum + parseFloat(c.lat), 0) / origValid.length;
    const centerLng = origValid.reduce((sum, c) => sum + parseFloat(c.lng), 0) / origValid.length;

    const angleRad = (newTotalAngle * Math.PI) / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);

    const metersPerDegLat = 111320;
    const metersPerDegLng = 111320 * Math.cos((centerLat * Math.PI) / 180);

    const updated = origCoords.map((coord) => {
      const lat = parseFloat(coord.lat);
      const lng = parseFloat(coord.lng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return coord;

      const x = (lng - centerLng) * metersPerDegLng;
      const y = (lat - centerLat) * metersPerDegLat;

      const newX = x * cosA - y * sinA;
      const newY = x * sinA + y * cosA;

      return {
        ...coord,
        lat: (centerLat + newY / metersPerDegLat).toFixed(6),
        lng: (centerLng + newX / metersPerDegLng).toFixed(6),
      };
    });

    setParcelRotationDegrees(newTotalAngle);
    onCoordinatesUpdate(updated);
  }, [onCoordinatesUpdate, parcelRotationDegrees]);

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
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      clearMarkerLongPressTimers();
    };
  }, [stopLongPress, clearMarkerLongPressTimers]);

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
      // Accessibilité clavier : Entrée/Espace déclenchent la même action,
      // le maintien de touche relance la répétition comme l'appui long.
      onKeyDown: (e: any) => {
        if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
        e.preventDefault?.();
        if (e.repeat) return;
        startLongPress(action);
      },
      onKeyUp: (e: any) => {
        if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
        e.preventDefault?.();
        stopLongPress();
      },
      onBlur: () => stopLongPress(),
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
          : isDrawingBuilding
            ? 'border-2 border-red-400/60 ring-4 ring-red-500/15'
            : 'border-2 border-primary/25'
      }`}>
        <div 
          ref={mapRef} 
          className="h-[340px] w-full"
          style={{ cursor: isDrawingMode || isDrawingBuilding ? 'crosshair' : 'grab' }}
        />
        
        {/* Overlay d'édition de dimension */}
        {editingSideIndex !== null && (
          <DimensionEditOverlay
            editingSideIndex={editingSideIndex}
            editingSideValue={editingSideValue}
            onValueChange={setEditingSideValue}
            onConfirm={confirmDimensionEdit}
            onCancel={() => { setEditingSideIndex(null); setEditingSideValue(''); }}
          />
        )}

        {/* Overlay d'édition de coordonnées GPS de borne */}
        {editingBorneIndex !== null && (
          <BorneCoordsEditOverlay
            editingBorneIndex={editingBorneIndex}
            editingBorneCoords={editingBorneCoords}
            onCoordsChange={setEditingBorneCoords}
            onClose={() => setEditingBorneIndex(null)}
            onApply={() => {
              if (editingBorneIndex !== null) {
                const lat = parseFloat(editingBorneCoords.lat);
                const lng = parseFloat(editingBorneCoords.lng);
                if (!isNaN(lat) && !isNaN(lng)) {
                  const updatedCoords = [...coordinates];
                  updatedCoords[editingBorneIndex] = { ...updatedCoords[editingBorneIndex], lat: lat.toFixed(6), lng: lng.toFixed(6) };
                  onCoordinatesUpdate(updatedCoords);
                  updateParcelSidesFromCoordinates(updatedCoords);
                }
              }
              setEditingBorneIndex(null);
            }}
          />
        )}
        
        {/* Overlay d'édition GPS d'un sommet de construction */}
        {editingBuildingVertex !== null && (
          <BuildingVertexEditOverlay
            vertexLabel={String(editingBuildingVertex.vertexIdx + 1)}
            constructionLabel={constructionLabels[buildingShapes.find(s => s.id === editingBuildingVertex.shapeId)?.linkedIndex ?? 0] || 'Construction'}
            coords={editingBuildingVertexCoords}
            onCoordsChange={setEditingBuildingVertexCoords}
            onClose={() => setEditingBuildingVertex(null)}
            onApply={() => {
              if (editingBuildingVertex && onBuildingShapesChange) {
                const lat = parseFloat(editingBuildingVertexCoords.lat);
                const lng = parseFloat(editingBuildingVertexCoords.lng);
                if (!isNaN(lat) && !isNaN(lng)) {
                  const updated = buildingShapes.map(s => {
                    if (s.id !== editingBuildingVertex.shapeId) return s;
                    const newVerts = [...s.vertices];
                    newVerts[editingBuildingVertex.vertexIdx] = { lat, lng };
                    const newSides: { name: string; length: string }[] = [];
                    let newPerimeter = 0;
                    for (let i = 0; i < newVerts.length; i++) {
                      const nxt = newVerts[(i + 1) % newVerts.length];
                      const d = calculateDistance(newVerts[i].lat, newVerts[i].lng, nxt.lat, nxt.lng);
                      newSides.push({ name: `Côté ${i + 1}`, length: d.toFixed(2) });
                      newPerimeter += d;
                    }
                    return { ...s, vertices: newVerts, sides: newSides, areaSqm: Math.round(calculateBuildingArea(newVerts) * 100) / 100, perimeterM: Math.round(newPerimeter * 100) / 100 };
                  });
                  onBuildingShapesChange(updated);
                }
              }
              setEditingBuildingVertex(null);
            }}
          />
        )}

        {/* Boutons Tracer/Terminer + Superficie/Périmètre sur la carte (en haut à gauche) */}
        {enableDrawingMode && !isDrawingBuilding && (
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
        {!isDrawingBuilding && (
        <div className="absolute bottom-10 left-2 z-[1000] flex flex-col items-center gap-1.5">
          <CompassControl mapBearing={mapBearing} onBearingChange={setMapBearing} />
          
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
        )}
        
        {/* Boutons de contrôle sur la carte (à droite) */}
        <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-1.5">
          {/* Bouton vérification voisins */}
          {isParcelComplete && !isDrawingBuilding && (
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
          {isParcelComplete && onBuildingShapesChange && (() => {
            const isBuildingDisabled = isTerrainNu || (!isDrawingBuilding && requiredBuildingCount > 0 && buildingShapes.length >= requiredBuildingCount);
            const tooltipText = isTerrainNu
              ? "La catégorie de bien sélectionnée est « Terrain nu ». L'ajout de constructions n'est pas disponible pour cette catégorie. Pour modifier ce choix, rendez-vous dans l'onglet Infos, bloc Construction."
              : (!isDrawingBuilding && requiredBuildingCount > 0 && buildingShapes.length >= requiredBuildingCount)
                ? `Toutes les constructions déclarées ont été tracées (${buildingShapes.length}/${requiredBuildingCount}).`
                : '';
            
            const btn = (
              <Button
                type="button"
                size="sm"
                variant={isDrawingBuilding ? "default" : "outline"}
                onClick={isBuildingDisabled ? undefined : startDrawingBuilding}
                disabled={isBuildingDisabled}
                className={`h-8 w-8 p-0 rounded-xl shadow-md ${
                  isDrawingBuilding ? 'bg-red-500 text-white' : isBuildingDisabled ? 'opacity-50 cursor-not-allowed bg-white' : 'bg-white hover:bg-gray-50'
                }`}
                title={isDrawingBuilding ? "Annuler le tracé" : "Tracer une construction"}
              >
                <Building2 className="h-4 w-4" />
              </Button>
            );
            
            if (isBuildingDisabled && tooltipText) {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>{btn}</span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[260px] text-xs text-center">
                    {tooltipText}
                  </TooltipContent>
                </Tooltip>
              );
            }
            return btn;
          })()}



          
          {/* Sélecteur de construction cible */}
          {showBuildingTargetSelector && !isDrawingBuilding && (() => {
            const usedIndices = new Set(buildingShapes.map(s => s.linkedIndex));
            const availableTargets = Array.from({ length: requiredBuildingCount }, (_, i) => i).filter(i => !usedIndices.has(i));
            return (
              <div className="absolute top-12 right-2 z-[1001] bg-background border border-border rounded-xl shadow-lg p-2 min-w-[180px]">
                <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Quelle construction tracer ?</p>
                <div className="space-y-1">
                  {availableTargets.map(idx => (
                    <Button
                      key={idx}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full justify-start h-7 text-xs rounded-lg"
                      onClick={() => {
                        setSelectedBuildingTarget(idx);
                        actuallyStartDrawing();
                      }}
                    >
                      <Building2 className="h-3 w-3 mr-1.5 text-primary" />
                      {constructionLabels[idx] || `Construction ${idx + 1}`}
                    </Button>
                  ))}
                </div>
                <Button type="button" size="sm" variant="ghost" className="w-full h-6 text-[10px] mt-1" onClick={() => setShowBuildingTargetSelector(false)}>
                  Annuler
                </Button>
              </div>
            );
          })()}
        </div>

        {/* Calquer la construction sur la parcelle — bouton libellé distinct, séparé de la pile d'icônes (visible uniquement en mode tracé) */}
        {isParcelComplete && onBuildingShapesChange && isDrawingBuilding && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="sm"
                onClick={traceBuildingFromParcel}
                className="absolute top-12 right-2 z-[1000] gap-1.5 px-3 h-8 rounded-xl shadow-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
                aria-label="Calquer sur la parcelle"
              >
                <Copy className="h-4 w-4" />
                Calquer sur la parcelle
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[260px] text-xs text-center">
              Calquer sur la parcelle : trace automatiquement la construction avec les mêmes dimensions et la même forme que la parcelle.
            </TooltipContent>
          </Tooltip>
        )}

        
        {/* Mode Dessin indicateur */}
        {isDrawingMode && (
          <div className="absolute bottom-10 left-2 z-[1000]">
            <Badge className="bg-orange-500/90 text-white text-[10px] h-5 px-2 rounded-lg shadow-md">
              Touchez pour ajouter
            </Badge>
          </div>
        )}
        
        {isDrawingBuilding && !isDrawingMode && (
          <div className="absolute bottom-10 left-2 z-[1000] flex flex-col gap-1 items-start">
            <div className="flex items-center gap-1.5">
              <Badge className="bg-red-500 text-white text-xs h-6 px-2 rounded-lg shadow-md animate-pulse">
                <Building2 className="h-3 w-3 mr-1" />
                {constructionLabels[selectedBuildingTarget ?? buildingShapes.length] || `Construction ${(selectedBuildingTarget ?? buildingShapes.length) + 1}`} ({buildingVertices.length} pts)
              </Badge>
              {buildingVertices.length > 0 && (
                <Button type="button" size="sm" variant="outline" onClick={removeLastBuildingVertex} className="h-6 w-6 p-0 rounded-lg bg-white/95 shadow-md" title="Supprimer dernier point">
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
              {buildingVertices.length >= 3 && (
                <Button type="button" size="sm" onClick={validateBuilding} className="h-6 px-2 rounded-lg bg-green-600 text-white shadow-md text-xs hover:bg-green-700">
                  <Check className="h-3 w-3 mr-1" />Valider
                </Button>
              )}
              <Button type="button" size="sm" variant="outline" onClick={cancelDrawingBuilding} className="h-6 px-2 rounded-lg bg-white/95 shadow-md text-xs">
                <X className="h-3 w-3 mr-1" />Annuler
              </Button>
            </div>
            {buildingVertices.length >= 3 && (
              <Badge variant="outline" className="text-[10px] h-5 px-2 rounded-lg bg-white/90 shadow-sm border-red-200">
                ~{calculateBuildingArea(buildingVertices).toFixed(1)} m²
              </Badge>
            )}
          </div>
        )}
        
        {showNeighbors && !isDrawingMode && !isDrawingBuilding && (
          <div className="absolute bottom-10 left-2 z-[1000]">
            <Badge className="bg-indigo-500 text-white text-xs h-6 px-2 rounded-lg shadow-md">
              <Eye className="h-3 w-3 mr-1" />
              Voisins
            </Badge>
          </div>
        )}
        
        {/* Panneau de contrôle parcelle compact (déplacement + rotation) - aligné avec zoom, au-dessus de l'attribution - taille réduite sur desktop */}
        {!isDrawingMode && !isDrawingBuilding && !selectedBorne && validCoords.length >= 3 && (
          <ParcelControlPanel
            moveStepMeters={moveStepMeters}
            parcelRotationDegrees={parcelRotationDegrees}
            getLongPressProps={getLongPressProps}
            onNudgeEntireParcel={nudgeEntireParcel}
            onRotateParcel={rotateParcel}
          />
        )}
        
        {/* Panel de déplacement précis de borne — mobile uniquement */}
        {selectedBorne && (
          <MarkerMovePanel
            selectedBorne={selectedBorne}
            moveStepMeters={moveStepMeters}
            onNudge={nudgeSelectedMarker}
            onExit={exitMarkerMoveMode}
          />
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


      {/* Constructions ajoutées — liste détaillée avec suppression individuelle */}
      {!isTerrainNu && requiredBuildingCount > 0 && (
        <BuildingsListCard
          buildingShapes={buildingShapes}
          constructionLabels={constructionLabels}
          requiredBuildingCount={requiredBuildingCount}
          heightInputExternal={heightInputExternal}
          hoveredBuildingId={hoveredBuildingId}
          onHoverChange={setHoveredBuildingId}
          onReassignLinkedIndex={reassignBuildingLinkedIndex}
          onDeleteRequest={setPendingBuildingDeletion}
          onHeightChange={(buildingId, heightM) => {
            if (!onBuildingShapesChange) return;
            const updated = buildingShapes.map(s => s.id === buildingId ? { ...s, heightM } : s);
            onBuildingShapesChange(updated);
          }}
        />
      )}

      {/* Confirmation de suppression d'une construction */}
      <BuildingDeleteConfirmDialog
        pendingBuildingDeletion={pendingBuildingDeletion}
        onOpenChange={(open) => { if (!open) setPendingBuildingDeletion(null); }}
        onConfirm={() => {
          if (pendingBuildingDeletion) removeBuildingById(pendingBuildingDeletion);
          setPendingBuildingDeletion(null);
        }}
      />

      {isTerrainNu && buildingShapes.length > 0 && (
        <Card className="p-3 bg-red-50 dark:bg-red-950/20 rounded-2xl shadow-sm border-red-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                {buildingShapes.length} construction{buildingShapes.length > 1 ? 's' : ''} (incohérent avec terrain nu)
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Info */}
      <Card className="p-2.5 rounded-xl bg-muted/30 border-border/40">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isDrawingBuilding 
              ? "Touchez la carte pour tracer les sommets de la construction. Min. 3 points, puis cliquez Valider."
              : isDrawingMode 
                ? "Touchez la carte pour ajouter des bornes."
                : "Placez les bornes sur la carte en activant le mode tracé. Double-cliquez sur une borne pour modifier ses coordonnées GPS manuellement. Pour éviter l'empiètement des limites de votre parcelle sur le voisinage, prélevez les coordonnées GPS de chaque borne avec un équipement professionnel de précision (ex : Garmin GPS), puis double-cliquez sur chaque borne pour entrer les coordonnées prélevées."
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
          servitude={servitude}
          onServitudeUpdate={onServitudeChange}
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
      <ClearAllDialog
        open={showClearAllDialog}
        onOpenChange={setShowClearAllDialog}
        onConfirm={clearAllMarkers}
      />
    </div>
  );
};

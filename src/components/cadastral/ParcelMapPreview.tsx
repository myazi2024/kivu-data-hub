import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, MapPin, AlertTriangle, Info, Move, Hand, Plus, Trash2, Target } from 'lucide-react';
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
  const groupDragControlRef = useRef<any>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressMarkerRef = useRef<any>(null);
  const [surfaceArea, setSurfaceArea] = useState<number>(0);
  const [isMapReady, setIsMapReady] = useState(false);
  const [conflictingParcels, setConflictingParcels] = useState<ConflictingParcel[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [loadingConflicts, setLoadingConflicts] = useState(false);
  const [groupDragMode, setGroupDragMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showLongPressHint, setShowLongPressHint] = useState(false);
  const groupDragStartRef = useRef<{ lat: number; lng: number } | null>(null);
  
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
    // Utiliser le defaultCenter de la config
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

  // Ajouter un nouveau marqueur via appui prolongé
  const addMarkerAtPosition = useCallback((lat: number, lng: number) => {
    const newBorneNumber = coordinates.length + 1;
    const newCoordinate: Coordinate = {
      borne: `${newBorneNumber}`,
      lat: lat.toFixed(6),
      lng: lng.toFixed(6)
    };
    
    const updatedCoords = [...coordinates, newCoordinate];
    onCoordinatesUpdate(updatedCoords);
    
    // Mettre à jour les côtés de la parcelle
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
    
    // Mettre à jour les côtés de la parcelle
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
      
      // Trouver le côté correspondant en se basant sur le numéro de borne
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
        zoom: mapConfig.defaultZoom || 15,
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

      // Ajouter les contrôles de déplacement groupé
      const GroupDragControl = L.Control.extend({
        options: {
          position: 'topleft'
        },
        onAdd: function() {
          const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control group-drag-controls');
          container.style.display = 'flex';
          container.style.flexDirection = 'column';
          container.style.gap = '2px';
          
          // Bouton Mode Groupé
          const groupBtn = L.DomUtil.create('a', 'leaflet-control-group-drag', container);
          groupBtn.href = '#';
          groupBtn.title = 'Mode déplacement groupé';
          groupBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>
            </svg>
          `;
          groupBtn.style.width = '34px';
          groupBtn.style.height = '34px';
          groupBtn.style.display = 'flex';
          groupBtn.style.alignItems = 'center';
          groupBtn.style.justifyContent = 'center';
          groupBtn.style.backgroundColor = 'white';
          groupBtn.style.color = '#666';
          groupBtn.style.borderRadius = '4px';
          groupBtn.style.cursor = 'pointer';
          groupBtn.style.transition = 'all 0.2s';
          
          // Bouton Mode Individuel
          const individualBtn = L.DomUtil.create('a', 'leaflet-control-individual-drag', container);
          individualBtn.href = '#';
          individualBtn.title = 'Mode déplacement individuel';
          individualBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 3L5 7l4 4M15 3l4 4-4 4M9 21l-4-4 4-4M15 21l4-4-4-4"/>
            </svg>
          `;
          individualBtn.style.width = '34px';
          individualBtn.style.height = '34px';
          individualBtn.style.display = 'flex';
          individualBtn.style.alignItems = 'center';
          individualBtn.style.justifyContent = 'center';
          individualBtn.style.backgroundColor = 'white';
          individualBtn.style.color = '#666';
          individualBtn.style.borderRadius = '4px';
          individualBtn.style.cursor = 'pointer';
          individualBtn.style.transition = 'all 0.2s';
          
          // Fonction pour mettre à jour l'état visuel
          const updateButtonStates = (isGroupMode: boolean) => {
            if (isGroupMode) {
              groupBtn.style.backgroundColor = 'hsl(var(--primary))';
              groupBtn.style.color = 'white';
              individualBtn.style.backgroundColor = 'white';
              individualBtn.style.color = '#666';
            } else {
              groupBtn.style.backgroundColor = 'white';
              groupBtn.style.color = '#666';
              individualBtn.style.backgroundColor = 'hsl(var(--primary))';
              individualBtn.style.color = 'white';
            }
          };
          
          // État initial (mode individuel par défaut)
          updateButtonStates(false);
          
          // Event handlers
          L.DomEvent.on(groupBtn, 'click', function(e: Event) {
            L.DomEvent.preventDefault(e);
            L.DomEvent.stopPropagation(e);
            setGroupDragMode(true);
            updateButtonStates(true);
          });
          
          L.DomEvent.on(individualBtn, 'click', function(e: Event) {
            L.DomEvent.preventDefault(e);
            L.DomEvent.stopPropagation(e);
            setGroupDragMode(false);
            updateButtonStates(false);
          });
          
          // Empêcher la propagation des événements de la souris
          L.DomEvent.disableClickPropagation(container);
          L.DomEvent.disableScrollPropagation(container);
          
          return container;
        }
      });
      
      if (mapConfig.enableDragging !== false) {
        const groupControl = new GroupDragControl();
        groupControl.addTo(map);
        groupDragControlRef.current = groupControl;
      }

      // Ajouter le support de l'appui prolongé pour ajouter des marqueurs
      if (enableDrawingMode) {
        let longPressTimer: NodeJS.Timeout | null = null;
        let touchStartPos: { lat: number; lng: number } | null = null;
        
        const startLongPress = (latlng: any) => {
          touchStartPos = { lat: latlng.lat, lng: latlng.lng };
          setShowLongPressHint(true);
          
          // Afficher un indicateur temporaire
          if (longPressMarkerRef.current) {
            longPressMarkerRef.current.remove();
          }
          
          const tempMarker = L.circleMarker([latlng.lat, latlng.lng], {
            radius: 12,
            color: 'hsl(var(--primary))',
            fillColor: 'hsl(var(--primary))',
            fillOpacity: 0.3,
            weight: 2,
            className: 'pulse-marker'
          }).addTo(map);
          
          longPressMarkerRef.current = tempMarker;
          
          longPressTimer = setTimeout(() => {
            if (touchStartPos) {
              addMarkerAtPosition(touchStartPos.lat, touchStartPos.lng);
              if (longPressMarkerRef.current) {
                longPressMarkerRef.current.remove();
                longPressMarkerRef.current = null;
              }
            }
            setShowLongPressHint(false);
          }, 600); // 600ms pour l'appui prolongé
        };
        
        const cancelLongPress = () => {
          if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
          }
          touchStartPos = null;
          setShowLongPressHint(false);
          
          if (longPressMarkerRef.current) {
            longPressMarkerRef.current.remove();
            longPressMarkerRef.current = null;
          }
        };
        
        // Events pour desktop (mousedown/mouseup)
        map.on('mousedown', (e: any) => {
          if (e.originalEvent.button === 0) { // Bouton gauche
            startLongPress(e.latlng);
          }
        });
        
        map.on('mouseup', cancelLongPress);
        map.on('mousemove', (e: any) => {
          if (touchStartPos) {
            const distance = map.distance([touchStartPos.lat, touchStartPos.lng], [e.latlng.lat, e.latlng.lng]);
            if (distance > 10) { // Si l'utilisateur bouge trop, annuler
              cancelLongPress();
            }
          }
        });
        
        // Events pour mobile (touchstart/touchend)
        const mapContainer = map.getContainer();
        mapContainer.addEventListener('touchstart', (e: TouchEvent) => {
          if (e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = mapContainer.getBoundingClientRect();
            const point = L.point(touch.clientX - rect.left, touch.clientY - rect.top);
            const latlng = map.containerPointToLatLng(point);
            startLongPress(latlng);
          }
        }, { passive: true });
        
        mapContainer.addEventListener('touchend', cancelLongPress, { passive: true });
        mapContainer.addEventListener('touchmove', (e: TouchEvent) => {
          if (touchStartPos && e.touches.length === 1) {
            cancelLongPress();
          }
        }, { passive: true });
      }

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
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      if (longPressMarkerRef.current) {
        longPressMarkerRef.current.remove();
        longPressMarkerRef.current = null;
      }
      if (mapInstanceRef.current) {
        // Supprimer les contrôles personnalisés
        if (groupDragControlRef.current) {
          groupDragControlRef.current.remove();
          groupDragControlRef.current = null;
        }
        
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setIsMapReady(false);
      }
    };
  }, [mapCenter, mapConfig.defaultZoom, enableDrawingMode, addMarkerAtPosition]);

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
          const markerColor = mapConfig.markerColor || '#3b82f6';
          // En mode de déplacement groupé, désactiver le dragging individuel
          const isDraggable = (mapConfig.enableDragging !== false) && !groupDragMode;
          const marker = L.marker([lat, lng], {
            draggable: isDraggable,
            icon: L.divIcon({
              className: 'custom-marker',
            html: `<div style="
              background-color: ${markerColor};
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
            ">
              <span style="transform: rotate(45deg); font-weight: bold; font-size: 12px;">${index + 1}</span>
            </div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            pane: 'markerPane', // Utiliser le pane dédié aux marqueurs (z-index 600)
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
              // Mettre à jour les dimensions après déplacement
              updateParcelSidesFromCoordinates(updatedCoords);
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
        const fillColor = mapConfig.fillColor || '#3b82f6';
        const polygon = L.polygon(latLngs, {
          color: 'transparent',
          fillColor: fillColor,
          fillOpacity: mapConfig.fillOpacity || 0.2,
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
  }, [isMapReady, validCoords.length, coordinates, onCoordinatesUpdate, mapConfig, roadSides, onRoadSidesChange, groupDragMode]);

  // Synchroniser l'état visuel des boutons de contrôle avec groupDragMode
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !groupDragControlRef.current) return;
    
    const container = groupDragControlRef.current.getContainer();
    if (!container) return;
    
    const groupBtn = container.querySelector('.leaflet-control-group-drag');
    const individualBtn = container.querySelector('.leaflet-control-individual-drag');
    
    if (groupBtn && individualBtn) {
      if (groupDragMode) {
        groupBtn.style.backgroundColor = 'hsl(var(--primary))';
        groupBtn.style.color = 'white';
        individualBtn.style.backgroundColor = 'white';
        individualBtn.style.color = '#666';
      } else {
        groupBtn.style.backgroundColor = 'white';
        groupBtn.style.color = '#666';
        individualBtn.style.backgroundColor = 'hsl(var(--primary))';
        individualBtn.style.color = 'white';
      }
    }
  }, [groupDragMode, isMapReady]);

  // Gérer le mode de déplacement groupé
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;
    
    const map = mapInstanceRef.current;
    const mapContainer = map.getContainer();
    
    if (groupDragMode && markersRef.current.length > 0) {
      console.log('Activation du mode déplacement groupé avec', markersRef.current.length, 'marqueurs');
      
      // Changer le curseur pour indiquer le mode de déplacement groupé
      mapContainer.style.cursor = 'move';
      
      // Désactiver le drag individuel des marqueurs
      markersRef.current.forEach(marker => {
        if (marker && marker.dragging) {
          marker.dragging.disable();
        }
      });
      
      // Variables pour le drag groupé
      let isDragging = false;
      let startPoint: { lat: number; lng: number } | null = null;
      
      const onMouseDown = (e: any) => {
        // Vérifier si le clic est sur un marqueur ou sur la carte
        if (e.originalEvent && e.originalEvent.target) {
          const target = e.originalEvent.target;
          // Ne pas démarrer le drag si on clique sur un contrôle
          if (target.closest('.leaflet-control')) {
            return;
          }
        }
        
        isDragging = true;
        startPoint = e.latlng;
        map.dragging.disable();
        mapContainer.style.cursor = 'grabbing';
        console.log('Début du drag groupé à', startPoint);
      };
      
      const onMouseMove = (e: any) => {
        if (!isDragging || !startPoint) return;
        
        const currentPoint = e.latlng;
        const deltaLat = currentPoint.lat - startPoint.lat;
        const deltaLng = currentPoint.lng - startPoint.lng;
        
        // Déplacer tous les marqueurs simultanément
        markersRef.current.forEach((marker) => {
          if (marker) {
            const markerPos = marker.getLatLng();
            marker.setLatLng([markerPos.lat + deltaLat, markerPos.lng + deltaLng]);
          }
        });
        
        // Redessiner le polygone en temps réel
        if (polygonRef.current && markersRef.current.length >= 3) {
          const newLatLngs: [number, number][] = markersRef.current.map(m => {
            const pos = m.getLatLng();
            return [pos.lat, pos.lng];
          });
          polygonRef.current.setLatLngs(newLatLngs);
        }
        
        // Redessiner les segments en temps réel
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
        
        console.log('Fin du drag groupé');
        isDragging = false;
        startPoint = null;
        mapContainer.style.cursor = 'move';
        map.dragging.enable();
        
        // Mettre à jour les coordonnées finales en préservant l'ordre
        const updatedCoords = [...coordinates];
        
        // Parcourir tous les marqueurs et mettre à jour les coordonnées correspondantes
        markersRef.current.forEach((marker, markerIndex) => {
          if (!marker) return;
          
          // Trouver la coordonnée correspondante dans validCoords
          const validCoord = validCoords[markerIndex];
          if (!validCoord) return;
          
          // Trouver l'index de cette coordonnée dans le tableau complet
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
      
      // Gérer également le cas où la souris sort de la carte
      const onMouseLeave = () => {
        if (isDragging) {
          console.log('Souris sortie de la carte pendant le drag');
          isDragging = false;
          startPoint = null;
          mapContainer.style.cursor = 'move';
          map.dragging.enable();
          
          // Mettre à jour les coordonnées comme dans onMouseUp
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
        }
      };
      
      map.on('mousedown', onMouseDown);
      map.on('mousemove', onMouseMove);
      map.on('mouseup', onMouseUp);
      mapContainer.addEventListener('mouseleave', onMouseLeave);
      
      return () => {
        console.log('Nettoyage des event listeners du mode groupé');
        map.off('mousedown', onMouseDown);
        map.off('mousemove', onMouseMove);
        map.off('mouseup', onMouseUp);
        mapContainer.removeEventListener('mouseleave', onMouseLeave);
        mapContainer.style.cursor = '';
        map.dragging.enable();
        
        // Réactiver le drag individuel des marqueurs si configuré
        if (mapConfig.enableDragging !== false) {
          markersRef.current.forEach(marker => {
            if (marker && marker.dragging) {
              marker.dragging.enable();
            }
          });
        }
      };
    } else if (!groupDragMode) {
      // Mode individuel : réactiver le drag individuel et réinitialiser le curseur
      console.log('Mode individuel activé');
      mapContainer.style.cursor = '';
      if (mapConfig.enableDragging !== false && markersRef.current.length > 0) {
        markersRef.current.forEach(marker => {
          if (marker && marker.dragging) {
            marker.dragging.enable();
          }
        });
      }
    }
  }, [groupDragMode, isMapReady, mapConfig.enableDragging, coordinates, validCoords, onCoordinatesUpdate, updateParcelSidesFromCoordinates]);

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
      
      // Utiliser la dimension du formulaire si elle existe, sinon calculer
      let distance: number;
      if (parcelSides[i]?.length && parseFloat(parcelSides[i].length) > 0) {
        distance = parseFloat(parcelSides[i].length);
      } else {
        distance = calculateDistance(start[0], start[1], end[0], end[1]);
      }
      
      // Point milieu
      const midLat = (start[0] + end[0]) / 2;
      const midLng = (start[1] + end[1]) / 2;
      
      // Vérifier si ce côté borde une route
      const roadSide = roadSides.find(s => s.sideIndex === i);
      const isRoadBordering = roadSide?.bordersRoad || false;
      
      // Utiliser le format configuré
      const dimensionFormat = mapConfig.dimensionFormat || '{value}m';
      const dimensionUnit = mapConfig.dimensionUnit || 'm';
      const formattedDistance = dimensionFormat.replace('{value}', distance.toFixed(2));
      
      // Créer le label avec infos route si applicable
      let labelText = formattedDistance;
      if (mapConfig.showSideLabels) {
        labelText = `Côté ${i + 1}: ${formattedDistance}`;
      }
      if (isRoadBordering && roadSide?.roadType) {
        labelText += ` (${roadSide.roadType})`;
      }
      
      const dimensionMarker = L.marker([midLat, midLng], {
        icon: L.divIcon({
          className: 'dimension-label',
          html: `<div style="
            background-color: white;
            color: ${mapConfig.dimensionTextColor || '#000000'};
            padding: 4px 8px;
            border-radius: 4px;
            font-size: ${mapConfig.dimensionFontSize || 11}px;
            font-weight: 600;
            border: 1px solid ${isRoadBordering ? '#f59e0b' : (mapConfig.lineColor || '#3b82f6')};
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

  // Propager la surface calculée
  useEffect(() => {
    if (onSurfaceChange && surfaceArea > 0) {
      onSurfaceChange(surfaceArea);
    }
  }, [surfaceArea, onSurfaceChange]);

  return (
    <div className="space-y-3">
      {/* Header avec titre et badges */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
          Aperçu de la carte
        </Label>
        <div className="flex items-center gap-2 flex-wrap">
          {coordinates.length > 0 && (
            <Badge variant="outline" className="gap-1 text-xs h-6 px-2 rounded-xl">
              <span className="font-medium">{validCoords.length}</span>
              <span>bornes</span>
            </Badge>
          )}
          {surfaceArea > 0 && (
            <Badge variant="secondary" className="font-mono text-xs h-6 px-2 rounded-xl bg-primary/10 text-primary">
              {surfaceArea.toLocaleString()} m²
            </Badge>
          )}
        </div>
      </div>

      {/* Instructions de dessin */}
      {enableDrawingMode && (
        <Card className="p-3 bg-gradient-to-br from-primary/5 to-transparent border-primary/20 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-foreground">
                {coordinates.length === 0 
                  ? "Dessinez votre parcelle" 
                  : `${coordinates.length} borne${coordinates.length > 1 ? 's' : ''} ajoutée${coordinates.length > 1 ? 's' : ''}`
                }
              </p>
              <p className="text-xs text-muted-foreground">
                {coordinates.length === 0 
                  ? "Faites un appui prolongé sur la carte pour placer la première borne de votre parcelle."
                  : coordinates.length < 3
                    ? "Continuez à ajouter des bornes par appui prolongé pour dessiner la parcelle."
                    : "Parcelle tracée. Vous pouvez déplacer les bornes ou en ajouter d'autres."
                }
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Indicateur d'appui prolongé */}
      {showLongPressHint && (
        <Alert className="py-2 bg-primary/10 border-primary/30 rounded-xl animate-pulse">
          <Target className="h-4 w-4 text-primary" />
          <AlertDescription className="text-xs text-primary font-medium">
            Maintenez appuyé pour ajouter une borne...
          </AlertDescription>
        </Alert>
      )}

      {/* Alertes de conflit */}
      {conflictingParcels.length > 0 && (
        <Alert variant="destructive" className="py-2 rounded-xl">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <span>{conflictingParcels.length} conflit(s) détecté(s)</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConflictDialog(true)}
              className="h-7 text-xs rounded-lg"
            >
              Signaler
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Validation du nombre minimum de marqueurs */}
      {mapConfig.minMarkers && validCoords.length > 0 && validCoords.length < mapConfig.minMarkers && (
        <Alert variant="destructive" className="py-2 rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Minimum {mapConfig.minMarkers} bornes requises ({validCoords.length} actuellement).
          </AlertDescription>
        </Alert>
      )}

      {/* Validation de la surface */}
      {surfaceArea > 0 && (
        <>
          {mapConfig.minSurfaceSqm && surfaceArea < mapConfig.minSurfaceSqm && (
            <Alert variant="destructive" className="py-2 rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Surface trop petite: {surfaceArea.toLocaleString()} m² (min: {mapConfig.minSurfaceSqm.toLocaleString()} m²).
              </AlertDescription>
            </Alert>
          )}
          {mapConfig.maxSurfaceSqm && surfaceArea > mapConfig.maxSurfaceSqm && (
            <Alert variant="destructive" className="py-2 rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Surface trop grande: {surfaceArea.toLocaleString()} m² (max: {mapConfig.maxSurfaceSqm.toLocaleString()} m²).
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {loadingConflicts && (
        <Alert className="py-2 rounded-xl">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Vérification des parcelles voisines...
          </AlertDescription>
        </Alert>
      )}

      {/* Carte */}
      <Card className="overflow-hidden border-2 border-primary/20 relative z-0 rounded-2xl shadow-lg">
        <div 
          ref={mapRef} 
          className="h-[280px] md:h-[350px] lg:h-[400px] w-full relative z-0"
        />
      </Card>

      {/* Contrôles de dessin */}
      {enableDrawingMode && coordinates.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={removeLastMarker}
            className="gap-1.5 text-xs h-8 rounded-xl hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer dernière
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearAllMarkers}
            className="gap-1.5 text-xs h-8 rounded-xl hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Tout effacer
          </Button>
        </div>
      )}

      {/* Résumé des dimensions */}
      {validCoords.length >= 3 && parcelSides.length > 0 && (
        <Card className="p-3 bg-muted/30 rounded-2xl">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Dimensions calculées</Label>
            <div className="grid grid-cols-2 gap-2">
              {parcelSides.map((side, index) => (
                <div key={index} className="flex items-center justify-between bg-background/50 p-2 rounded-xl text-xs">
                  <span className="text-muted-foreground">{side.name}</span>
                  <span className="font-mono font-medium">{side.length} m</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
      
      {/* Info */}
      <div className="text-xs text-muted-foreground flex items-start gap-1.5">
        <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
        <span>
          {enableDrawingMode 
            ? "Appui prolongé pour ajouter une borne. Déplacez les marqueurs pour ajuster."
            : "Utilisez les contrôles sur la carte pour choisir entre déplacement groupé ou individuel."
          }
          {mapConfig.enableRoadBorderingFeature !== false && ' Cliquez sur un segment pour indiquer une route.'}
        </span>
      </div>

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

import { useEffect, type MutableRefObject, type RefObject } from 'react';
import type { Coordinate, ParcelSide } from './types';
import type { RoadSideInfo } from '../RoadBorderingSidesPanel';
import type { MapConfig } from '@/hooks/useMapConfig';
import { calculatePolygonArea } from './geometry';

interface UseParcelMarkersParams {
  isMapReady: boolean;
  mapInstanceRef: MutableRefObject<any>;
  renderSeqRef: MutableRefObject<number>;
  markersRef: MutableRefObject<any[]>;
  polygonRef: MutableRefObject<any>;
  dimensionLayersRef: MutableRefObject<any[]>;
  segmentLayersRef: MutableRefObject<any[]>;
  clearMarkerLongPressTimers: () => void;
  longPressTimerRef: MutableRefObject<number | null>;
  selectedBorneRef: MutableRefObject<string | null>;
  selectedMarkerRef: MutableRefObject<any>;
  stableSurfaceRef: MutableRefObject<number>;
  stablePerimeterRef: MutableRefObject<number>;
  lastParcelSidesLengthRef: MutableRefObject<string>;
  validCoords: Coordinate[];
  roadSides: RoadSideInfo[];
  mapConfig: MapConfig;
  isGroupDragMode: boolean;
  isDrawingMode: boolean;
  selectedBorne: string | null;
  isDrawingBuilding: boolean;
  buildingVertices: { lat: number; lng: number }[];
  coordinates: Coordinate[];
  onCoordinatesUpdate: (coordinates: Coordinate[]) => void;
  updateParcelSidesFromCoordinates: (coords: Coordinate[]) => void;
  setSelectedBorne: (borne: string | null) => void;
  setEditingBorneIndex: (index: number | null) => void;
  setEditingBorneCoords: (coords: { lat: string; lng: string }) => void;
  onRoadSidesChange?: (roadSides: RoadSideInfo[]) => void;
  parcelSides: ParcelSide[];
  setSurfaceArea: (area: number) => void;
  setPerimeterLength: (length: number) => void;
  onSurfaceChange?: (surface: number) => void;
  displaySideDimensions: (L: any, map: any, coords: [number, number][]) => void;
}

/**
 * Gère le rendu des marqueurs de bornes et du polygone de la parcelle.
 * Comportement et dépendances identiques à l'effet d'origine de ParcelMapPreview.
 */
export function useParcelMarkers(params: UseParcelMarkersParams) {
  const {
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
  } = params;

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
        // Les marqueurs retirés ne doivent plus ouvrir une édition sur un côté réindexé
        clearMarkerLongPressTimers();

        segmentLayersRef.current.forEach(layer => {
          try {
            if (layer && map.hasLayer(layer)) map.removeLayer(layer);
          } catch (e) {
            console.error('remove segment error', e);
          }
        });
        segmentLayersRef.current = [];


        const latLngs: [number, number][] = [];
        const markerColor = mapConfig.markerColor || '#3b82f6';
        const isMarkerMoveMode = Boolean(selectedBorneRef.current);
        const shouldAutoCenter = !isDrawingMode && !isDrawingBuilding && !isGroupDragMode && !selectedBorne && !isMarkerMoveMode;

        // Créer les marqueurs
        validCoords.forEach((coord, index) => {
          const lat = parseFloat(coord.lat);
          const lng = parseFloat(coord.lng);
          if (Number.isNaN(lat) || Number.isNaN(lng)) return;
          latLngs.push([lat, lng]);

          const isSelected = selectedBorne === coord.borne;
          const marker = L.marker([lat, lng], {
            draggable: !isGroupDragMode && !isDrawingMode && !isDrawingBuilding && !isMarkerMoveMode && mapConfig.enableDragging !== false,
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
            if (isDrawingMode || isGroupDragMode || isDrawingBuilding) return;
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

          // Double-clic = édition manuelle des coordonnées GPS
          marker.on('dblclick', (e: any) => {
            e.originalEvent?.stopPropagation();
            e.originalEvent?.preventDefault();
            const idx = coordinates.findIndex(c => c.borne === coord.borne);
            if (idx !== -1) {
              setEditingBorneIndex(idx);
              setEditingBorneCoords({ lat: coordinates[idx].lat, lng: coordinates[idx].lng });
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

          // Afficher les dimensions (masquées pendant le tracé d'une construction)
          if (mapConfig.showSideDimensions && !isDrawingBuilding) {
            displaySideDimensions(L, map, latLngs);
          }

          if (shouldAutoCenter) {
            map.fitBounds(polygon.getBounds(), { padding: [40, 40] });
          }
        } else if (latLngs.length > 0) {
          if (shouldAutoCenter && mapInstanceRef.current && (map as any)?._loaded && map.getContainer()?.isConnected) {
            try { map.setView(latLngs[0], 19); } catch (e) { console.warn('setView skipped:', e); }
          }
          setSurfaceArea(0);
          setPerimeterLength(0);
          stableSurfaceRef.current = 0;
          stablePerimeterRef.current = 0;
          lastParcelSidesLengthRef.current = '';
        }

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
  }, [isMapReady, validCoords, roadSides, mapConfig, isGroupDragMode, isDrawingMode, selectedBorne, isDrawingBuilding, buildingVertices]);
}

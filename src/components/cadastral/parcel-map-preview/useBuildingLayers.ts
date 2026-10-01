import { useEffect, type MutableRefObject } from 'react';
import type { BuildingShape } from './types';
import { calculateBuildingArea, calculateDistance } from './geometry';

interface UseBuildingLayersParams {
  isMapReady: boolean;
  mapInstanceRef: MutableRefObject<any>;
  buildingLayersRef: MutableRefObject<any[]>;
  buildingPolygonsRef: MutableRefObject<Map<string, any>>;
  buildingVerticesRef: MutableRefObject<{ lat: number; lng: number }[]>;
  markerLongPressTimersRef: MutableRefObject<Set<number>>;
  bvDragActiveRef: MutableRefObject<boolean>;
  bvDragShapeIdRef: MutableRefObject<string | null>;
  bvDragVertexIdxRef: MutableRefObject<number>;
  bvDragMarkerRef: MutableRefObject<any>;
  buildingShapes: BuildingShape[];
  buildingShapesSignature: string;
  buildingVertices: { lat: number; lng: number }[];
  isDrawingBuilding: boolean;
  isDrawingMode: boolean;
  isGroupDragMode: boolean;
  constructionLabels: string[];
  onBuildingShapesChange?: (shapes: BuildingShape[]) => void;
  setEditingBuildingVertex: (value: { shapeId: string; vertexIdx: number } | null) => void;
  setEditingBuildingVertexCoords: (coords: { lat: string; lng: string }) => void;
}

/**
 * Gère le rendu des constructions (formes validées + tracé en cours).
 * Comportement et dépendances identiques à l'effet d'origine de ParcelMapPreview.
 */
export function useBuildingLayers(params: UseBuildingLayersParams) {
  const {
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
  } = params;

  // Effet dédié au rendu des constructions (formes validées + tracé en cours).
  // Isolé du rendu des bornes pour que toute modification de `buildingShapes`
  // (ajout, suppression, édition d'un sommet, changement de libellé) redessine
  // immédiatement la carte.
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;

    let cancelled = false;
    const mapHandlers: [string, (e: any) => void][] = [];

    const clearBuildingLayers = (map: any) => {
      buildingLayersRef.current.forEach(layer => {
        try { if (layer && map.hasLayer(layer)) map.removeLayer(layer); } catch (e) { console.error('remove building layer error', e); }
      });
      buildingLayersRef.current = [];
      buildingPolygonsRef.current.clear();
    };

    const drawBuildings = async () => {
      try {
        const L = await import('leaflet');
        if (cancelled) return;
        const map = mapInstanceRef.current;
        if (!map) return;

        // Ne pas détruire les couches pendant un drag de sommet actif
        if (bvDragActiveRef.current) return;
        clearBuildingLayers(map);

        // Dessiner les constructions validées (polygones à partir de vertices)
        buildingShapes.forEach((shape, idx) => {
          if (!shape.vertices || shape.vertices.length < 3) return;
          const bldLatLngs = shape.vertices.map(v => [v.lat, v.lng] as [number, number]);
          const bldPolygon = L.polygon(bldLatLngs, {
            color: '#dc2626',
            fillColor: '#dc2626',
            fillOpacity: 0.3,
            weight: 2,
          }).addTo(map);
          const label = constructionLabels[shape.linkedIndex ?? idx] || `Construction ${idx + 1}`;
          bldPolygon.bindPopup(`
            <div style="font-size: 12px;">
              <strong style="color: #dc2626;">${label}</strong><br/>
              <span>Surface: ${shape.areaSqm.toFixed(1)} m²</span><br/>
              <span>Périmètre: ${shape.perimeterM.toFixed(1)} m</span>
            </div>
          `);
          buildingPolygonsRef.current.set(shape.id, bldPolygon);
          buildingLayersRef.current.push(bldPolygon);

          // Marqueurs interactifs sur chaque sommet (double-clic = éditer GPS)
          shape.vertices.forEach((v, vi) => {
            const vertexMarker = L.circleMarker([v.lat, v.lng], {
              radius: 7,
              color: '#dc2626',
              fillColor: '#ffffff',
              fillOpacity: 1,
              weight: 2,
              interactive: !isDrawingBuilding,
            }).addTo(map);

            // Double-clic = édition manuelle GPS
            vertexMarker.on('dblclick', (e: any) => {
              e.originalEvent?.stopPropagation();
              e.originalEvent?.preventDefault();
              setEditingBuildingVertex({ shapeId: shape.id, vertexIdx: vi });
              setEditingBuildingVertexCoords({ lat: v.lat.toFixed(6), lng: v.lng.toFixed(6) });
            });

            // Appui prolongé = mode drag du sommet de construction (via refs)
            let bvLongPressTimer: number | null = null;

            const startBvLongPress = (e: any) => {
              if (isDrawingMode || isGroupDragMode || isDrawingBuilding) return;
              e.originalEvent?.preventDefault();
              if (bvLongPressTimer) {
                window.clearTimeout(bvLongPressTimer);
                markerLongPressTimersRef.current.delete(bvLongPressTimer);
              }
              bvLongPressTimer = window.setTimeout(() => {
                if (bvLongPressTimer) markerLongPressTimersRef.current.delete(bvLongPressTimer);
                bvLongPressTimer = null;
                bvDragActiveRef.current = true;
                bvDragShapeIdRef.current = shape.id;
                bvDragVertexIdxRef.current = vi;
                bvDragMarkerRef.current = vertexMarker;
                vertexMarker.setStyle({ color: '#facc15', fillColor: '#facc15', radius: 9 });
                if (map) {
                  map.dragging.disable();
                  map.scrollWheelZoom.disable();
                  map.touchZoom.disable();
                  map.getContainer().style.cursor = 'grabbing';
                }
              }, 450);
              markerLongPressTimersRef.current.add(bvLongPressTimer);
            };

            const cancelBvLongPress = () => {
              if (bvLongPressTimer) {
                window.clearTimeout(bvLongPressTimer);
                markerLongPressTimersRef.current.delete(bvLongPressTimer);
                bvLongPressTimer = null;
              }
            };

            const moveBvDrag = (e: any) => {
              if (!bvDragActiveRef.current || bvDragMarkerRef.current !== vertexMarker) return;
              const latlng = e.latlng || (map && map.mouseEventToLatLng(e.originalEvent));
              if (!latlng) return;
              vertexMarker.setLatLng(latlng);
            };

            const touchMoveBvDrag = (e: any) => {
              if (!bvDragActiveRef.current || bvDragMarkerRef.current !== vertexMarker) return;
              const touch = e.originalEvent?.touches?.[0];
              if (touch && map) {
                const latlng = map.containerPointToLatLng(L.point(touch.clientX - map.getContainer().getBoundingClientRect().left, touch.clientY - map.getContainer().getBoundingClientRect().top));
                vertexMarker.setLatLng(latlng);
              }
            };

            const endBvDrag = () => {
              cancelBvLongPress();
              if (!bvDragActiveRef.current || bvDragMarkerRef.current !== vertexMarker) return;

              const finalLatLng = vertexMarker.getLatLng();
              const dragShapeId = bvDragShapeIdRef.current;
              const dragVertexIdx = bvDragVertexIdxRef.current;

              // Reset refs BEFORE triggering re-render
              bvDragActiveRef.current = false;
              bvDragShapeIdRef.current = null;
              bvDragVertexIdxRef.current = -1;
              bvDragMarkerRef.current = null;

              vertexMarker.setStyle({ color: '#dc2626', fillColor: '#ffffff', radius: 7 });
              if (map) {
                map.dragging.enable();
                map.scrollWheelZoom.enable();
                map.touchZoom.enable();
                map.getContainer().style.cursor = '';
                // Clean up map-level listeners for this vertex
                map.off('mousemove', moveBvDrag);
                map.off('touchmove', touchMoveBvDrag);
              }

              if (onBuildingShapesChange && dragShapeId) {
                const updated = buildingShapes.map(s => {
                  if (s.id !== dragShapeId) return s;
                  const newVerts = [...s.vertices];
                  newVerts[dragVertexIdx] = { lat: finalLatLng.lat, lng: finalLatLng.lng };
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
            };

            vertexMarker.on('mousedown', startBvLongPress);
            vertexMarker.on('touchstart', startBvLongPress);
            vertexMarker.on('mouseup', () => { cancelBvLongPress(); endBvDrag(); });
            vertexMarker.on('touchend', () => { cancelBvLongPress(); endBvDrag(); });
            vertexMarker.on('mouseout', () => { if (bvDragActiveRef.current) return; cancelBvLongPress(); });
            map.on('mousemove', moveBvDrag);
            map.on('touchmove', touchMoveBvDrag);
            mapHandlers.push(['mousemove', moveBvDrag], ['touchmove', touchMoveBvDrag]);

            buildingLayersRef.current.push(vertexMarker);
          });

          // Afficher les dimensions des côtés de la construction
          shape.vertices.forEach((v, vi) => {
            const nextV = shape.vertices[(vi + 1) % shape.vertices.length];
            const midLat = (v.lat + nextV.lat) / 2;
            const midLng = (v.lng + nextV.lng) / 2;
            const side = shape.sides[vi];
            if (!side) return;
            const dimMarker = L.marker([midLat, midLng], {
              icon: L.divIcon({
                className: 'building-dim-label',
                html: `<div style="background:rgba(220,38,38,0.9);color:white;padding:1px 4px;border-radius:3px;font-size:9px;font-weight:600;white-space:nowrap;">${side.length}m</div>`,
                iconSize: [0, 0],
                iconAnchor: [0, 0],
              }),
              interactive: false,
            }).addTo(map);
            buildingLayersRef.current.push(dimMarker);
          });
        });

        // Dessiner le tracé de construction en cours
        const currentBuildingVerts = buildingVerticesRef.current;
        if (currentBuildingVerts.length > 0) {
          // Lignes entre sommets
          const bvLatLngs = currentBuildingVerts.map(v => [v.lat, v.lng] as [number, number]);
          if (bvLatLngs.length >= 2) {
            const polyline = L.polyline(bvLatLngs, {
              color: '#dc2626',
              weight: 2,
              dashArray: '6,4',
              opacity: 0.8,
            }).addTo(map);
            buildingLayersRef.current.push(polyline);

            // Ligne de fermeture en pointillé (preview)
            if (bvLatLngs.length >= 3) {
              const closingLine = L.polyline([bvLatLngs[bvLatLngs.length - 1], bvLatLngs[0]], {
                color: '#dc2626',
                weight: 1.5,
                dashArray: '3,6',
                opacity: 0.4,
              }).addTo(map);
              buildingLayersRef.current.push(closingLine);
            }
          }

          // Marqueurs pour chaque sommet
          currentBuildingVerts.forEach((v, vi) => {
            const vertMarker = L.circleMarker([v.lat, v.lng], {
              radius: 5,
              color: '#dc2626',
              fillColor: '#ffffff',
              fillOpacity: 1,
              weight: 2,
            }).addTo(map);
            buildingLayersRef.current.push(vertMarker);

            // Afficher la distance du segment
            if (vi > 0) {
              const prevV = currentBuildingVerts[vi - 1];
              const dist = calculateDistance(prevV.lat, prevV.lng, v.lat, v.lng);
              const midLat = (prevV.lat + v.lat) / 2;
              const midLng = (prevV.lng + v.lng) / 2;
              const dimLabel = L.marker([midLat, midLng], {
                icon: L.divIcon({
                  className: 'building-dim-temp',
                  html: `<div style="background:rgba(220,38,38,0.8);color:white;padding:1px 4px;border-radius:3px;font-size:9px;font-weight:600;white-space:nowrap;">${dist.toFixed(1)}m</div>`,
                  iconSize: [0, 0],
                  iconAnchor: [0, 0],
                }),
                interactive: false,
              }).addTo(map);
              buildingLayersRef.current.push(dimLabel);
            }
          });

          // Afficher la distance de fermeture et la surface en temps réel
          if (currentBuildingVerts.length >= 3) {
            const firstV = currentBuildingVerts[0];
            const lastV = currentBuildingVerts[currentBuildingVerts.length - 1];
            const closingDist = calculateDistance(lastV.lat, lastV.lng, firstV.lat, firstV.lng);
            const closingMidLat = (lastV.lat + firstV.lat) / 2;
            const closingMidLng = (lastV.lng + firstV.lng) / 2;
            const closingLabel = L.marker([closingMidLat, closingMidLng], {
              icon: L.divIcon({
                className: 'building-dim-closing',
                html: `<div style="background:rgba(220,38,38,0.5);color:white;padding:1px 4px;border-radius:3px;font-size:9px;font-weight:600;white-space:nowrap;font-style:italic;">${closingDist.toFixed(1)}m</div>`,
                iconSize: [0, 0],
                iconAnchor: [0, 0],
              }),
              interactive: false,
            }).addTo(map);
            buildingLayersRef.current.push(closingLabel);
          }
        }
      } catch (err) {
        console.error('ParcelMapPreview drawBuildings error:', err);
      }
    };

    const rafId = requestAnimationFrame(() => { drawBuildings(); });

    return () => {
      cancelAnimationFrame(rafId);
      cancelled = true;
      const map = mapInstanceRef.current;
      if (map) {
        mapHandlers.forEach(([evt, fn]) => { try { map.off(evt, fn); } catch {} });
        if (!bvDragActiveRef.current) clearBuildingLayers(map);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMapReady, buildingShapesSignature, buildingVertices, isDrawingBuilding, isDrawingMode, isGroupDragMode, constructionLabels]);
}

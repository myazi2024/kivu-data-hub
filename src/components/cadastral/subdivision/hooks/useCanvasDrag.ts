import { useState, useCallback, useRef } from 'react';
import { SubdivisionLot, Point2D } from '../types';
import { MetricFrame, polygonAreaSqmAccurate, polygonAreaSqmRelative, polygonPerimeterM } from '../utils/metrics';
import { projectOnPolyline } from '../utils/geometry';

type DragType = 'vertex' | 'edge' | 'shared-edge' | 'polygon' | 'boundary-vertex' | null;

interface DragState {
  type: DragType;
  lotId: string;
  vertexIdx?: number;
  edgeIdx?: number;
  // For shared-edge: second lot + its matching edge
  lotId2?: string;
  edgeIdx2?: number;
  // Map of lot2 vertex index -> matching lot1 vertex index for the shared edge
  // (two vertices, accounts for opposite winding).
  twin?: { lot1Idx1: number; lot1Idx2: number; lot2Idx1: number; lot2Idx2: number };
  startNorm?: Point2D;
  startVertices?: Point2D[];
  // For boundary-vertex: every (lot, vertex) sharing the captured boundary
  // sommet, and the current edge of the parent perimeter we slide along.
  boundaryTwins?: { lotId: string; vertexIdx: number }[];
  boundaryEdgeIdx?: number;
}

const SNAP_TOLERANCE = 0.015; // normalized

export function useCanvasDrag(
  lots: SubdivisionLot[],
  onUpdateLot: (id: string, vertices: Point2D[], areaSqm?: number, perimeterM?: number) => void,
  snapEnabled: boolean,
  showGrid: boolean,
  metricFrame?: MetricFrame,
  parentNormArea?: number,
  parentAreaSqm?: number,
) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const lastNorm = useRef<Point2D | null>(null);

  // Compute area + perimeter. Prefer scaling relative to the parent parcel so
  // the sum of lots stays consistent with the official `area_sqm`; fall back
  // to the bbox-accurate metric only if no parent context is provided.
  const computeMetrics = useCallback((vertices: Point2D[]): { areaSqm?: number; perimeterM?: number } => {
    if (!metricFrame) return {};
    const areaSqm = parentNormArea && parentNormArea > 0 && parentAreaSqm && parentAreaSqm > 0
      ? Math.max(1, Math.round(polygonAreaSqmRelative(vertices, parentNormArea, parentAreaSqm)))
      : Math.max(1, Math.round(polygonAreaSqmAccurate(vertices, metricFrame)));
    return {
      areaSqm,
      perimeterM: Math.round(polygonPerimeterM(vertices, metricFrame)),
    };
  }, [metricFrame, parentNormArea, parentAreaSqm]);

  const snapToGrid = useCallback((p: Point2D): Point2D => {
    if (!snapEnabled) return p;
    const gridStep = 0.05; // 1/20
    const snapped = { ...p };
    if (showGrid) {
      const gx = Math.round(p.x / gridStep) * gridStep;
      const gy = Math.round(p.y / gridStep) * gridStep;
      if (Math.abs(p.x - gx) < SNAP_TOLERANCE) snapped.x = gx;
      if (Math.abs(p.y - gy) < SNAP_TOLERANCE) snapped.y = gy;
    }
    // Snap to other lot edges
    for (const lot of lots) {
      for (const v of lot.vertices) {
        if (Math.abs(p.x - v.x) < SNAP_TOLERANCE) snapped.x = v.x;
        if (Math.abs(p.y - v.y) < SNAP_TOLERANCE) snapped.y = v.y;
      }
    }
    return snapped;
  }, [snapEnabled, showGrid, lots]);

  const startVertexDrag = useCallback((lotId: string, vertexIdx: number) => {
    const lot = lots.find(l => l.id === lotId);
    if (!lot || lot.isParentBoundary) return;
    setDragState({ type: 'vertex', lotId, vertexIdx });
  }, [lots]);

  const startEdgeDrag = useCallback((lotId: string, edgeIdx: number, normPos: Point2D) => {
    const lot = lots.find(l => l.id === lotId);
    if (!lot || lot.isParentBoundary) return;
    setDragState({ type: 'edge', lotId, edgeIdx, startNorm: normPos, startVertices: [...lot.vertices] });
    lastNorm.current = normPos;
  }, [lots]);

  /**
   * Drag an internal edge shared between two lots so that BOTH lots' geometry
   * follow the translation. Matching vertices in lot2 are detected by proximity
   * (handles opposite winding).
   */
  const startSharedEdgeDrag = useCallback((
    lotId1: string, edgeIdx1: number,
    lotId2: string, edgeIdx2: number,
    normPos: Point2D,
  ) => {
    const lot1 = lots.find(l => l.id === lotId1);
    const lot2 = lots.find(l => l.id === lotId2);
    if (!lot1 || !lot2) return;
    if (lot1.isParentBoundary || lot2.isParentBoundary) return;

    const l1i1 = edgeIdx1;
    const l1i2 = (edgeIdx1 + 1) % lot1.vertices.length;
    const l2a = edgeIdx2;
    const l2b = (edgeIdx2 + 1) % lot2.vertices.length;

    const A = lot1.vertices[l1i1];
    const B = lot1.vertices[l1i2];
    const C = lot2.vertices[l2a];
    const D = lot2.vertices[l2b];

    const d = (p: Point2D, q: Point2D) => Math.hypot(p.x - q.x, p.y - q.y);
    // Pair A↔C, B↔D vs A↔D, B↔C
    const opt1 = d(A, C) + d(B, D);
    const opt2 = d(A, D) + d(B, C);
    const twin = opt1 <= opt2
      ? { lot1Idx1: l1i1, lot1Idx2: l1i2, lot2Idx1: l2a, lot2Idx2: l2b }
      : { lot1Idx1: l1i1, lot1Idx2: l1i2, lot2Idx1: l2b, lot2Idx2: l2a };

    setDragState({
      type: 'shared-edge',
      lotId: lotId1,
      edgeIdx: edgeIdx1,
      lotId2,
      edgeIdx2,
      twin,
      startNorm: normPos,
      startVertices: [...lot1.vertices],
    });
    lastNorm.current = normPos;
  }, [lots]);

  const startPolygonDrag = useCallback((lotId: string, normPos: Point2D) => {
    const lot = lots.find(l => l.id === lotId);
    if (!lot || lot.isParentBoundary) return;
    setDragState({ type: 'polygon', lotId, startNorm: normPos, startVertices: [...lot.vertices] });
    lastNorm.current = normPos;
  }, [lots]);

  const moveDrag = useCallback((normalized: Point2D) => {
    if (!dragState) return;
    const lot = lots.find(l => l.id === dragState.lotId);
    if (!lot) return;

    if (dragState.type === 'vertex' && dragState.vertexIdx !== undefined) {
      const snapped = snapToGrid(normalized);
      const newVerts = [...lot.vertices];
      newVerts[dragState.vertexIdx] = { x: Math.max(0, Math.min(1, snapped.x)), y: Math.max(0, Math.min(1, snapped.y)) };
      const m = computeMetrics(newVerts);
      onUpdateLot(dragState.lotId, newVerts, m.areaSqm, m.perimeterM);
    }

    if (dragState.type === 'edge' && dragState.edgeIdx !== undefined && dragState.startVertices && lastNorm.current) {
      const dx = normalized.x - lastNorm.current.x;
      const dy = normalized.y - lastNorm.current.y;
      const idx1 = dragState.edgeIdx;
      const idx2 = (dragState.edgeIdx + 1) % lot.vertices.length;
      const newVerts = [...lot.vertices];
      newVerts[idx1] = { x: Math.max(0, Math.min(1, newVerts[idx1].x + dx)), y: Math.max(0, Math.min(1, newVerts[idx1].y + dy)) };
      newVerts[idx2] = { x: Math.max(0, Math.min(1, newVerts[idx2].x + dx)), y: Math.max(0, Math.min(1, newVerts[idx2].y + dy)) };
      const m = computeMetrics(newVerts);
      onUpdateLot(dragState.lotId, newVerts, m.areaSqm, m.perimeterM);
      lastNorm.current = normalized;
    }

    if (
      dragState.type === 'shared-edge' &&
      dragState.twin &&
      dragState.lotId2 &&
      lastNorm.current
    ) {
      const lot2 = lots.find(l => l.id === dragState.lotId2);
      if (!lot2) return;
      const dx = normalized.x - lastNorm.current.x;
      const dy = normalized.y - lastNorm.current.y;
      const { lot1Idx1, lot1Idx2, lot2Idx1, lot2Idx2 } = dragState.twin;

      const v1 = [...lot.vertices];
      v1[lot1Idx1] = { x: Math.max(0, Math.min(1, v1[lot1Idx1].x + dx)), y: Math.max(0, Math.min(1, v1[lot1Idx1].y + dy)) };
      v1[lot1Idx2] = { x: Math.max(0, Math.min(1, v1[lot1Idx2].x + dx)), y: Math.max(0, Math.min(1, v1[lot1Idx2].y + dy)) };

      const v2 = [...lot2.vertices];
      v2[lot2Idx1] = { x: v1[lot1Idx1].x, y: v1[lot1Idx1].y };
      v2[lot2Idx2] = { x: v1[lot1Idx2].x, y: v1[lot1Idx2].y };

      const m1 = computeMetrics(v1);
      const m2 = computeMetrics(v2);
      onUpdateLot(dragState.lotId, v1, m1.areaSqm, m1.perimeterM);
      onUpdateLot(dragState.lotId2, v2, m2.areaSqm, m2.perimeterM);
      lastNorm.current = normalized;
    }

    if (dragState.type === 'polygon' && lastNorm.current) {
      const dx = normalized.x - lastNorm.current.x;
      const dy = normalized.y - lastNorm.current.y;
      const newVerts = lot.vertices.map(v => ({
        x: Math.max(0, Math.min(1, v.x + dx)),
        y: Math.max(0, Math.min(1, v.y + dy)),
      }));
      // Translation preserves area/perimeter — still pass through for consistency
      const m = computeMetrics(newVerts);
      onUpdateLot(dragState.lotId, newVerts, m.areaSqm, m.perimeterM);
      lastNorm.current = normalized;
    }
  }, [dragState, lots, onUpdateLot, snapToGrid, computeMetrics]);

  const endDrag = useCallback(() => {
    setDragState(null);
    lastNorm.current = null;
  }, []);

  return {
    isDragging: !!dragState,
    dragType: dragState?.type || null,
    startVertexDrag,
    startEdgeDrag,
    startSharedEdgeDrag,
    startPolygonDrag,
    moveDrag,
    endDrag,
    snapToGrid,
  };
}

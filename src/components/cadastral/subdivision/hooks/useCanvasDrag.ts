import { useState, useCallback, useRef } from 'react';
import { SubdivisionLot, Point2D } from '../types';
import { MetricFrame, polygonAreaSqmAccurate, polygonPerimeterM } from '../utils/metrics';

type DragType = 'vertex' | 'edge' | 'polygon' | null;

interface DragState {
  type: DragType;
  lotId: string;
  vertexIdx?: number;
  edgeIdx?: number;
  startNorm?: Point2D;
  startVertices?: Point2D[];
}

const SNAP_TOLERANCE = 0.015; // normalized

export function useCanvasDrag(
  lots: SubdivisionLot[],
  onUpdateLot: (id: string, vertices: Point2D[], areaSqm?: number, perimeterM?: number) => void,
  snapEnabled: boolean,
  showGrid: boolean,
  metricFrame?: MetricFrame,
) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const lastNorm = useRef<Point2D | null>(null);

  // Compute area + perimeter via the metric frame (single source of truth).
  const computeMetrics = useCallback((vertices: Point2D[]): { areaSqm?: number; perimeterM?: number } => {
    if (!metricFrame) return {};
    return {
      areaSqm: Math.max(1, Math.round(polygonAreaSqmAccurate(vertices, metricFrame))),
      perimeterM: Math.round(polygonPerimeterM(vertices, metricFrame)),
    };
  }, [metricFrame]);

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
    startPolygonDrag,
    moveDrag,
    endDrag,
    snapToGrid,
  };
}

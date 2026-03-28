import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { SubdivisionLot, SubdivisionRoad, LOT_COLORS, USAGE_LABELS, Point2D, LotAnnotation, CLIPART_TYPES } from './types';
import { useCanvasViewport } from './hooks/useCanvasViewport';
import { useCanvasDrag } from './hooks/useCanvasDrag';
import { useCanvasKeyboard } from './hooks/useCanvasKeyboard';
import ClipartPalette from './ClipartPalette';
import { ZoomIn, ZoomOut, Maximize2, Magnet, Sticker } from 'lucide-react';

interface ParcelSide {
  length?: number | string;
  orientation?: string;
  [key: string]: any;
}

export type CanvasMode = 'select' | 'drawLine' | 'drawRoad' | 'clipart' | 'selectEdge';

export interface EdgeInfo {
  lotId1: string;
  edgeIdx1: number;
  lotId2?: string;
  edgeIdx2?: number;
  p1: Point2D;
  p2: Point2D;
  isShared: boolean;
}

interface LotCanvasProps {
  lots: SubdivisionLot[];
  roads: SubdivisionRoad[];
  parentAreaSqm: number;
  parentVertices?: Point2D[];
  parentSides?: ParcelSide[];
  selectedLotId: string | null;
  selectedLotIds?: string[];
  onSelectLot: (id: string | null) => void;
  onToggleLotSelection?: (id: string) => void;
  onUpdateLot: (id: string, vertices: Point2D[]) => void;
  onUpdateLotAnnotations?: (id: string, annotations: LotAnnotation[]) => void;
  onDeleteLot?: (id: string) => void;
  onDuplicateLot?: (id: string) => void;
  selectedRoadId?: string | null;
  onSelectRoad?: (id: string | null) => void;
  onDeleteRoad?: (id: string) => void;
  onUpdateRoad?: (id: string, updates: Partial<SubdivisionRoad>) => void;
  onSplitLot?: (id: string) => void;
  onConvertEdgeToRoad?: (edge: EdgeInfo) => void;
  onMergeLots?: (ids: string[]) => void;
  onCutLot?: (lotId: string, cutStart: Point2D, cutEnd: Point2D) => void;
  onFinishRoadDraw?: (path: Point2D[]) => void;
  mode?: CanvasMode;
  onModeChange?: (mode: CanvasMode) => void;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  showDimensions?: boolean;
  showLotNumbers?: boolean;
  showAreas?: boolean;
  showRoads?: boolean;
  showNorth?: boolean;
  showLegend?: boolean;
  showScale?: boolean;
  showOwnerNames?: boolean;
  readOnly?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  minLotAreaSqm?: number;
  roadPresetWidth?: number;
  roadPresetSurface?: SubdivisionRoad['surfaceType'];
}

const CANVAS_W = 600;
const CANVAS_H = 400;
const PADDING = 30;

const LotCanvas: React.FC<LotCanvasProps> = ({
  lots, roads, parentAreaSqm, parentVertices, parentSides, selectedLotId, selectedLotIds = [], onSelectLot, onToggleLotSelection, onUpdateLot,
  onUpdateLotAnnotations, onDeleteLot, onDuplicateLot,
  selectedRoadId, onSelectRoad, onDeleteRoad, onUpdateRoad, onSplitLot, onMergeLots,
  onCutLot, onFinishRoadDraw, onConvertEdgeToRoad, mode = 'select', onModeChange,
  showGrid = true, onToggleGrid, showDimensions = true, showLotNumbers = true,
  showAreas = true, showRoads = true, showNorth = true,
  showLegend = false, showScale = true, showOwnerNames = false,
  readOnly = false, onUndo, onRedo, minLotAreaSqm = 50,
  roadPresetWidth = 6, roadPresetSurface = 'planned',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showClipartPalette, setShowClipartPalette] = useState(false);
  const [rotationDrag, setRotationDrag] = useState<{
    startAngle: number;
    centerX: number; centerY: number; // normalized coords
    svgCenterX: number; svgCenterY: number; // SVG viewBox coords for angle calc
    originalVertices: Point2D[];
    targetType: 'lot' | 'road';
    targetId: string;
  } | null>(null);
  const [rotationAngleDisplay, setRotationAngleDisplay] = useState<number | null>(null);
  const [clipartType, setClipartType] = useState<LotAnnotation['type'] | null>(null);

  // Unified drawLine mode state
  const [lineDrawPoints, setLineDrawPoints] = useState<Point2D[]>([]);
  const [lineDrawMousePos, setLineDrawMousePos] = useState<Point2D | null>(null);
  const [isLineDragging, setIsLineDragging] = useState(false);
  const [lineDrawMultiMode, setLineDrawMultiMode] = useState(false);

  // Road endpoint drag state
  const [roadEndpointDrag, setRoadEndpointDrag] = useState<{roadId: string; pointIdx: number} | null>(null);

  // Road width drag state
  const [roadWidthDrag, setRoadWidthDrag] = useState<{roadId: string; startY: number; startWidth: number} | null>(null);

  // Context menu state
  const [contextMenuLotId, setContextMenuLotId] = useState<string | null>(null);

  // Edge selection state (selectEdge mode + right-click on edges)
  const [hoveredEdge, setHoveredEdge] = useState<EdgeInfo | null>(null);
  const [edgeContextMenu, setEdgeContextMenu] = useState<{ edge: EdgeInfo; screenPos: Point2D } | null>(null);

  // Viewport (zoom/pan)
  const viewport = useCanvasViewport(CANVAS_W, CANVAS_H);

  // Drag system
  const drag = useCanvasDrag(lots, onUpdateLot, snapEnabled, showGrid);

  // Detect shared edges between lots
  const sharedEdges = useMemo(() => {
    const TOLERANCE = 0.015;
    const edges: EdgeInfo[] = [];
    for (let i = 0; i < lots.length; i++) {
      for (let ei = 0; ei < lots[i].vertices.length; ei++) {
        const a1 = lots[i].vertices[ei];
        const a2 = lots[i].vertices[(ei + 1) % lots[i].vertices.length];
        for (let j = i + 1; j < lots.length; j++) {
          for (let ej = 0; ej < lots[j].vertices.length; ej++) {
            const b1 = lots[j].vertices[ej];
            const b2 = lots[j].vertices[(ej + 1) % lots[j].vertices.length];
            // Check if edges match (either direction)
            const match1 = Math.abs(a1.x - b1.x) < TOLERANCE && Math.abs(a1.y - b1.y) < TOLERANCE &&
                           Math.abs(a2.x - b2.x) < TOLERANCE && Math.abs(a2.y - b2.y) < TOLERANCE;
            const match2 = Math.abs(a1.x - b2.x) < TOLERANCE && Math.abs(a1.y - b2.y) < TOLERANCE &&
                           Math.abs(a2.x - b1.x) < TOLERANCE && Math.abs(a2.y - b1.y) < TOLERANCE;
            if (match1 || match2) {
              edges.push({
                lotId1: lots[i].id, edgeIdx1: ei,
                lotId2: lots[j].id, edgeIdx2: ej,
                p1: a1, p2: a2, isShared: true,
              });
            }
          }
        }
      }
    }
    return edges;
  }, [lots]);

  // Reset drawing states when mode changes
  useEffect(() => {
    setLineDrawPoints([]);
    setLineDrawMousePos(null);
    setIsLineDragging(false);
    setLineDrawMultiMode(false);
    setRoadEndpointDrag(null);
    setHoveredEdge(null);
    setEdgeContextMenu(null);
    if (mode !== 'clipart') {
      setShowClipartPalette(false);
      setClipartType(null);
    }
  }, [mode]);

  // Keyboard shortcuts
  useCanvasKeyboard(containerRef, {
    onDelete: () => {
      if (selectedLotId && onDeleteLot) onDeleteLot(selectedLotId);
    },
    onDuplicate: () => {
      if (selectedLotId && onDuplicateLot) onDuplicateLot(selectedLotId);
    },
    onUndo,
    onRedo,
    onEscape: () => {
      if (edgeContextMenu) {
        setEdgeContextMenu(null);
        return;
      }
      if ((mode === 'drawLine' || mode === 'drawRoad') && lineDrawPoints.length > 0) {
        setLineDrawPoints([]);
        setLineDrawMousePos(null);
        setIsLineDragging(false);
        setLineDrawMultiMode(false);
        return;
      }
      if (mode === 'selectEdge') {
        onModeChange?.('select');
        return;
      }
      onSelectLot(null);
      onModeChange?.('select');
      setContextMenuLotId(null);
      setShowClipartPalette(false);
      setClipartType(null);
    },
    onBackspace: () => {
      if ((mode === 'drawLine' || mode === 'drawRoad') && lineDrawMultiMode && lineDrawPoints.length > 1) {
        setLineDrawPoints(prev => prev.slice(0, -1));
      }
    },
    onToggleGrid: onToggleGrid,
    onToggleSnap: () => setSnapEnabled(prev => !prev),
    onSpaceDown: () => viewport.setSpaceDown(true),
    onSpaceUp: () => viewport.setSpaceDown(false),
    onArrowMove: (dx, dy) => {
      const step = 1 / (CANVAS_W - 2 * PADDING);
      const ndx = dx * step;
      const ndy = dy * step;
      if (selectedLotId) {
        const lot = lots.find(l => l.id === selectedLotId);
        if (lot) {
          onUpdateLot(selectedLotId, lot.vertices.map(v => ({ x: v.x + ndx, y: v.y + ndy })));
        }
      } else if (selectedRoadId && onUpdateRoad) {
        const road = roads.find(r => r.id === selectedRoadId);
        if (road) {
          onUpdateRoad(selectedRoadId, {
            path: road.path.map(v => ({ x: v.x + ndx, y: v.y + ndy })),
          });
        }
      }
    },
    onRotate: (angleDeg) => {
      const theta = (angleDeg * Math.PI) / 180;
      const rotateVertices = (vertices: Point2D[]) => {
        const cx = vertices.reduce((s, v) => s + v.x, 0) / vertices.length;
        const cy = vertices.reduce((s, v) => s + v.y, 0) / vertices.length;
        return vertices.map(v => ({
          x: cx + (v.x - cx) * Math.cos(theta) - (v.y - cy) * Math.sin(theta),
          y: cy + (v.x - cx) * Math.sin(theta) + (v.y - cy) * Math.cos(theta),
        }));
      };
      if (selectedLotId) {
        const lot = lots.find(l => l.id === selectedLotId);
        if (lot) onUpdateLot(selectedLotId, rotateVertices(lot.vertices));
      } else if (selectedRoadId && onUpdateRoad) {
        const road = roads.find(r => r.id === selectedRoadId);
        if (road) onUpdateRoad(selectedRoadId, { path: rotateVertices(road.path) });
      }
    },
  }, !readOnly);

  const toScreen = useCallback((p: Point2D) => ({
    x: PADDING + p.x * (CANVAS_W - 2 * PADDING),
    y: PADDING + (1 - p.y) * (CANVAS_H - 2 * PADDING),
  }), []);

  const fromScreen = useCallback((sx: number, sy: number): Point2D => ({
    x: Math.max(0, Math.min(1, (sx - PADDING) / (CANVAS_W - 2 * PADDING))),
    y: Math.max(0, Math.min(1, 1 - (sy - PADDING) / (CANVAS_H - 2 * PADDING))),
  }), []);

  const getSvgPos = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = (CANVAS_W / viewport.viewport.zoom) / rect.width;
    const scaleY = (CANVAS_H / viewport.viewport.zoom) / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX - viewport.viewport.panX,
      y: (e.clientY - rect.top) * scaleY - viewport.viewport.panY,
    };
  }, [viewport.viewport]);

  const sideLength = Math.sqrt(parentAreaSqm);

  // ---- Distance calculation helpers ----
  const getParallelEdges = useCallback((lineStart: Point2D, lineEnd: Point2D) => {
    const edges: { p1Screen: Point2D; p2Screen: Point2D; distM: number; midScreen: Point2D; lineMidScreen: Point2D }[] = [];
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lineLen = Math.sqrt(dx * dx + dy * dy);
    if (lineLen < 0.001) return edges;

    const lineAngle = Math.atan2(dy, dx);
    const normalX = -dy / lineLen;
    const normalY = dx / lineLen;
    const lineMidNorm = { x: (lineStart.x + lineEnd.x) / 2, y: (lineStart.y + lineEnd.y) / 2 };
    const lineMidScreen = toScreen(lineMidNorm);

    // Collect all edges: lot edges + parent parcel edges
    const allEdges: { p1: Point2D; p2: Point2D }[] = [];
    lots.forEach(lot => {
      lot.vertices.forEach((v, i) => {
        const next = lot.vertices[(i + 1) % lot.vertices.length];
        allEdges.push({ p1: v, p2: next });
      });
    });
    if (parentVertices && parentVertices.length >= 3) {
      parentVertices.forEach((v, i) => {
        const next = parentVertices[(i + 1) % parentVertices.length];
        allEdges.push({ p1: v, p2: next });
      });
    }

    const ANGLE_TOLERANCE = 15 * (Math.PI / 180);

    allEdges.forEach(edge => {
      const edx = edge.p2.x - edge.p1.x;
      const edy = edge.p2.y - edge.p1.y;
      const edgeLen = Math.sqrt(edx * edx + edy * edy);
      if (edgeLen < 0.001) return;

      const edgeAngle = Math.atan2(edy, edx);
      let angleDiff = Math.abs(edgeAngle - lineAngle);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
      if (angleDiff > Math.PI / 2) angleDiff = Math.PI - angleDiff;

      if (angleDiff < ANGLE_TOLERANCE) {
        // Perpendicular distance from edge midpoint to the line
        const edgeMid = { x: (edge.p1.x + edge.p2.x) / 2, y: (edge.p1.y + edge.p2.y) / 2 };
        const distNorm = Math.abs((edgeMid.x - lineStart.x) * normalX + (edgeMid.y - lineStart.y) * normalY);
        if (distNorm < 0.005) return; // Too close (same edge)
        const distM = distNorm * sideLength;
        if (distM > sideLength) return; // Too far

        const edgeMidScreen = toScreen(edgeMid);
        edges.push({
          p1Screen: toScreen(edge.p1),
          p2Screen: toScreen(edge.p2),
          distM: Math.round(distM * 10) / 10,
          midScreen: edgeMidScreen,
          lineMidScreen,
        });
      }
    });

    // Deduplicate: keep only closest on each side of the line
    const above: typeof edges = [];
    const below: typeof edges = [];
    edges.forEach(e => {
      const edgeMidNorm = fromScreen(e.midScreen.x, e.midScreen.y);
      const side = (edgeMidNorm.x - lineStart.x) * normalX + (edgeMidNorm.y - lineStart.y) * normalY;
      if (side > 0) above.push(e);
      else below.push(e);
    });
    above.sort((a, b) => a.distM - b.distM);
    below.sort((a, b) => a.distM - b.distM);

    const result: typeof edges = [];
    if (above.length > 0) result.push(above[0]);
    if (below.length > 0) result.push(below[0]);
    return result;
  }, [lots, parentVertices, toScreen, fromScreen, sideLength]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    
    // Space + drag = pan
    if (viewport.isSpaceDown() || e.button === 1) {
      e.preventDefault();
      viewport.startPan(e.clientX, e.clientY);
      return;
    }
    // drawLine/drawRoad: simple drag mode
    if ((mode === 'drawLine' || mode === 'drawRoad') && e.button === 0 && !lineDrawMultiMode && lineDrawPoints.length === 0) {
      const pos = getSvgPos(e);
      const normalized = fromScreen(pos.x, pos.y);
      const snapped = drag.snapToGrid(normalized);
      setLineDrawPoints([snapped]);
      setIsLineDragging(true);
      return;
    }
  }, [readOnly, viewport, mode, lineDrawMultiMode, lineDrawPoints, getSvgPos, fromScreen, drag]);

  const handleVertexMouseDown = useCallback((lotId: string, vertexIdx: number, e: React.MouseEvent) => {
    if (readOnly || mode !== 'select') return;
    e.stopPropagation();
    drag.startVertexDrag(lotId, vertexIdx);
  }, [readOnly, mode, drag]);

  const handleEdgeMouseDown = useCallback((lotId: string, edgeIdx: number, e: React.MouseEvent) => {
    if (readOnly || mode !== 'select') return;
    e.stopPropagation();
    const pos = getSvgPos(e);
    const normalized = fromScreen(pos.x, pos.y);
    drag.startEdgeDrag(lotId, edgeIdx, normalized);
  }, [readOnly, mode, drag, getSvgPos, fromScreen]);

  const handlePolygonMouseDown = useCallback((lotId: string, e: React.MouseEvent) => {
    if (readOnly || mode !== 'select') return;
    if (lotId !== selectedLotId) return;
    e.stopPropagation();
    const pos = getSvgPos(e);
    const normalized = fromScreen(pos.x, pos.y);
    drag.startPolygonDrag(lotId, normalized);
  }, [readOnly, mode, selectedLotId, drag, getSvgPos, fromScreen]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;

    // Pan
    if (viewport.isPanning()) {
      viewport.movePan(e.clientX, e.clientY, scaleX, scaleY);
      return;
    }

    const pos = getSvgPos(e);

    // drawLine: update preview
    if (mode === 'drawLine') {
      if (isLineDragging && lineDrawPoints.length === 1) {
        setLineDrawMousePos({ x: pos.x, y: pos.y });
      } else if (lineDrawMultiMode && lineDrawPoints.length > 0) {
        setLineDrawMousePos({ x: pos.x, y: pos.y });
      }
    }

    // Rotation drag — HIGHEST PRIORITY — use SVG coords consistently + cumulative rotation
    if (rotationDrag) {
      const svgMouse = getSvgPos(e);
      const currentAngle = Math.atan2(
        svgMouse.y - rotationDrag.svgCenterY,
        svgMouse.x - rotationDrag.svgCenterX
      );
      const deltaAngle = currentAngle - rotationDrag.startAngle;
      const deltaDeg = Math.round((deltaAngle * 180) / Math.PI);
      setRotationAngleDisplay(deltaDeg);

      const theta = deltaAngle;
      const cx = rotationDrag.centerX;
      const cy = rotationDrag.centerY;
      const rotated = rotationDrag.originalVertices.map(v => ({
        x: cx + (v.x - cx) * Math.cos(theta) - (v.y - cy) * Math.sin(theta),
        y: cy + (v.x - cx) * Math.sin(theta) + (v.y - cy) * Math.cos(theta),
      }));

      if (rotationDrag.targetType === 'lot') {
        onUpdateLot(rotationDrag.targetId, rotated);
      } else if (onUpdateRoad) {
        onUpdateRoad(rotationDrag.targetId, { path: rotated });
      }
      return;
    }

    // Road endpoint drag
    if (roadEndpointDrag && onUpdateRoad) {
      const normalized = fromScreen(pos.x, pos.y);
      const snapped = drag.snapToGrid(normalized);
      const road = roads.find(r => r.id === roadEndpointDrag.roadId);
      if (road) {
        const newPath = [...road.path];
        newPath[roadEndpointDrag.pointIdx] = snapped;
        onUpdateRoad(roadEndpointDrag.roadId, { path: newPath });
      }
      return;
    }

    // Road width drag
    if (roadWidthDrag && onUpdateRoad) {
      const road = roads.find(r => r.id === roadWidthDrag.roadId);
      if (road && road.path.length >= 2) {
        const p0 = toScreen(road.path[0]);
        const p1 = toScreen(road.path[road.path.length - 1]);
        const rdx = p1.x - p0.x;
        const rdy = p1.y - p0.y;
        const rlen = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
        const nx = -rdy / rlen;
        const ny = rdx / rlen;
        const deltaPx = (pos.x - roadWidthDrag.startY) * nx + (pos.y - roadWidthDrag.startY) * ny;
        const svg = svgRef.current;
        if (svg) {
          const rect = svg.getBoundingClientRect();
          const scaleY = (CANVAS_H / viewport.viewport.zoom) / rect.height;
          const mouseScreenY = e.clientY;
          const deltaScreenPx = mouseScreenY - roadWidthDrag.startY;
          const deltaNorm = Math.abs(deltaScreenPx * scaleY) / (CANVAS_H - 2 * PADDING);
          const deltaM = deltaNorm * sideLength;
          const sign = deltaScreenPx > 0 ? 1 : -1;
          const newWidth = Math.max(2, Math.min(30, roadWidthDrag.startWidth + sign * deltaM * 2));
          onUpdateRoad(roadWidthDrag.roadId, { widthM: Math.round(newWidth * 2) / 2 });
        }
      }
      return;
    }

    if (drag.isDragging) {
      const normalized = fromScreen(pos.x, pos.y);
      drag.moveDrag(normalized);
    }
  }, [viewport, getSvgPos, fromScreen, mode, lineDrawPoints, drag, isLineDragging, lineDrawMultiMode, roadEndpointDrag, roads, onUpdateRoad, roadWidthDrag, toScreen, sideLength, rotationDrag, selectedLotId, selectedRoadId, lots, onUpdateLot]);

  // Directly execute action after line drawing finishes
  const finishLineDraw = useCallback((path: Point2D[]) => {
    if (path.length < 2) return;
    if (mode === 'drawRoad') {
      onFinishRoadDraw?.(path);
    } else {
      // drawLine mode: cut lot
      const cutStart = path[0];
      const cutEnd = path[path.length - 1];
      const mid = { x: (cutStart.x + cutEnd.x) / 2, y: (cutStart.y + cutEnd.y) / 2 };
      const targetLot = lots.find(lot => pointInPolygon(mid, lot.vertices));
      if (targetLot && onCutLot) {
        onCutLot(targetLot.id, cutStart, cutEnd);
      }
    }
  }, [mode, onFinishRoadDraw, onCutLot, lots]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // Line simple drag: finish on mouse up
    if (isLineDragging && lineDrawPoints.length === 1 && lineDrawMousePos) {
      const pos = getSvgPos(e);
      const normalized = fromScreen(pos.x, pos.y);
      const snapped = drag.snapToGrid(normalized);
      const startPt = lineDrawPoints[0];
      const dist = Math.sqrt((snapped.x - startPt.x) ** 2 + (snapped.y - startPt.y) ** 2);
      if (dist > 0.02) {
        finishLineDraw([startPt, snapped]);
      }
      setLineDrawPoints([]);
      setLineDrawMousePos(null);
      setIsLineDragging(false);
    }
    // Road endpoint drag end
    if (roadEndpointDrag) {
      setRoadEndpointDrag(null);
    }
    // Road width drag end
    if (roadWidthDrag) {
      setRoadWidthDrag(null);
    }
    // Rotation drag end
    if (rotationDrag) {
      setRotationDrag(null);
      setRotationAngleDisplay(null);
    }
    drag.endDrag();
    viewport.endPan();
  }, [drag, viewport, isLineDragging, lineDrawPoints, lineDrawMousePos, getSvgPos, fromScreen, finishLineDraw, roadEndpointDrag, roadWidthDrag, rotationDrag]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    if (drag.isDragging) return;
    
    const pos = getSvgPos(e);
    const normalized = fromScreen(pos.x, pos.y);

    if (mode === 'drawLine' || mode === 'drawRoad') {
      if (isLineDragging) return;
      // Shift-click or already in multi-mode: add point
      if (e.shiftKey || lineDrawMultiMode) {
        if (!lineDrawMultiMode) setLineDrawMultiMode(true);
        const snapped = drag.snapToGrid(normalized);
        setLineDrawPoints(prev => [...prev, snapped]);
      }
      return;
    }

    if (mode === 'clipart' && clipartType) {
      const targetLot = lots.find(lot => pointInPolygon(normalized, lot.vertices));
      if (targetLot && onUpdateLotAnnotations) {
        const newAnnotation: LotAnnotation = {
          id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: clipartType,
          position: { x: normalized.x, y: normalized.y },
        };
        const existing = targetLot.annotations || [];
        onUpdateLotAnnotations(targetLot.id, [...existing, newAnnotation]);
      }
      return;
    }

    if (mode === 'select') {
      onSelectLot(null);
      onSelectRoad?.(null);
      setContextMenuLotId(null);
      setEdgeContextMenu(null);
    }
    if (mode === 'selectEdge') {
      setEdgeContextMenu(null);
    }
  }, [readOnly, mode, getSvgPos, fromScreen, lots, onSelectLot, onSelectRoad, clipartType, onUpdateLotAnnotations, drag, isLineDragging, lineDrawMultiMode]);

  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((mode === 'drawLine' || mode === 'drawRoad') && lineDrawPoints.length >= 2) {
      e.preventDefault();
      e.stopPropagation();
      finishLineDraw(lineDrawPoints);
      setLineDrawPoints([]);
      setLineDrawMousePos(null);
      setLineDrawMultiMode(false);
      return;
    }
    if (mode === 'select') {
      viewport.resetView();
    }
  }, [mode, lineDrawPoints, finishLineDraw, viewport]);

  const handleLotClick = useCallback((lotId: string, e: React.MouseEvent) => {
    if (mode === 'clipart') return;
    if (mode !== 'select') return;
    e.stopPropagation();
    if ((e.ctrlKey || e.metaKey) && onToggleLotSelection) {
      onToggleLotSelection(lotId);
      setContextMenuLotId(null);
      return;
    }
    onSelectLot(lotId === selectedLotId ? null : lotId);
    onSelectRoad?.(null);
    setContextMenuLotId(null);
  }, [selectedLotId, onSelectLot, onSelectRoad, onToggleLotSelection, mode]);

  const handleLotDoubleClick = useCallback((lotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly || mode !== 'select') return;
    onSelectLot(lotId);
    setContextMenuLotId(lotId);
  }, [readOnly, onSelectLot, mode]);

  const handleLotContextMenu = useCallback((lotId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (readOnly) return;
    onSelectLot(lotId);
    setContextMenuLotId(lotId);
  }, [readOnly, onSelectLot]);

  const handleRoadClick = useCallback((roadId: string, e: React.MouseEvent) => {
    if (mode !== 'select') return;
    e.stopPropagation();
    onSelectRoad?.(roadId === selectedRoadId ? null : roadId);
    onSelectLot(null);
    setContextMenuLotId(null);
  }, [selectedRoadId, onSelectRoad, onSelectLot, mode]);

  const getDimensionLabel = (p1: Point2D, p2: Point2D): string => {
    const dx = Math.abs(p2.x - p1.x) * sideLength;
    const dy = Math.abs(p2.y - p1.y) * sideLength;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return `${Math.round(dist)}m`;
  };

  const svgCursor = viewport.isSpaceDown()
    ? 'grab'
    : mode === 'drawLine' ? 'crosshair'
    : mode === 'clipart' ? 'cell'
    : mode === 'selectEdge' ? 'pointer'
    : 'default';

  const tooSmallLotIds = useMemo(() => {
    return new Set(lots.filter(l => l.areaSqm < minLotAreaSqm).map(l => l.id));
  }, [lots, minLotAreaSqm]);

  // Compute parallel distance lines for current drawing
  const distanceLines = useMemo(() => {
    if (mode !== 'drawLine') return [];
    let start: Point2D | null = null;
    let end: Point2D | null = null;

    if (lineDrawPoints.length >= 2) {
      start = lineDrawPoints[0];
      end = lineDrawPoints[lineDrawPoints.length - 1];
    } else if (lineDrawPoints.length === 1 && lineDrawMousePos) {
      start = lineDrawPoints[0];
      end = fromScreen(lineDrawMousePos.x, lineDrawMousePos.y);
    }

    if (!start || !end) return [];
    return getParallelEdges(start, end);
  }, [mode, lineDrawPoints, lineDrawMousePos, getParallelEdges, fromScreen]);

  return (
    <div ref={containerRef} className="relative" tabIndex={-1}>
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button onClick={viewport.zoomIn} className="h-7 w-7 rounded-md bg-background/90 border shadow-sm flex items-center justify-center hover:bg-muted transition-colors" title="Zoom +">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button onClick={viewport.zoomOut} className="h-7 w-7 rounded-md bg-background/90 border shadow-sm flex items-center justify-center hover:bg-muted transition-colors" title="Zoom -">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button onClick={viewport.resetView} className="h-7 w-7 rounded-md bg-background/90 border shadow-sm flex items-center justify-center hover:bg-muted transition-colors" title="Reset vue">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setSnapEnabled(!snapEnabled)} className={`h-7 w-7 rounded-md border shadow-sm flex items-center justify-center transition-colors ${snapEnabled ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-background/90 hover:bg-muted'}`} title={snapEnabled ? 'Snap activé' : 'Snap désactivé'}>
          <Magnet className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Clipart palette */}
      {showClipartPalette && (
        <ClipartPalette
          selectedType={clipartType}
          onSelect={(type) => {
            setClipartType(type);
            onModeChange?.('clipart');
          }}
          onClose={() => {
            setShowClipartPalette(false);
            setClipartType(null);
            onModeChange?.('select');
          }}
        />
      )}

      <svg
        ref={svgRef}
        viewBox={viewport.viewBox}
        className="w-full h-auto bg-white dark:bg-gray-950 rounded-lg"
        style={{ minHeight: 280, cursor: svgCursor }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDoubleClick}
        onWheel={viewport.handleWheel}
        onContextMenu={e => e.preventDefault()}
      >
        {/* Grid */}
        {showGrid && (
          <g opacity={0.1}>
            {Array.from({ length: 21 }, (_, i) => {
              const x = PADDING + (i / 20) * (CANVAS_W - 2 * PADDING);
              const y = PADDING + (i / 20) * (CANVAS_H - 2 * PADDING);
              return (
                <React.Fragment key={i}>
                  <line x1={x} y1={PADDING} x2={x} y2={CANVAS_H - PADDING} stroke="currentColor" strokeWidth={0.5} />
                  {i <= 13 && <line x1={PADDING} y1={y} x2={CANVAS_W - PADDING} y2={y} stroke="currentColor" strokeWidth={0.5} />}
                </React.Fragment>
              );
            })}
          </g>
        )}

        {/* Parent parcel outline */}
        {parentVertices && parentVertices.length >= 3 ? (
          <polygon
            points={parentVertices.map(v => { const s = toScreen(v); return `${s.x},${s.y}`; }).join(' ')}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeDasharray="6 3"
            opacity={0.5}
          />
        ) : (
          <rect
            x={PADDING} y={PADDING}
            width={CANVAS_W - 2 * PADDING} height={CANVAS_H - 2 * PADDING}
            fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="6 3" opacity={0.5}
          />
        )}

        {/* Parent parcel side measurements */}
        {parentVertices && parentVertices.length >= 3 && (
          <g>
            {parentVertices.map((v, i) => {
              const next = parentVertices[(i + 1) % parentVertices.length];
              const sv = toScreen(v);
              const sn = toScreen(next);
              const mx = (sv.x + sn.x) / 2;
              const my = (sv.y + sn.y) / 2;

              let label = '';
              if (parentSides && parentSides[i] && parentSides[i].length) {
                const len = parseFloat(String(parentSides[i].length));
                label = `${len.toFixed(1)}m`;
              } else {
                const dx = Math.abs(next.x - v.x) * sideLength;
                const dy = Math.abs(next.y - v.y) * sideLength;
                label = `${Math.round(Math.sqrt(dx * dx + dy * dy))}m`;
              }

              const orientationLabel = parentSides?.[i]?.orientation || '';
              const edgeDx = sn.y - sv.y;
              const edgeDy = sv.x - sn.x;
              const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy) || 1;
              const offsetX = (edgeDx / edgeLen) * 16;
              const offsetY = (edgeDy / edgeLen) * 16;

              return (
                <g key={`parent-dim-${i}`}>
                  <rect
                    x={mx + offsetX - 22} y={my + offsetY - 8}
                    width={44} height={orientationLabel ? 22 : 14} rx={3}
                    fill="hsl(var(--background))" fillOpacity={0.85}
                    stroke="hsl(var(--primary))" strokeWidth={0.5} strokeOpacity={0.4}
                  />
                  <text x={mx + offsetX} y={my + offsetY + (orientationLabel ? -1 : 2)}
                    textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight="bold"
                    fill="hsl(var(--primary))" className="select-none pointer-events-none">{label}</text>
                  {orientationLabel && (
                    <text x={mx + offsetX} y={my + offsetY + 10}
                      textAnchor="middle" dominantBaseline="middle" fontSize={7}
                      fill="hsl(var(--muted-foreground))" className="select-none pointer-events-none">{orientationLabel}</text>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* Roads — polygon rendering with clear borders */}
        {showRoads && [...roads].sort((a, b) => (a.id === selectedRoadId ? 1 : 0) - (b.id === selectedRoadId ? 1 : 0)).map(road => {
          if (road.path.length < 2) return null;
          const pathPoints = road.path.map(p => toScreen(p));
          const polylineStr = pathPoints.map(p => `${p.x},${p.y}`).join(' ');
          const roadWidthPx = Math.max(4, (road.widthM / sideLength) * (CANVAS_W - 2 * PADDING));
          const isExisting = (road as any).isExisting;
          const isRoadSelected = road.id === selectedRoadId;

          // Build road polygon (rectangle) from first and last path points
          const p0 = pathPoints[0];
          const pN = pathPoints[pathPoints.length - 1];
          const rdx = pN.x - p0.x;
          const rdy = pN.y - p0.y;
          const rlen = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
          const nx = -rdy / rlen; // normal x
          const ny = rdx / rlen;  // normal y
          const halfW = roadWidthPx / 2;

          // Four corners of the road footprint
          const TL = { x: p0.x + nx * halfW, y: p0.y + ny * halfW };
          const TR = { x: pN.x + nx * halfW, y: pN.y + ny * halfW };
          const BR = { x: pN.x - nx * halfW, y: pN.y - ny * halfW };
          const BL = { x: p0.x - nx * halfW, y: p0.y - ny * halfW };

          const polygonStr = `${TL.x},${TL.y} ${TR.x},${TR.y} ${BR.x},${BR.y} ${BL.x},${BL.y}`;
          const borderColorBase = isRoadSelected ? 'hsl(var(--primary))' : isExisting ? '#92400e' : '#6b7280';
          const fillColor = isRoadSelected ? 'hsl(var(--primary))' : isExisting ? '#d4a574' : '#e5e7eb';
          
          return (
            <g key={road.id}>
              {/* Invisible wide hit area for click */}
              <polyline
                points={polylineStr}
                fill="none" stroke="transparent" strokeWidth={Math.max(20, roadWidthPx + 10)}
                strokeLinecap="round" strokeLinejoin="round"
                className={readOnly || mode !== 'select' ? '' : 'cursor-pointer'}
                onClick={e => !readOnly && handleRoadClick(road.id, e)}
              />
              {/* Road fill polygon */}
              <polygon
                points={polygonStr}
                fill={fillColor}
                fillOpacity={isRoadSelected ? 0.2 : isExisting ? 0.2 : 0.12}
                stroke="none"
                className={readOnly || mode !== 'select' ? 'pointer-events-none' : 'cursor-pointer'}
                onClick={e => !readOnly && handleRoadClick(road.id, e)}
              />
              {/* Left border line (TL → TR) */}
              <line
                x1={TL.x} y1={TL.y} x2={TR.x} y2={TR.y}
                stroke={borderColorBase}
                strokeWidth={isRoadSelected ? 2 : 1.5}
                strokeDasharray={isExisting ? 'none' : '6 3'}
                opacity={isRoadSelected ? 0.9 : isExisting ? 0.7 : 0.6}
                className="pointer-events-none"
              />
              {/* Right border line (BL → BR) */}
              <line
                x1={BL.x} y1={BL.y} x2={BR.x} y2={BR.y}
                stroke={borderColorBase}
                strokeWidth={isRoadSelected ? 2 : 1.5}
                strokeDasharray={isExisting ? 'none' : '6 3'}
                opacity={isRoadSelected ? 0.9 : isExisting ? 0.7 : 0.6}
                className="pointer-events-none"
              />
              {/* Selection glow */}
              {isRoadSelected && (
                <polygon
                  points={polygonStr}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  opacity={0.3} className="pointer-events-none"
                />
              )}
              {/* Road label: name along axis + width perpendicular */}
              {(() => {
                const mx = (p0.x + pN.x) / 2;
                const my = (p0.y + pN.y) / 2;
                // Angle of road axis in degrees
                let axisAngleDeg = Math.atan2(rdy, rdx) * (180 / Math.PI);
                // Keep text readable (not upside down)
                if (axisAngleDeg > 90) axisAngleDeg -= 180;
                if (axisAngleDeg < -90) axisAngleDeg += 180;
                // Perpendicular angle for width label
                const perpAngleDeg = axisAngleDeg + 90;

                return (
                  <g className="pointer-events-none select-none">
                    {/* Road name along the axis */}
                    <text
                      x={mx} y={my - 5}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={6.5}
                      fontWeight={isRoadSelected || isExisting ? 'bold' : 'normal'}
                      fill={isRoadSelected ? 'hsl(var(--primary))' : isExisting ? '#92400e' : '#6b7280'}
                      transform={`rotate(${axisAngleDeg}, ${mx}, ${my - 5})`}
                    >
                      {road.name}
                    </text>
                    {/* Width measurement perpendicular */}
                    <text
                      x={mx} y={my + 5}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={7} fontWeight="bold"
                      fill={isRoadSelected ? 'hsl(var(--primary))' : isExisting ? '#92400e' : '#4b5563'}
                      transform={`rotate(${perpAngleDeg}, ${mx}, ${my + 5})`}
                    >
                      {road.widthM}m
                    </text>
                  </g>
                );
              })()}
              {/* Draggable endpoint handles */}
              {isRoadSelected && !readOnly && mode === 'select' && pathPoints.map((pt, idx) => (
                <circle
                  key={`road-handle-${idx}`}
                  cx={pt.x} cy={pt.y} r={5}
                  fill="white" stroke="hsl(var(--primary))" strokeWidth={2}
                  className="cursor-grab active:cursor-grabbing"
                  onMouseDown={e => {
                    e.stopPropagation();
                    setRoadEndpointDrag({ roadId: road.id, pointIdx: idx });
                  }}
                />
              ))}
              {/* Width drag handles (perpendicular to road at midpoint) */}
              {isRoadSelected && !readOnly && mode === 'select' && (() => {
                const midIdx = Math.floor(pathPoints.length / 2);
                const p1 = pathPoints[Math.max(0, midIdx - 1)];
                const p2 = pathPoints[Math.min(pathPoints.length - 1, midIdx)];
                const mx = (p1.x + p2.x) / 2;
                const my = (p1.y + p2.y) / 2;
                const rdx = p2.x - p1.x;
                const rdy = p2.y - p1.y;
                const rlen = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
                // Normal (perpendicular) direction
                const nx = -rdy / rlen;
                const ny = rdx / rlen;
                const halfW = roadWidthPx / 2;
                const handleSize = 6;
                return (
                  <>
                    {/* Top handle */}
                    <rect
                      x={mx + nx * halfW - handleSize / 2}
                      y={my + ny * halfW - handleSize / 2}
                      width={handleSize} height={handleSize} rx={1.5}
                      fill="white" stroke="hsl(var(--primary))" strokeWidth={2}
                      className="cursor-ns-resize"
                      onMouseDown={e => {
                        e.stopPropagation();
                        setRoadWidthDrag({ roadId: road.id, startY: e.clientY, startWidth: road.widthM });
                      }}
                    />
                    {/* Bottom handle */}
                    <rect
                      x={mx - nx * halfW - handleSize / 2}
                      y={my - ny * halfW - handleSize / 2}
                      width={handleSize} height={handleSize} rx={1.5}
                      fill="white" stroke="hsl(var(--primary))" strokeWidth={2}
                      className="cursor-ns-resize"
                      onMouseDown={e => {
                        e.stopPropagation();
                        setRoadWidthDrag({ roadId: road.id, startY: e.clientY, startWidth: road.widthM });
                      }}
                    />
                  </>
                );
              })()}
              {/* Delete button on selected road */}
              {isRoadSelected && !isExisting && !readOnly && onDeleteRoad && (() => {
                const mx = (pathPoints[0].x + pathPoints[pathPoints.length - 1].x) / 2;
                const my = (pathPoints[0].y + pathPoints[pathPoints.length - 1].y) / 2;
                const dx = pathPoints[pathPoints.length - 1].y - pathPoints[0].y;
                const dy = pathPoints[0].x - pathPoints[pathPoints.length - 1].x;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const off = Math.max(roadWidthPx / 2 + 14, 22);
                const ox = -(dx / len) * off;
                const oy = -(dy / len) * off;
                return (
                  <g className="cursor-pointer" onClick={e => { e.stopPropagation(); onDeleteRoad(road.id); }}>
                    <circle cx={mx + ox} cy={my + oy} r={10} fill="hsl(var(--destructive))" fillOpacity={0.9} />
                    <text x={mx + ox} y={my + oy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="white" fontWeight="bold" className="pointer-events-none select-none">✕</text>
                  </g>
                );
              })()}
              {/* Rotation ring for selected road */}
              {isRoadSelected && !readOnly && mode === 'select' && (() => {
                const allPts = pathPoints;
                const rcx = allPts.reduce((s, p) => s + p.x, 0) / allPts.length;
                const rcy = allPts.reduce((s, p) => s + p.y, 0) / allPts.length;
                const minX = Math.min(...allPts.map(p => p.x));
                const maxX = Math.max(...allPts.map(p => p.x));
                const minY = Math.min(...allPts.map(p => p.y));
                const maxY = Math.max(...allPts.map(p => p.y));
                const bboxW = maxX - minX;
                const bboxH = maxY - minY;
                const ringRadius = Math.max(bboxW, bboxH) / 2 + 20;
                const handleX = rcx;
                const handleY = rcy - ringRadius;
                const startRotationRoad = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const svgMouse = getSvgPos(e);
                  const normCx = road.path.reduce((s, p) => s + p.x, 0) / road.path.length;
                  const normCy = road.path.reduce((s, p) => s + p.y, 0) / road.path.length;
                  const angle = Math.atan2(svgMouse.y - rcy, svgMouse.x - rcx);
                  setRotationDrag({ startAngle: angle, centerX: normCx, centerY: normCy, svgCenterX: rcx, svgCenterY: rcy, originalVertices: [...road.path], targetType: 'road', targetId: road.id });
                  setRotationAngleDisplay(0);
                };
                return (
                  <g>
                    {/* Rotation ring */}
                    <circle cx={rcx} cy={rcy} r={ringRadius}
                      fill="none" stroke="hsl(var(--primary))" strokeWidth={2}
                      strokeDasharray="4 3" opacity={0.3}
                      className="pointer-events-none" />
                    {/* Invisible thick ring for easier grab */}
                    <circle cx={rcx} cy={rcy} r={ringRadius}
                      fill="none" stroke="transparent" strokeWidth={14}
                      className="cursor-grab active:cursor-grabbing"
                      onMouseDown={startRotationRoad} />
                    {/* Guide line center → handle */}
                    <line x1={rcx} y1={rcy} x2={handleX} y2={handleY}
                      stroke="hsl(var(--primary))" strokeWidth={1} strokeDasharray="3 2" opacity={0.3}
                      className="pointer-events-none" />
                    {/* Handle on ring */}
                    <circle cx={handleX} cy={handleY} r={10}
                      fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth={2.5}
                      className="cursor-grab active:cursor-grabbing"
                      onMouseDown={startRotationRoad} />
                    <text x={handleX} y={handleY + 1} textAnchor="middle" dominantBaseline="middle"
                      fontSize={12} fill="hsl(var(--primary))" fontWeight="bold"
                      className="pointer-events-none select-none">↻</text>
                    {/* Angle display */}
                    {rotationAngleDisplay !== null && rotationDrag && rotationDrag.targetId === road.id && (
                      <g>
                        <rect x={rcx - 18} y={rcy - 8} width={36} height={16} rx={4}
                          fill="hsl(var(--primary))" fillOpacity={0.15} />
                        <text x={rcx} y={rcy} textAnchor="middle" dominantBaseline="middle"
                          fontSize={10} fill="hsl(var(--primary))" fontWeight="700"
                          className="pointer-events-none select-none">
                          {rotationAngleDisplay > 0 ? '+' : ''}{rotationAngleDisplay}°
                        </text>
                      </g>
                    )}
                  </g>
                );
              })()}
            </g>
          );
        })}

        {/* Lots */}
        {[...lots].sort((a, b) => {
          const aS = a.id === selectedLotId || selectedLotIds.includes(a.id) ? 1 : 0;
          const bS = b.id === selectedLotId || selectedLotIds.includes(b.id) ? 1 : 0;
          return aS - bS;
        }).map(lot => {
          const screenVertices = lot.vertices.map(v => toScreen(v));
          const pointsStr = screenVertices.map(p => `${p.x},${p.y}`).join(' ');
          const isSelected = lot.id === selectedLotId;
          const isMultiSelected = selectedLotIds.includes(lot.id);
          const color = lot.color || LOT_COLORS[lot.intendedUse];
          const isTooSmall = tooSmallLotIds.has(lot.id);

          const cx = screenVertices.reduce((s, p) => s + p.x, 0) / screenVertices.length;
          const cy = screenVertices.reduce((s, p) => s + p.y, 0) / screenVertices.length;

          return (
            <g key={lot.id}>
              <polygon
                points={pointsStr}
                fill={isMultiSelected ? 'hsl(var(--primary))' : color}
                fillOpacity={isMultiSelected ? 0.3 : isSelected ? 0.35 : 0.2}
                stroke={isTooSmall ? 'hsl(var(--destructive))' : isMultiSelected ? 'hsl(var(--primary))' : isSelected ? 'hsl(var(--primary))' : color}
                strokeWidth={isTooSmall ? 2.5 : isMultiSelected ? 2.5 : isSelected ? 2.5 : 1.5}
                strokeDasharray={isTooSmall ? '4 2' : isMultiSelected ? '4 2' : 'none'}
                className={readOnly ? '' : mode === 'select' ? (isSelected ? 'cursor-move' : 'cursor-pointer') : 'cursor-crosshair'}
                onClick={e => handleLotClick(lot.id, e)}
                onDoubleClick={e => handleLotDoubleClick(lot.id, e)}
                onContextMenu={e => handleLotContextMenu(lot.id, e)}
                onMouseDown={e => {
                  if (isSelected && mode === 'select' && !readOnly) {
                    handlePolygonMouseDown(lot.id, e);
                  }
                }}
              />

              {isTooSmall && (
                <text x={cx} y={cy - 20} textAnchor="middle" dominantBaseline="middle" fontSize={8}
                  fill="hsl(var(--destructive))" fontWeight="bold" className="select-none pointer-events-none">
                  ⚠ &lt; {minLotAreaSqm}m²
                </text>
              )}

              {isMultiSelected && (
                <g className="pointer-events-none select-none">
                  <circle cx={cx + 30} cy={cy - 20} r={8} fill="hsl(var(--primary))" fillOpacity={0.9} />
                  <text x={cx + 30} y={cy - 19} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="white" fontWeight="bold">✓</text>
                </g>
              )}

              {showLotNumbers && (
                <text x={cx} y={cy - (showAreas ? 6 : 0)} textAnchor="middle" dominantBaseline="middle"
                  fontSize={14} fontWeight="bold" fill={color} className="select-none pointer-events-none">
                  {lot.lotNumber}
                </text>
              )}

              {showAreas && (
                <text x={cx} y={cy + (showLotNumbers ? 10 : 0)} textAnchor="middle" dominantBaseline="middle"
                  fontSize={9} fill="#666" className="select-none pointer-events-none">
                  {lot.areaSqm.toLocaleString()} m²
                </text>
              )}

              {showOwnerNames && lot.ownerName && (
                <text x={cx} y={cy + 22} textAnchor="middle" dominantBaseline="middle"
                  fontSize={7} fill="#888" className="select-none pointer-events-none">
                  {lot.ownerName}
                </text>
              )}

              {lot.notes?.includes('route existante') && (
                <g className="select-none pointer-events-none">
                  <rect x={cx - 28} y={cy + (showAreas ? 18 : 10)} width={56} height={12} rx={2}
                    fill="#92400e" fillOpacity={0.15} stroke="#92400e" strokeWidth={0.5} strokeOpacity={0.4} />
                  <text x={cx} y={cy + (showAreas ? 24 : 16)} textAnchor="middle" dominantBaseline="middle"
                    fontSize={6} fill="#92400e" fontWeight="600">🛣 Route existante</text>
                </g>
              )}

              {/* Annotations / cliparts */}
              {lot.annotations?.map(ann => {
                const sp = toScreen(ann.position);
                const clipart = CLIPART_TYPES.find(c => c.type === ann.type);
                return (
                  <text key={ann.id} x={sp.x} y={sp.y} textAnchor="middle" dominantBaseline="middle"
                    fontSize={ann.scale ? 14 * ann.scale : 14}
                    className="select-none pointer-events-none">
                    {clipart?.emoji || '📍'}
                  </text>
                );
              })}

              {/* Edge hit targets */}
              {!readOnly && (mode === 'select' || mode === 'selectEdge') && lot.vertices.map((v, i) => {
                const next = lot.vertices[(i + 1) % lot.vertices.length];
                const sv = toScreen(v);
                const sn = toScreen(next);
                const isEdgeHovered = hoveredEdge && hoveredEdge.lotId1 === lot.id && hoveredEdge.edgeIdx1 === i;
                const isSharedEdge = sharedEdges.some(se =>
                  (se.lotId1 === lot.id && se.edgeIdx1 === i) ||
                  (se.lotId2 === lot.id && se.edgeIdx2 === i)
                );

                if (mode === 'selectEdge') {
                  // In selectEdge mode, highlight edges on hover
                  return (
                    <g key={`edge-hit-${i}`}>
                      {isEdgeHovered && (
                        <line x1={sv.x} y1={sv.y} x2={sn.x} y2={sn.y}
                          stroke={isSharedEdge ? 'hsl(var(--primary))' : 'hsl(var(--accent-foreground))'}
                          strokeWidth={6} strokeLinecap="round" opacity={0.4}
                          className="pointer-events-none" />
                      )}
                      <line x1={sv.x} y1={sv.y} x2={sn.x} y2={sn.y}
                        stroke="rgba(0,0,0,0.001)" strokeWidth={16} strokeLinecap="round"
                        pointerEvents="stroke" style={{ cursor: 'pointer' }}
                        onMouseEnter={() => {
                          const shared = sharedEdges.find(se =>
                            (se.lotId1 === lot.id && se.edgeIdx1 === i) ||
                            (se.lotId2 === lot.id && se.edgeIdx2 === i)
                          );
                          if (shared) {
                            setHoveredEdge(shared);
                          } else {
                            setHoveredEdge({ lotId1: lot.id, edgeIdx1: i, p1: v, p2: next, isShared: false });
                          }
                        }}
                        onMouseLeave={() => setHoveredEdge(null)}
                        onClick={e => {
                          e.stopPropagation();
                          const shared = sharedEdges.find(se =>
                            (se.lotId1 === lot.id && se.edgeIdx1 === i) ||
                            (se.lotId2 === lot.id && se.edgeIdx2 === i)
                          );
                          const edge = shared || { lotId1: lot.id, edgeIdx1: i, p1: v, p2: next, isShared: false };
                          onConvertEdgeToRoad?.(edge);
                          onModeChange?.('select');
                          setHoveredEdge(null);
                        }}
                      />
                    </g>
                  );
                }

                // Normal select mode
                const angle = Math.atan2(sn.y - sv.y, sn.x - sv.x) * (180 / Math.PI);
                const normalizedAngle = ((angle % 180) + 180) % 180;
                let cursorStyle = 'ew-resize';
                if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) cursorStyle = 'nwse-resize';
                else if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) cursorStyle = 'ns-resize';
                else if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) cursorStyle = 'nesw-resize';
                return (
                  <line
                    key={`edge-hit-${i}`}
                    x1={sv.x} y1={sv.y} x2={sn.x} y2={sn.y}
                    stroke="rgba(0,0,0,0.001)" strokeWidth={14} strokeLinecap="round"
                    pointerEvents="stroke" style={{ cursor: cursorStyle }}
                    onMouseDown={e => handleEdgeMouseDown(lot.id, i, e)}
                    onContextMenu={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (readOnly) return;
                      const shared = sharedEdges.find(se =>
                        (se.lotId1 === lot.id && se.edgeIdx1 === i) ||
                        (se.lotId2 === lot.id && se.edgeIdx2 === i)
                      );
                      const edge = shared || { lotId1: lot.id, edgeIdx1: i, p1: v, p2: next, isShared: false };
                      const midScreen = {
                        x: (sv.x + sn.x) / 2,
                        y: (sv.y + sn.y) / 2,
                      };
                      setEdgeContextMenu({ edge, screenPos: midScreen });
                      setContextMenuLotId(null);
                    }}
                  />
                );
              })}

              {/* Dimensions on edges */}
              {showDimensions && lot.vertices.map((v, i) => {
                const next = lot.vertices[(i + 1) % lot.vertices.length];
                const sv = toScreen(v);
                const sn = toScreen(next);
                const mx = (sv.x + sn.x) / 2;
                const my = (sv.y + sn.y) / 2;
                const label = getDimensionLabel(v, next);
                const dx = sn.y - sv.y;
                const dy = sv.x - sn.x;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const offsetX = (dx / len) * 10;
                const offsetY = (dy / len) * 10;
                return (
                  <text key={i} x={mx + offsetX} y={my + offsetY}
                    textAnchor="middle" dominantBaseline="middle" fontSize={7} fill="#999"
                    className="select-none pointer-events-none">{label}</text>
                );
              })}

              {/* Draggable vertices */}
              {!readOnly && mode === 'select' && isSelected && screenVertices.map((sv, i) => (
                <circle
                  key={i} cx={sv.x} cy={sv.y} r={5}
                  fill="white" stroke="hsl(var(--primary))" strokeWidth={2}
                  className="cursor-grab active:cursor-grabbing"
                  onMouseDown={e => handleVertexMouseDown(lot.id, i, e)}
                />
              ))}

              {/* Rotation ring */}
              {!readOnly && mode === 'select' && isSelected && (() => {
                const minX = Math.min(...screenVertices.map(v => v.x));
                const maxX = Math.max(...screenVertices.map(v => v.x));
                const minY = Math.min(...screenVertices.map(v => v.y));
                const maxY = Math.max(...screenVertices.map(v => v.y));
                const bboxW = maxX - minX;
                const bboxH = maxY - minY;
                const ringRadius = Math.max(bboxW, bboxH) / 2 + 20;
                const handleX = cx;
                const handleY = cy - ringRadius;
                const startRotationLot = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const svgMouse = getSvgPos(e);
                  const normCx = lot.vertices.reduce((s, v) => s + v.x, 0) / lot.vertices.length;
                  const normCy = lot.vertices.reduce((s, v) => s + v.y, 0) / lot.vertices.length;
                  const angle = Math.atan2(svgMouse.y - cy, svgMouse.x - cx);
                  setRotationDrag({ startAngle: angle, centerX: normCx, centerY: normCy, svgCenterX: cx, svgCenterY: cy, originalVertices: [...lot.vertices], targetType: 'lot', targetId: lot.id });
                  setRotationAngleDisplay(0);
                };
                return (
                  <g>
                    {/* Rotation ring */}
                    <circle cx={cx} cy={cy} r={ringRadius}
                      fill="none" stroke="hsl(var(--primary))" strokeWidth={2}
                      strokeDasharray="4 3" opacity={0.3}
                      className="pointer-events-none" />
                    {/* Invisible thick ring for easier grab */}
                    <circle cx={cx} cy={cy} r={ringRadius}
                      fill="none" stroke="transparent" strokeWidth={14}
                      className="cursor-grab active:cursor-grabbing"
                      onMouseDown={startRotationLot} />
                    {/* Guide line center → handle */}
                    <line x1={cx} y1={cy} x2={handleX} y2={handleY}
                      stroke="hsl(var(--primary))" strokeWidth={1} strokeDasharray="3 2" opacity={0.3}
                      className="pointer-events-none" />
                    {/* Handle on ring */}
                    <circle cx={handleX} cy={handleY} r={10}
                      fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth={2.5}
                      className="cursor-grab active:cursor-grabbing"
                      onMouseDown={startRotationLot} />
                    <text x={handleX} y={handleY + 1} textAnchor="middle" dominantBaseline="middle"
                      fontSize={12} fill="hsl(var(--primary))" fontWeight="bold"
                      className="pointer-events-none select-none">↻</text>
                    {/* Angle display */}
                    {rotationAngleDisplay !== null && rotationDrag && rotationDrag.targetId === lot.id && (
                      <g>
                        <rect x={cx - 18} y={cy - 8} width={36} height={16} rx={4}
                          fill="hsl(var(--primary))" fillOpacity={0.15} />
                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                          fontSize={10} fill="hsl(var(--primary))" fontWeight="700"
                          className="pointer-events-none select-none">
                          {rotationAngleDisplay > 0 ? '+' : ''}{rotationAngleDisplay}°
                        </text>
                      </g>
                    )}
                  </g>
                );
              })()}

              {/* Context menu (floating toolbar) */}
              {contextMenuLotId === lot.id && !readOnly && mode === 'select' && (
                <g>
                  <rect x={cx - 72} y={cy - 45} width={144} height={28} rx={8}
                    fill="hsl(var(--background))" fillOpacity={0.95}
                    stroke="hsl(var(--border))" strokeWidth={1} />
                  {onSplitLot && (
                    <g className="cursor-pointer" onClick={e => { e.stopPropagation(); onSplitLot(lot.id); setContextMenuLotId(null); }}>
                      <rect x={cx - 68} y={cy - 42} width={24} height={22} rx={4} fill="transparent" />
                      <text x={cx - 56} y={cy - 31} textAnchor="middle" dominantBaseline="middle" fontSize={14} className="pointer-events-none select-none">✂️</text>
                    </g>
                  )}
                  {onDuplicateLot && (
                    <g className="cursor-pointer" onClick={e => { e.stopPropagation(); onDuplicateLot(lot.id); setContextMenuLotId(null); }}>
                      <rect x={cx - 40} y={cy - 42} width={24} height={22} rx={4} fill="transparent" />
                      <text x={cx - 28} y={cy - 31} textAnchor="middle" dominantBaseline="middle" fontSize={14} className="pointer-events-none select-none">📋</text>
                    </g>
                  )}
                  <g className="cursor-pointer" onClick={e => { e.stopPropagation(); setShowClipartPalette(true); setContextMenuLotId(null); onModeChange?.('clipart'); }}>
                    <rect x={cx - 12} y={cy - 42} width={24} height={22} rx={4} fill="transparent" />
                    <text x={cx} y={cy - 31} textAnchor="middle" dominantBaseline="middle" fontSize={14} className="pointer-events-none select-none">🎨</text>
                  </g>
                  {onConvertEdgeToRoad && (
                    <g className="cursor-pointer" onClick={e => {
                      e.stopPropagation();
                      setContextMenuLotId(null);
                      onModeChange?.('selectEdge');
                    }}>
                      <rect x={cx + 16} y={cy - 42} width={24} height={22} rx={4} fill="transparent" />
                      <text x={cx + 28} y={cy - 31} textAnchor="middle" dominantBaseline="middle" fontSize={14} className="pointer-events-none select-none">🛣</text>
                    </g>
                  )}
                  {onDeleteLot && (
                    <g className="cursor-pointer" onClick={e => { e.stopPropagation(); onDeleteLot(lot.id); setContextMenuLotId(null); }}>
                      <rect x={cx + 44} y={cy - 42} width={24} height={22} rx={4} fill="transparent" />
                      <text x={cx + 56} y={cy - 31} textAnchor="middle" dominantBaseline="middle" fontSize={14} className="pointer-events-none select-none">🗑️</text>
                    </g>
                  )}
                </g>
              )}
            </g>
          );
        })}

        {/* Merge button */}
        {selectedLotIds.length >= 2 && !readOnly && onMergeLots && mode === 'select' && (() => {
          const selectedLotsData = lots.filter(l => selectedLotIds.includes(l.id));
          const allCentroids = selectedLotsData.map(lot => {
            const sv = lot.vertices.map(v => toScreen(v));
            return { x: sv.reduce((s, p) => s + p.x, 0) / sv.length, y: sv.reduce((s, p) => s + p.y, 0) / sv.length };
          });
          const mcx = allCentroids.reduce((s, p) => s + p.x, 0) / allCentroids.length;
          const mcy = Math.min(...allCentroids.map(p => p.y)) - 20;
          return (
            <g className="cursor-pointer" onClick={e => { e.stopPropagation(); onMergeLots(selectedLotIds); }}>
              <rect x={mcx - 52} y={mcy - 12} width={104} height={24} rx={6}
                fill="hsl(var(--accent))" fillOpacity={0.95}
                stroke="hsl(var(--primary))" strokeWidth={1.5} />
              <text x={mcx} y={mcy} textAnchor="middle" dominantBaseline="middle" fontSize={10} fontWeight="bold"
                fill="hsl(var(--primary))" className="pointer-events-none select-none">
                🔗 Fusionner ({selectedLotIds.length})
              </text>
            </g>
          );
        })()}

        {/* Line drawing preview */}
        {(mode === 'drawLine' || mode === 'drawRoad') && lineDrawPoints.length > 0 && (() => {
          const allPts = [...lineDrawPoints];
          const screenPts = allPts.map(p => toScreen(p));
          const polyStr = screenPts.map(p => `${p.x},${p.y}`).join(' ');
          const lastScreenPt = screenPts[screenPts.length - 1];
          
          return (
            <g>
              {/* Center line (confirmed segments) */}
              <polyline points={polyStr} fill="none"
                stroke="hsl(var(--primary))" strokeWidth={3}
                strokeLinecap="round" strokeLinejoin="round"
                opacity={0.7} className="pointer-events-none" />
              {/* Mouse follow line */}
              {lineDrawMousePos && (
                <line x1={lastScreenPt.x} y1={lastScreenPt.y}
                  x2={lineDrawMousePos.x} y2={lineDrawMousePos.y}
                  stroke="hsl(var(--primary))" strokeWidth={2}
                  strokeLinecap="round" strokeDasharray="6 4" opacity={0.5} className="pointer-events-none" />
              )}
              {/* Point markers */}
              {screenPts.map((s, i) => (
                <circle key={`line-draw-pt-${i}`} cx={s.x} cy={s.y} r={4}
                  fill="white" stroke="hsl(var(--primary))" strokeWidth={2}
                  className="pointer-events-none" />
              ))}

              {/* Distance labels to parallel edges */}
              {distanceLines.map((dl, idx) => (
                <g key={`dist-${idx}`} className="pointer-events-none select-none">
                  <line
                    x1={dl.lineMidScreen.x} y1={dl.lineMidScreen.y}
                    x2={dl.midScreen.x} y2={dl.midScreen.y}
                    stroke="hsl(var(--primary))" strokeWidth={0.8}
                    strokeDasharray="3 2" opacity={0.6}
                  />
                  {/* Tick marks at ends */}
                  <circle cx={dl.lineMidScreen.x} cy={dl.lineMidScreen.y} r={2}
                    fill="hsl(var(--primary))" opacity={0.6} />
                  <circle cx={dl.midScreen.x} cy={dl.midScreen.y} r={2}
                    fill="hsl(var(--primary))" opacity={0.6} />
                  {/* Distance label */}
                  {(() => {
                    const lx = (dl.lineMidScreen.x + dl.midScreen.x) / 2;
                    const ly = (dl.lineMidScreen.y + dl.midScreen.y) / 2;
                    return (
                      <>
                        <rect x={lx - 16} y={ly - 7} width={32} height={14} rx={3}
                          fill="hsl(var(--background))" fillOpacity={0.9}
                          stroke="hsl(var(--primary))" strokeWidth={0.5} strokeOpacity={0.5} />
                        <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                          fontSize={8} fontWeight="bold" fill="hsl(var(--primary))">
                          {dl.distM}m
                        </text>
                      </>
                    );
                  })()}
                </g>
              ))}

              {/* Floating action buttons for multi-mode */}
              {lineDrawMultiMode && lineDrawPoints.length >= 2 && (
                <g>
                  <g className="cursor-pointer" onClick={e => {
                    e.stopPropagation();
                    finishLineDraw(lineDrawPoints);
                    setLineDrawPoints([]);
                    setLineDrawMousePos(null);
                    setLineDrawMultiMode(false);
                  }}>
                    <rect x={lastScreenPt.x + 10} y={lastScreenPt.y - 24} width={62} height={22} rx={6}
                      fill="hsl(var(--primary))" fillOpacity={0.9} />
                    <text x={lastScreenPt.x + 41} y={lastScreenPt.y - 13} textAnchor="middle" dominantBaseline="middle"
                      fontSize={9} fill="white" fontWeight="600" className="pointer-events-none select-none">
                      ✓ Terminer
                    </text>
                  </g>
                  <g className="cursor-pointer" onClick={e => {
                    e.stopPropagation();
                    setLineDrawPoints([]);
                    setLineDrawMousePos(null);
                    setLineDrawMultiMode(false);
                  }}>
                    <rect x={lastScreenPt.x + 10} y={lastScreenPt.y + 2} width={56} height={22} rx={6}
                      fill="hsl(var(--destructive))" fillOpacity={0.9} />
                    <text x={lastScreenPt.x + 38} y={lastScreenPt.y + 13} textAnchor="middle" dominantBaseline="middle"
                      fontSize={9} fill="white" fontWeight="600" className="pointer-events-none select-none">
                      ✕ Annuler
                    </text>
                  </g>
                </g>
              )}
            </g>
          );
        })()}

        {/* Post-trace choice menu */}
        {lineChoiceMenu && (() => {
          const { path, screenPos } = lineChoiceMenu;
          // Draw the completed line
          const screenPts = path.map(p => toScreen(p));
          const polyStr = screenPts.map(p => `${p.x},${p.y}`).join(' ');
          const menuX = screenPos.x + 15;
          const menuY = screenPos.y - 30;

          return (
            <g>
              {/* Show the drawn line */}
              <polyline points={polyStr} fill="none"
                stroke="hsl(var(--primary))" strokeWidth={3}
                strokeLinecap="round" strokeLinejoin="round"
                opacity={0.7} className="pointer-events-none" />
              {screenPts.map((s, i) => (
                <circle key={`choice-pt-${i}`} cx={s.x} cy={s.y} r={4}
                  fill="white" stroke="hsl(var(--primary))" strokeWidth={2}
                  className="pointer-events-none" />
              ))}

              {/* Choice menu background */}
              <rect x={menuX - 4} y={menuY - 4} width={120} height={58} rx={8}
                fill="hsl(var(--background))" fillOpacity={0.97}
                stroke="hsl(var(--border))" strokeWidth={1.5}
                filter="drop-shadow(0 2px 8px rgba(0,0,0,0.15))"
              />

              {/* Divider label */}
              <g className="cursor-pointer" onClick={e => { e.stopPropagation(); handleChooseDivide(); }}>
                <rect x={menuX} y={menuY} width={108} height={22} rx={5}
                  fill="hsl(var(--accent))" fillOpacity={0.8} />
                <text x={menuX + 54} y={menuY + 11} textAnchor="middle" dominantBaseline="middle"
                  fontSize={10} fontWeight="600" fill="hsl(var(--foreground))">
                  ✂️ Diviser le lot
                </text>
              </g>

              {/* Road option */}
              <g className="cursor-pointer" onClick={e => { e.stopPropagation(); handleChooseRoad(); }}>
                <rect x={menuX} y={menuY + 26} width={108} height={22} rx={5}
                  fill="hsl(var(--accent))" fillOpacity={0.8} />
                <text x={menuX + 54} y={menuY + 37} textAnchor="middle" dominantBaseline="middle"
                  fontSize={10} fontWeight="600" fill="hsl(var(--foreground))">
                  🛣 Créer une voie
                </text>
              </g>
            </g>
          );
        })()}

        {/* Edge context menu (right-click on edge) */}
        {edgeContextMenu && !readOnly && (() => {
          const { edge, screenPos } = edgeContextMenu;
          const menuX = screenPos.x - 60;
          const menuY = screenPos.y - 35;
          return (
            <g>
              <rect x={menuX - 4} y={menuY - 4} width={128} height={32} rx={8}
                fill="hsl(var(--background))" fillOpacity={0.97}
                stroke="hsl(var(--border))" strokeWidth={1.5}
                filter="drop-shadow(0 2px 8px rgba(0,0,0,0.15))"
              />
              <g className="cursor-pointer" onClick={e => {
                e.stopPropagation();
                onConvertEdgeToRoad?.(edge);
                setEdgeContextMenu(null);
              }}>
                <rect x={menuX} y={menuY} width={120} height={24} rx={5}
                  fill="hsl(var(--accent))" fillOpacity={0.8} />
                <text x={menuX + 60} y={menuY + 12} textAnchor="middle" dominantBaseline="middle"
                  fontSize={10} fontWeight="600" fill="hsl(var(--foreground))">
                  🛣 {edge.isShared ? 'Convertir en voie' : 'Créer une voie'}
                </text>
              </g>
            </g>
          );
        })()}

        {/* Shared edges highlight in selectEdge mode */}
        {mode === 'selectEdge' && sharedEdges.map((se, idx) => {
          const sv = toScreen(se.p1);
          const sn = toScreen(se.p2);
          return (
            <line key={`shared-edge-${idx}`}
              x1={sv.x} y1={sv.y} x2={sn.x} y2={sn.y}
              stroke="hsl(var(--primary))" strokeWidth={3}
              strokeDasharray="6 3" opacity={0.3}
              className="pointer-events-none" />
          );
        })}

        {/* Mode instruction overlay */}
        {mode === 'drawLine' && !lineChoiceMenu && (
          <g className="pointer-events-none">
            <rect x={CANVAS_W / 2 - 155} y={CANVAS_H - 24} width={310} height={20} rx={4} fill="hsl(var(--primary))" fillOpacity={0.1} />
            <text x={CANVAS_W / 2} y={CANVAS_H - 14} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="hsl(var(--primary))" fontWeight="600">
              ✏️ Glissez pour tracer • Shift+clic: multi-segments • Backspace: annuler point
            </text>
          </g>
        )}
        {mode === 'selectEdge' && (
          <g className="pointer-events-none">
            <rect x={CANVAS_W / 2 - 165} y={CANVAS_H - 24} width={330} height={20} rx={4} fill="hsl(var(--primary))" fillOpacity={0.1} />
            <text x={CANVAS_W / 2} y={CANVAS_H - 14} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="hsl(var(--primary))" fontWeight="600">
              🛣 Cliquez sur une limite entre lots pour créer une voie • Échap: annuler
            </text>
          </g>
        )}
        {mode === 'clipart' && clipartType && (
          <g className="pointer-events-none">
            <rect x={CANVAS_W / 2 - 130} y={CANVAS_H - 24} width={260} height={20} rx={4} fill="hsl(var(--primary))" fillOpacity={0.1} />
            <text x={CANVAS_W / 2} y={CANVAS_H - 14} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="hsl(var(--primary))" fontWeight="600">
              🎨 Cliquez sur un lot pour placer le clipart
            </text>
          </g>
        )}

        {/* Snap indicator */}
        {snapEnabled && (
          <g className="pointer-events-none">
            <rect x={CANVAS_W - 48} y={CANVAS_H - 16} width={36} height={12} rx={3}
              fill="hsl(var(--primary))" fillOpacity={0.1} />
            <text x={CANVAS_W - 30} y={CANVAS_H - 10} textAnchor="middle" dominantBaseline="middle"
              fontSize={6} fill="hsl(var(--primary))" fontWeight="600">SNAP</text>
          </g>
        )}

        {/* North indicator */}
        {showNorth && (
          <g transform={`translate(${CANVAS_W - 20}, ${PADDING + 15})`}>
            <polygon points="0,-12 -5,2 5,2" fill="hsl(var(--primary))" opacity={0.8} />
            <text x={0} y={-14} textAnchor="middle" fontSize={8} fontWeight="bold" fill="hsl(var(--primary))">N</text>
          </g>
        )}

        {/* Scale bar */}
        {showScale && parentAreaSqm > 0 && (
          <g transform={`translate(${PADDING}, ${CANVAS_H - 10})`}>
            <line x1={0} y1={0} x2={50} y2={0} stroke="currentColor" strokeWidth={1.5} />
            <line x1={0} y1={-3} x2={0} y2={3} stroke="currentColor" strokeWidth={1} />
            <line x1={50} y1={-3} x2={50} y2={3} stroke="currentColor" strokeWidth={1} />
            <text x={25} y={-5} textAnchor="middle" fontSize={7} fill="currentColor">
              {Math.round(50 / (CANVAS_W - 2 * PADDING) * sideLength)}m
            </text>
          </g>
        )}
      </svg>

      {/* Keyboard shortcuts hint */}
      {!readOnly && (
        <div className="absolute bottom-1 left-1 text-[8px] text-muted-foreground/50 pointer-events-none">
          Del: suppr • Ctrl+D: dupliquer • G: grille • S: snap • R: rotation • Flèches: déplacer • Espace: pan
        </div>
      )}
    </div>
  );
};

function pointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

export default LotCanvas;

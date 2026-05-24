import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { SubdivisionLot, SubdivisionRoad, SubdivisionCommonSpace, COMMON_SPACE_COLORS, COMMON_SPACE_LABELS, LOT_COLORS, USAGE_LABELS, Point2D, LotAnnotation } from './types';
import { getAllRoadIntersectionPoints, isPointOnPolygonEdge, polygonArea, polygonCentroid } from './utils/geometry';
import { useCanvasViewport } from './hooks/useCanvasViewport';
import { useCanvasDrag } from './hooks/useCanvasDrag';
import { useCanvasKeyboard } from './hooks/useCanvasKeyboard';
import { ZoomIn, ZoomOut, Maximize2, Magnet } from 'lucide-react';
import { MetricFrame, buildMetricFrame, edgeLengthM, polygonAreaSqmAccurate, polygonPerimeterM, formatMeters, formatSqm } from './utils/metrics';
import { placeLabels, estimateTextWidth, LabelBox } from './utils/labelLayout';

interface ParcelSide {
  length?: number | string;
  orientation?: string;
  [key: string]: any;
}

export type CanvasMode = 'select' | 'drawLine' | 'drawRoad' | 'selectEdge';

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
  commonSpaces?: SubdivisionCommonSpace[];
  parentAreaSqm: number;
  parentVertices?: Point2D[];
  parentSides?: ParcelSide[];
  parentGpsCoordinates?: { lat: number; lng: number }[];
  selectedLotId: string | null;
  selectedLotIds?: string[];
  onSelectLot: (id: string | null) => void;
  onToggleLotSelection?: (id: string) => void;
  onUpdateLot: (id: string, vertices: Point2D[], areaSqm?: number, perimeterM?: number) => void;
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
  showCommonSpaces?: boolean;
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
  lots, roads, commonSpaces = [], parentAreaSqm, parentVertices, parentSides, parentGpsCoordinates,
  selectedLotId, selectedLotIds = [], onSelectLot, onToggleLotSelection, onUpdateLot,
  onUpdateLotAnnotations, onDeleteLot, onDuplicateLot,
  selectedRoadId, onSelectRoad, onDeleteRoad, onUpdateRoad, onSplitLot, onMergeLots,
  onCutLot, onFinishRoadDraw, onConvertEdgeToRoad, mode = 'select', onModeChange,
  showGrid = true, onToggleGrid, showDimensions = true, showLotNumbers = true,
  showAreas = true, showRoads = true, showCommonSpaces = true, showNorth = true,
  showLegend = false, showScale = true, showOwnerNames = false,
  readOnly = false, onUndo, onRedo, minLotAreaSqm = 50,
  roadPresetWidth = 6, roadPresetSurface = 'planned',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [rotationDrag, setRotationDrag] = useState<{
    startAngle: number;
    centerX: number; centerY: number; // normalized coords
    svgCenterX: number; svgCenterY: number; // SVG viewBox coords for angle calc
    originalVertices: Point2D[];
    targetType: 'lot' | 'road';
    targetId: string;
  } | null>(null);
  const [rotationAngleDisplay, setRotationAngleDisplay] = useState<number | null>(null);

  // Unified drawLine mode state
  const [lineDrawPoints, setLineDrawPoints] = useState<Point2D[]>([]);
  const [lineDrawMousePos, setLineDrawMousePos] = useState<Point2D | null>(null);
  const [isLineDragging, setIsLineDragging] = useState(false);
  const [lineDrawMultiMode, setLineDrawMultiMode] = useState(false);

  // Road endpoint drag state
  const [roadEndpointDrag, setRoadEndpointDrag] = useState<{roadId: string; pointIdx: number} | null>(null);

  // Road width drag state
  const [roadWidthDrag, setRoadWidthDrag] = useState<{roadId: string; startX: number; startY: number; startWidth: number} | null>(null);

  // Context menu state
  const [contextMenuLotId, setContextMenuLotId] = useState<string | null>(null);

  // Edge selection state (selectEdge mode + right-click on edges)
  const [hoveredEdge, setHoveredEdge] = useState<EdgeInfo | null>(null);
  const [edgeContextMenu, setEdgeContextMenu] = useState<{ edge: EdgeInfo; screenPos: Point2D } | null>(null);

  // Viewport (zoom/pan)
  const viewport = useCanvasViewport(CANVAS_W, CANVAS_H, svgRef);

  // Anisotropic metric frame: single source of truth for distances/areas.
  const metricFrame = useMemo<MetricFrame>(
    () => buildMetricFrame(parentGpsCoordinates, parentAreaSqm),
    [parentGpsCoordinates, parentAreaSqm],
  );

  // Normalized parent area — lets drag computations stay proportional to the
  // parent's official `area_sqm` instead of the (often larger) GPS bbox area.
  const parentNormArea = useMemo(
    () => (parentVertices && parentVertices.length >= 3 ? polygonArea(parentVertices) : 0),
    [parentVertices],
  );

  // Drag system (recomputes area + perimeter via metric frame on every move)
  const drag = useCanvasDrag(lots, onUpdateLot, snapEnabled, showGrid, metricFrame, parentNormArea, parentAreaSqm, parentVertices, viewport.viewport.zoom);

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
  }, [mode]);

  // Keyboard shortcuts
  useCanvasKeyboard(containerRef, {
    onDelete: () => {
      if (selectedRoadId && onDeleteRoad) {
        onDeleteRoad(selectedRoadId);
      } else if (selectedLotId && onDeleteLot) {
        onDeleteLot(selectedLotId);
      }
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
        if (lot && !lot.isParentBoundary) {
          onUpdateLot(selectedLotId, lot.vertices.map(v => ({ x: v.x + ndx, y: v.y + ndy })));
        }
      } else if (selectedRoadId && onUpdateRoad) {
        const road = roads.find(r => r.id === selectedRoadId);
        if (road) {
          onUpdateRoad(selectedRoadId, {
            path: road.path.map(v => ({ x: v.x + ndx, y: v.y + ndy })),
            ...(road.footprint
              ? { footprint: road.footprint.map(v => ({ x: v.x + ndx, y: v.y + ndy })) }
              : {}),
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
        if (lot && !lot.isParentBoundary) onUpdateLot(selectedLotId, rotateVertices(lot.vertices));
      } else if (selectedRoadId && onUpdateRoad) {
        const road = roads.find(r => r.id === selectedRoadId);
        if (road) onUpdateRoad(selectedRoadId, {
          path: rotateVertices(road.path),
          ...(road.footprint ? { footprint: rotateVertices(road.footprint) } : {}),
        });
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

  // Legacy isotropic scale used by a few road-width-in-pixels conversions.
  // For real distances/areas, always use the metric frame instead.
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
        // Perpendicular distance from edge midpoint to the line — convert to meters via frame
        const edgeMid = { x: (edge.p1.x + edge.p2.x) / 2, y: (edge.p1.y + edge.p2.y) / 2 };
        const distNorm = Math.abs((edgeMid.x - lineStart.x) * normalX + (edgeMid.y - lineStart.y) * normalY);
        if (distNorm < 0.005) return; // Too close (same edge)
        // Project the perpendicular vector into meters using the metric frame
        const distM = Math.sqrt(
          Math.pow(distNorm * normalX * metricFrame.sxM, 2) +
          Math.pow(distNorm * normalY * metricFrame.syM, 2),
        );
        if (distM > Math.max(metricFrame.sxM, metricFrame.syM)) return; // Too far

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
  }, [lots, parentVertices, toScreen, fromScreen, metricFrame]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;

    // Space + drag OU bouton du milieu = pan forcé (tous modes)
    if (viewport.isSpaceDown() || e.button === 1) {
      e.preventDefault();
      viewport.startPan(e.clientX, e.clientY);
      return;
    }

    // Mode select: clic-gauche-glisser sur le fond vide (svg ou groupe racine) = pan
    if (mode === 'select' && e.button === 0) {
      const target = e.target as Element;
      const tag = target.tagName?.toLowerCase();
      // Le fond = l'SVG lui-même, un <g> sans data-interactive, ou la grille / outline parent
      const isBackground =
        tag === 'svg' ||
        target === e.currentTarget ||
        (tag === 'g' && !target.closest('[data-interactive="true"]')) ||
        target.hasAttribute('data-canvas-bg');
      if (isBackground) {
        viewport.startPan(e.clientX, e.clientY);
        return;
      }
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

  // True if a point lies on the parent parcel perimeter (tolerant).
  const isOnParentBoundary = useCallback((p: Point2D): boolean => {
    if (!parentVertices || parentVertices.length < 3) return false;
    return isPointOnPolygonEdge(p, parentVertices, 0.008);
  }, [parentVertices]);

  // True if BOTH endpoints of an edge are on the parent perimeter — the edge
  // is considered locked (changes would deform the mother parcel).
  const isEdgeOnParentBoundary = useCallback((p1: Point2D, p2: Point2D): boolean => {
    return isOnParentBoundary(p1) && isOnParentBoundary(p2);
  }, [isOnParentBoundary]);

  const handleVertexMouseDown = useCallback((lotId: string, vertexIdx: number, e: React.MouseEvent) => {
    if (readOnly || mode !== 'select') return;
    const lot = lots.find(l => l.id === lotId);
    if (lot?.isParentBoundary) return;
    // Vertices that sit on the parent perimeter use a constrained drag that
    // slides them along the boundary (and propagates to every lot sharing
    // that sommet).
    if (lot && isOnParentBoundary(lot.vertices[vertexIdx])) {
      e.stopPropagation();
      drag.startBoundaryVertexDrag(lotId, vertexIdx);
      return;
    }
    e.stopPropagation();
    drag.startVertexDrag(lotId, vertexIdx);
  }, [readOnly, mode, drag, lots, isOnParentBoundary]);

  const handleEdgeMouseDown = useCallback((lotId: string, edgeIdx: number, e: React.MouseEvent) => {
    if (readOnly || mode !== 'select') return;
    const lot = lots.find(l => l.id === lotId);
    if (!lot || lot.isParentBoundary) return;
    // 1er clic = sélectionner le lot (utile pour les lots étroits dont les hit-lines
    // d'arêtes recouvrent l'intérieur du polygone). 2ᵉ clic = redimensionner.
    if (lotId !== selectedLotId) {
      e.stopPropagation();
      onSelectLot(lotId);
      onSelectRoad?.(null);
      setContextMenuLotId(null);
      return;
    }
    const p1 = lot.vertices[edgeIdx];
    const p2 = lot.vertices[(edgeIdx + 1) % lot.vertices.length];
    // Lock any edge that coincides with the parent parcel perimeter.
    if (isEdgeOnParentBoundary(p1, p2)) return;
    e.stopPropagation();
    const pos = getSvgPos(e);
    const normalized = fromScreen(pos.x, pos.y);
    // If shared with another lot, drag both lots together.
    const shared = sharedEdges.find(se =>
      (se.lotId1 === lotId && se.edgeIdx1 === edgeIdx) ||
      (se.lotId2 === lotId && se.edgeIdx2 === edgeIdx)
    );
    if (shared && shared.lotId2 !== undefined && shared.edgeIdx2 !== undefined) {
      const otherLotId = shared.lotId1 === lotId ? shared.lotId2 : shared.lotId1;
      const otherEdgeIdx = shared.lotId1 === lotId ? shared.edgeIdx2 : shared.edgeIdx1;
      drag.startSharedEdgeDrag(lotId, edgeIdx, otherLotId, otherEdgeIdx, normalized);
      return;
    }
    drag.startEdgeDrag(lotId, edgeIdx, normalized);
  }, [readOnly, mode, selectedLotId, onSelectLot, onSelectRoad, drag, getSvgPos, fromScreen, lots, sharedEdges, isEdgeOnParentBoundary]);


  const handlePolygonMouseDown = useCallback((lotId: string, e: React.MouseEvent) => {
    if (readOnly || mode !== 'select') return;
    if (lotId !== selectedLotId) return;
    const lot = lots.find(l => l.id === lotId);
    if (lot?.isParentBoundary) return;
    e.stopPropagation();
    const pos = getSvgPos(e);
    const normalized = fromScreen(pos.x, pos.y);
    drag.startPolygonDrag(lotId, normalized);
  }, [readOnly, mode, selectedLotId, drag, getSvgPos, fromScreen, lots]);

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

    // drawLine/drawRoad: update preview
    if (mode === 'drawLine' || mode === 'drawRoad') {
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
        onUpdateRoad(roadEndpointDrag.roadId, { path: newPath, footprint: undefined });
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
        // Normal (perpendicular) direction in screen space
        const nx = -rdy / rlen;
        const ny = rdx / rlen;

        // Project mouse delta onto the road normal for proper angled roads
        const deltaX = e.clientX - roadWidthDrag.startX;
        const deltaY = e.clientY - roadWidthDrag.startY;
        const projectedPx = deltaX * nx + deltaY * ny;

        const svg = svgRef.current;
        if (svg) {
          const rect = svg.getBoundingClientRect();
          const scale = (CANVAS_W / viewport.viewport.zoom) / rect.width;
          const deltaNorm = Math.abs(projectedPx * scale) / (CANVAS_W - 2 * PADDING);
          const deltaM = deltaNorm * sideLength;
          const sign = projectedPx > 0 ? 1 : -1;
          const newWidth = Math.max(2, Math.min(30, roadWidthDrag.startWidth + sign * deltaM * 2));
          onUpdateRoad(roadWidthDrag.roadId, { widthM: Math.round(newWidth * 2) / 2, footprint: undefined });
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

    if (mode === 'select') {
      onSelectLot(null);
      onSelectRoad?.(null);
      setContextMenuLotId(null);
      setEdgeContextMenu(null);
    }
    if (mode === 'selectEdge') {
      setEdgeContextMenu(null);
    }
  }, [readOnly, mode, getSvgPos, fromScreen, lots, onSelectLot, onSelectRoad, drag, isLineDragging, lineDrawMultiMode]);

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
    return formatMeters(edgeLengthM(p1, p2, metricFrame));
  };

  const svgCursor = viewport.isPanning()
    ? 'grabbing'
    : viewport.isSpaceDown()
    ? 'grab'
    : (mode === 'drawLine' || mode === 'drawRoad') ? 'crosshair'
    : mode === 'selectEdge' ? 'pointer'
    : mode === 'select' ? 'grab'
    : 'default';

  const tooSmallLotIds = useMemo(() => {
    return new Set(lots.filter(l => l.areaSqm < minLotAreaSqm).map(l => l.id));
  }, [lots, minLotAreaSqm]);

  // Compute parallel distance lines for current drawing
  const distanceLines = useMemo(() => {
    if (mode !== 'drawLine' && mode !== 'drawRoad') return [];
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

  // Inverse-scale helpers: SVG viewBox shrinks with zoom, so constant stroke/font
  // widths visually grow. Divide visual sizes by z (floor 1) to keep them stable
  // and let the user make fine adjustments when zoomed in.
  const z = Math.max(1, viewport.viewport.zoom);
  const sw = (base: number) => base / z;
  const fs = (base: number) => base / z;

  // Memoized parent-parcel graduations. Big parcels × fine step can generate
  // thousands of nodes; recomputing this on every pointer-move (lot edit)
  // tanks FPS. Keys: vertices, frame, zoom, pan, visibility.
  const parentTicksNode = useMemo(() => {
    if (!showDimensions || !parentVertices || parentVertices.length < 3) return null;
    const zz = Math.max(1, viewport.viewport.zoom);
    const sw2 = (b: number) => b / zz;
    const fs2 = (b: number) => b / zz;

    const cN = polygonCentroid(parentVertices);
    let totalLen = 0;
    for (let i = 0; i < parentVertices.length; i++) {
      totalLen += edgeLengthM(parentVertices[i], parentVertices[(i + 1) % parentVertices.length], metricFrame);
    }
    let step: number;
    let majorEvery: number;
    if (zz >= 3) { step = 0.5; majorEvery = 2; }
    else if (zz >= 2) { step = 1; majorEvery = 5; }
    else if (zz >= 1.3) { step = 2; majorEvery = 10; }
    else { step = totalLen / 5 > 400 ? 10 : 5; majorEvery = 25; }
    const MAX_TICKS = 800;
    while (totalLen / step > MAX_TICKS && step < 10) {
      step = step < 1 ? 1 : step < 2 ? 2 : step < 5 ? 5 : 10;
      majorEvery = step <= 1 ? 5 : step <= 2 ? 10 : step <= 5 ? 25 : 50;
    }
    const eps = step / 100;
    const isMajorK = (k: number) => Math.abs(k / majorEvery - Math.round(k / majorEvery)) < eps;

    // Visible viewBox AABB in screen coords (for culling off-screen sides).
    const vx0 = -viewport.viewport.panX;
    const vy0 = -viewport.viewport.panY;
    const vx1 = vx0 + CANVAS_W / zz;
    const vy1 = vy0 + CANVAS_H / zz;

    const groups: React.ReactNode[] = [];
    for (let i = 0; i < parentVertices.length; i++) {
      const v = parentVertices[i];
      const next = parentVertices[(i + 1) % parentVertices.length];
      const Lm = edgeLengthM(v, next, metricFrame);
      if (Lm < 10) continue;
      const sv = toScreen(v);
      const sn = toScreen(next);
      const dx = sn.x - sv.x;
      const dy = sn.y - sv.y;
      const pxLen = Math.sqrt(dx * dx + dy * dy) || 1;
      const minX = Math.min(sv.x, sn.x), maxX = Math.max(sv.x, sn.x);
      const minY = Math.min(sv.y, sn.y), maxY = Math.max(sv.y, sn.y);
      if (maxX < vx0 || minX > vx1 || maxY < vy0 || minY > vy1) continue;
      const pxPerTick = (pxLen * step) / Lm;
      if (pxPerTick < 3) continue;
      const majorsOnly = pxPerTick < 6;

      const mid = { x: (sv.x + sn.x) / 2, y: (sv.y + sn.y) / 2 };
      const sc = toScreen(cN);
      let nx = -dy / pxLen;
      let ny = dx / pxLen;
      if ((mid.x + nx - sc.x) ** 2 + (mid.y + ny - sc.y) ** 2 <
          (mid.x - sc.x) ** 2 + (mid.y - sc.y) ** 2) {
        nx = -nx; ny = -ny;
      }
      const lenMinor = sw2(3);
      const lenMajor = sw2(6);
      const labelOff = lenMajor + sw2(5);
      const tickStroke = sw2(0.6);
      const labelFs = fs2(7);

      const ticks: React.ReactNode[] = [];
      for (let k = step; k < Lm; k += step) {
        const major = isMajorK(k);
        if (majorsOnly && !major) continue;
        const t = k / Lm;
        const px = sv.x + dx * t;
        const py = sv.y + dy * t;
        const len = major ? lenMajor : lenMinor;
        ticks.push(
          <line
            key={`t-${step}-${i}-${k}`}
            x1={px} y1={py}
            x2={px + nx * len} y2={py + ny * len}
            stroke="hsl(var(--primary))"
            strokeWidth={tickStroke}
            opacity={0.45}
          />
        );
        if (major && Lm >= majorEvery) {
          const kLabel = step < 1 ? k.toFixed(1).replace('.', ',') : String(Math.round(k));
          ticks.push(
            <text
              key={`tl-${step}-${i}-${k}`}
              x={px + nx * labelOff}
              y={py + ny * labelOff}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={labelFs}
              fill="hsl(var(--muted-foreground))"
              opacity={0.55}
            >{kLabel}</text>
          );
        }
      }
      if (ticks.length) groups.push(<g key={`ptick-${i}`}>{ticks}</g>);
    }
    if (!groups.length) return null;
    return <g className="parent-ticks select-none" pointerEvents="none">{groups}</g>;
  }, [
    showDimensions,
    parentVertices,
    metricFrame,
    viewport.viewport.zoom,
    viewport.viewport.panX,
    viewport.viewport.panY,
    toScreen,
  ]);

  // Unified label placement (anti-collision + LOD + leader-line).
  // Replaces individual <text> blocks for parent edges, lot info and lot
  // edge dimensions so they never overlap, with values revealed
  // progressively as zoom increases (best-practice LOD thresholds).
  const placedLabels = useMemo(() => {
    if (!lots.length && (!parentVertices || parentVertices.length < 3)) return [];
    const zz = Math.max(1, viewport.viewport.zoom);
    const fs2 = (b: number) => b / zz;
    const sw2 = (b: number) => b / zz;

    const showLotEdge = zz >= 1.5;
    const showParentOrient = zz >= 1.5;
    const showLotAreaLOD = zz >= 1;
    const showLotOwnerLOD = zz >= 2;

    const items: LabelBox[] = [];

    // ---- Parent edges (length + orientation) ----
    if (parentVertices && parentVertices.length >= 3) {
      const cN = polygonCentroid(parentVertices);
      const sc = toScreen(cN);
      for (let i = 0; i < parentVertices.length; i++) {
        const v = parentVertices[i];
        const next = parentVertices[(i + 1) % parentVertices.length];
        const sv = toScreen(v);
        const sn = toScreen(next);
        const mx = (sv.x + sn.x) / 2;
        const my = (sv.y + sn.y) / 2;
        const Lm = edgeLengthM(v, next, metricFrame);
        const text = zz >= 2 ? `${Lm.toFixed(1).replace('.', ',')} m` : formatMeters(Lm);
        const dx = sn.x - sv.x;
        const dy = sn.y - sv.y;
        const len = Math.hypot(dx, dy) || 1;
        let nx = -dy / len;
        let ny = dx / len;
        if ((mx + nx - sc.x) ** 2 + (my + ny - sc.y) ** 2 <
            (mx - sc.x) ** 2 + (my - sc.y) ** 2) {
          nx = -nx; ny = -ny;
        }
        const off = sw2(14);
        const fontSize = fs2(9);
        items.push({
          id: `pe-${i}`,
          priority: 75,
          anchor: { x: mx, y: my },
          cx: mx + nx * off,
          cy: my + ny * off,
          width: estimateTextWidth(text, fontSize) + sw2(8),
          height: fontSize * 1.6,
          payload: { kind: 'parentEdge', text, fontSize, fill: 'hsl(var(--primary))', fontWeight: 700, withBg: true },
        });

        const orientation = parentSides?.[i]?.orientation || '';
        if (showParentOrient && orientation) {
          const off2 = sw2(28);
          const ofs = fs2(7);
          items.push({
            id: `po-${i}`,
            priority: 40,
            anchor: { x: mx, y: my },
            cx: mx + nx * off2,
            cy: my + ny * off2,
            width: estimateTextWidth(orientation, ofs) + sw2(4),
            height: ofs * 1.3,
            payload: { kind: 'parentOrient', text: orientation, fontSize: ofs, fill: 'hsl(var(--muted-foreground))' },
          });
        }
      }
    }

    // ---- Lots (number / area / owner / edge dims) ----
    for (const lot of lots) {
      if (!lot.vertices?.length) continue;
      const sv = lot.vertices.map(v => toScreen(v));
      const cx = sv.reduce((s, p) => s + p.x, 0) / sv.length;
      const cy = sv.reduce((s, p) => s + p.y, 0) / sv.length;
      const minX = Math.min(...sv.map(p => p.x));
      const maxX = Math.max(...sv.map(p => p.x));
      const minY = Math.min(...sv.map(p => p.y));
      const maxY = Math.max(...sv.map(p => p.y));
      const w = maxX - minX;
      const h = maxY - minY;
      // Lot too small to host its labels — push them above the lot AABB
      // (the solver may shift further but will keep the leader line).
      const tooSmall = w < sw2(60) || h < sw2(28);
      const baseCx = tooSmall ? (minX + maxX) / 2 : cx;
      const baseCy = tooSmall ? minY - sw2(16) : cy;
      const color = lot.color || LOT_COLORS[lot.intendedUse];

      if (showLotNumbers) {
        const fontSize = fs2(14);
        const text = String(lot.lotNumber);
        const yPos = (showAreas && showLotAreaLOD) ? baseCy - fs2(6) : baseCy;
        items.push({
          id: `ln-${lot.id}`,
          priority: 100,
          anchor: { x: cx, y: cy },
          cx: baseCx, cy: yPos,
          width: estimateTextWidth(text, fontSize),
          height: fontSize * 1.2,
          payload: { kind: 'lotNumber', text, fontSize, fill: color, fontWeight: 'bold' },
        });
      }
      if (showAreas && showLotAreaLOD) {
        const fontSize = fs2(9);
        const text = formatSqm(lot.areaSqm);
        const yPos = baseCy + (showLotNumbers ? fs2(10) : 0);
        items.push({
          id: `la-${lot.id}`,
          priority: 80,
          anchor: { x: cx, y: cy },
          cx: baseCx, cy: yPos,
          width: estimateTextWidth(text, fontSize),
          height: fontSize * 1.2,
          payload: { kind: 'lotArea', text, fontSize, fill: 'hsl(var(--muted-foreground))' },
        });
      }
      if (showOwnerNames && showLotOwnerLOD && lot.ownerName) {
        const fontSize = fs2(7);
        const text = lot.ownerName;
        items.push({
          id: `lo-${lot.id}`,
          priority: 25,
          anchor: { x: cx, y: cy },
          cx: baseCx, cy: baseCy + fs2(22),
          width: estimateTextWidth(text, fontSize),
          height: fontSize * 1.2,
          payload: { kind: 'lotOwner', text, fontSize, fill: 'hsl(var(--muted-foreground))' },
        });
      }

      if (showDimensions && showLotEdge && !lot.isParentBoundary) {
        for (let i = 0; i < lot.vertices.length; i++) {
          const a = sv[i];
          const b = sv[(i + 1) % sv.length];
          const v = lot.vertices[i];
          const next = lot.vertices[(i + 1) % lot.vertices.length];
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const Lm = edgeLengthM(v, next, metricFrame);
          const text = formatMeters(Lm);
          const fontSize = fs2(7);
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          let nx = -dy / len;
          let ny = dx / len;
          if ((mx + nx - cx) ** 2 + (my + ny - cy) ** 2 <
              (mx - cx) ** 2 + (my - cy) ** 2) {
            nx = -nx; ny = -ny;
          }
          const off = sw2(9);
          items.push({
            id: `le-${lot.id}-${i}`,
            priority: 55,
            anchor: { x: mx, y: my },
            cx: mx + nx * off,
            cy: my + ny * off,
            width: estimateTextWidth(text, fontSize),
            height: fontSize * 1.2,
            payload: { kind: 'lotEdge', text, fontSize, fill: 'hsl(var(--muted-foreground))' },
          });
        }
      }
    }

    const vp = {
      x0: -viewport.viewport.panX - 20,
      y0: -viewport.viewport.panY - 20,
      x1: -viewport.viewport.panX + CANVAS_W / zz + 20,
      y1: -viewport.viewport.panY + CANVAS_H / zz + 20,
    };
    return placeLabels(items, {
      maxOffsetPx: sw2(80),
      leaderThresholdPx: sw2(6),
      stepPx: sw2(10),
      paddingPx: sw2(2),
      viewport: vp,
      dropBelowPriority: 35,
    });
  }, [
    lots,
    parentVertices,
    parentSides,
    metricFrame,
    viewport.viewport.zoom,
    viewport.viewport.panX,
    viewport.viewport.panY,
    toScreen,
    showDimensions,
    showLotNumbers,
    showAreas,
    showOwnerNames,
  ]);



  return (

    <div ref={containerRef} className="relative" tabIndex={-1}>
      {/* Zoom controls — placés à gauche pour ne pas chevaucher la barre d'outils flottante (à droite) */}
      <div className="absolute top-2 left-2 z-20 flex flex-col gap-1 pointer-events-auto">
        <button type="button" onClick={viewport.zoomIn} className="h-7 w-7 rounded-md bg-background/90 border shadow-sm flex items-center justify-center hover:bg-muted transition-colors" title="Zoom +">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={viewport.zoomOut} className="h-7 w-7 rounded-md bg-background/90 border shadow-sm flex items-center justify-center hover:bg-muted transition-colors" title="Zoom -">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={viewport.resetView} className="h-7 w-7 rounded-md bg-background/90 border shadow-sm flex items-center justify-center hover:bg-muted transition-colors" title="Reset vue">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => setSnapEnabled(!snapEnabled)} className={`h-7 w-7 rounded-md border shadow-sm flex items-center justify-center transition-colors ${snapEnabled ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-background/90 hover:bg-muted'}`} title={snapEnabled ? 'Snap activé' : 'Snap désactivé'}>
          <Magnet className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Légende contrôles */}
      <div className="absolute bottom-2 left-2 z-10 px-2 py-1 rounded-md bg-background/80 border text-[10px] text-muted-foreground pointer-events-none select-none leading-tight">
        Glisser : déplacer · Molette : zoom · Espace : pan forcé
      </div>


      <svg
        ref={svgRef}
        viewBox={viewport.viewBox}
        className="w-full h-auto bg-white dark:bg-gray-950 rounded-lg"
        style={{ minHeight: 280, cursor: svgCursor, touchAction: 'none' }}
        onPointerDown={handleMouseDown as unknown as React.PointerEventHandler<SVGSVGElement>}
        onPointerMove={handleMouseMove as unknown as React.PointerEventHandler<SVGSVGElement>}
        onPointerUp={handleMouseUp as unknown as React.PointerEventHandler<SVGSVGElement>}
        onPointerLeave={handleMouseUp as unknown as React.PointerEventHandler<SVGSVGElement>}
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDoubleClick}
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
            strokeWidth={sw(2)}
            strokeDasharray={`${sw(6)} ${sw(3)}`}
            opacity={0.5}
          />
        ) : (
          <rect
            x={PADDING} y={PADDING}
            width={CANVAS_W - 2 * PADDING} height={CANVAS_H - 2 * PADDING}
            fill="none" stroke="hsl(var(--primary))" strokeWidth={sw(2)} strokeDasharray={`${sw(6)} ${sw(3)}`} opacity={0.5}
          />
        )}


        {/* Parent parcel side graduations — memoized, viewport-culled, density-filtered */}
        {parentTicksNode}


        {/* Parent parcel side measurements — now rendered via placedLabels overlay (anti-collision + LOD). */}


        {/* Layer ordering: selected layer on top */}
        {(() => {
          const roadsBlock = (
            <g key="roads-layer">
        {/* Roads — polygon rendering with clear borders */}
        {showRoads && [...roads].sort((a, b) => (a.id === selectedRoadId ? 1 : 0) - (b.id === selectedRoadId ? 1 : 0)).map(road => {
          if (road.path.length < 2) return null;

          // External (bordering) roads: draw a parallel band on the OUTSIDE of the
          // selected parent-parcel side. Inner edge of the band coincides with the side.
          if (road.isExternal && road.borderingParcelSideIndex != null && parentVertices && parentVertices.length >= 3) {
            const sideIdx = road.borderingParcelSideIndex;
            const aN = parentVertices[sideIdx];
            const bN = parentVertices[(sideIdx + 1) % parentVertices.length];
            if (!aN || !bN) return null;
            const A = toScreen(aN);
            const B = toScreen(bN);
            const dx = B.x - A.x;
            const dy = B.y - A.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            // Two candidate normals
            let nx = -dy / len;
            let ny = dx / len;
            // Choose outward direction: opposite to parent centroid
            const cN = polygonCentroid(parentVertices);
            const C = toScreen(cN);
            const midX = (A.x + B.x) / 2;
            const midY = (A.y + B.y) / 2;
            const toCentroidX = C.x - midX;
            const toCentroidY = C.y - midY;
            if (nx * toCentroidX + ny * toCentroidY > 0) { nx = -nx; ny = -ny; }
            const widthPx = Math.max(4, (road.widthM / sideLength) * (CANVAS_W - 2 * PADDING));
            const TL = { x: A.x, y: A.y };
            const TR = { x: B.x, y: B.y };
            const BR = { x: B.x + nx * widthPx, y: B.y + ny * widthPx };
            const BL = { x: A.x + nx * widthPx, y: A.y + ny * widthPx };
            const polyStr = `${TL.x},${TL.y} ${TR.x},${TR.y} ${BR.x},${BR.y} ${BL.x},${BL.y}`;
            // Label angle along the side
            let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
            if (angleDeg > 90) angleDeg -= 180;
            if (angleDeg < -90) angleDeg += 180;
            const lcx = (TL.x + TR.x + BR.x + BL.x) / 4;
            const lcy = (TL.y + TR.y + BR.y + BL.y) / 4;
            const widthLabel = `${Math.round(road.widthM * 10) / 10}m`;
            return (
              <g key={road.id} className="pointer-events-none">
                <polygon
                  points={polyStr}
                  fill="#d4a574"
                  fillOpacity={0.25}
                  stroke="#92400e"
                  strokeWidth={1.5}
                />
                <text
                  x={lcx}
                  y={lcy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill="#78350f"
                  fontWeight={600}
                  transform={`rotate(${angleDeg} ${lcx} ${lcy})`}
                >
                  {road.name} ({widthLabel})
                </text>
              </g>
            );
          }

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

          const rectStr = `${TL.x},${TL.y} ${TR.x},${TR.y} ${BR.x},${BR.y} ${BL.x},${BL.y}`;
          const useFootprint = Array.isArray(road.footprint) && road.footprint.length >= 3;
          const footprintPts = useFootprint ? road.footprint!.map(p => toScreen(p)) : null;
          const polygonStr = footprintPts
            ? footprintPts.map(p => `${p.x},${p.y}`).join(' ')
            : rectStr;
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
              {useFootprint ? (
                <polygon
                  points={polygonStr}
                  fill="none"
                  stroke={borderColorBase}
                  strokeWidth={isRoadSelected ? 2 : 1.5}
                  strokeDasharray={isExisting ? 'none' : '6 3'}
                  opacity={isRoadSelected ? 0.9 : isExisting ? 0.7 : 0.6}
                  className="pointer-events-none"
                />
              ) : (
                <>
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
                </>
              )}
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

                // Compute road length & area in meters via metric frame
                const roadLenM = road.path.reduce((sum, p, i) => {
                  if (i === 0) return 0;
                  return sum + edgeLengthM(road.path[i - 1], p, metricFrame);
                }, 0);
                const roadAreaM2 = roadLenM * road.widthM;

                return (
                  <g className="pointer-events-none select-none">
                    {/* Road name + length along the axis */}
                    <text
                      x={mx} y={my - 6}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={6.5}
                      fontWeight={isRoadSelected || isExisting ? 'bold' : 'normal'}
                      fill={isRoadSelected ? 'hsl(var(--primary))' : isExisting ? '#92400e' : '#6b7280'}
                      transform={`rotate(${axisAngleDeg}, ${mx}, ${my - 6})`}
                    >
                      {road.name} · {formatMeters(roadLenM)}
                    </text>
                    {/* Width + footprint area perpendicular */}
                    <text
                      x={mx} y={my + 6}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={7} fontWeight="bold"
                      fill={isRoadSelected ? 'hsl(var(--primary))' : isExisting ? '#92400e' : '#4b5563'}
                      transform={`rotate(${perpAngleDeg}, ${mx}, ${my + 6})`}
                    >
                      {road.widthM} m · {formatSqm(roadAreaM2)}
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
                  onPointerDown={e => {
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
                      onPointerDown={e => {
                        e.stopPropagation();
                        setRoadWidthDrag({ roadId: road.id, startX: e.clientX, startY: e.clientY, startWidth: road.widthM });
                      }}
                    />
                    {/* Bottom handle */}
                    <rect
                      x={mx - nx * halfW - handleSize / 2}
                      y={my - ny * halfW - handleSize / 2}
                      width={handleSize} height={handleSize} rx={1.5}
                      fill="white" stroke="hsl(var(--primary))" strokeWidth={2}
                      className="cursor-ns-resize"
                      onPointerDown={e => {
                        e.stopPropagation();
                        setRoadWidthDrag({ roadId: road.id, startX: e.clientX, startY: e.clientY, startWidth: road.widthM });
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
                      onPointerDown={startRotationRoad} />
                    {/* Guide line center → handle */}
                    <line x1={rcx} y1={rcy} x2={handleX} y2={handleY}
                      stroke="hsl(var(--primary))" strokeWidth={1} strokeDasharray="3 2" opacity={0.3}
                      className="pointer-events-none" />
                    {/* Handle on ring */}
                    <circle cx={handleX} cy={handleY} r={10}
                      fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth={2.5}
                      className="cursor-grab active:cursor-grabbing"
                      onPointerDown={startRotationRoad} />
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

            </g>
          );

          const lotsBlock = (
            <g key="lots-layer">
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
                className={readOnly ? '' : mode === 'select' ? (isSelected ? (lot.isParentBoundary ? 'cursor-not-allowed' : 'cursor-move') : 'cursor-pointer') : 'cursor-crosshair'}
                onClick={e => handleLotClick(lot.id, e)}
                onDoubleClick={e => handleLotDoubleClick(lot.id, e)}
                onContextMenu={e => handleLotContextMenu(lot.id, e)}
                onPointerDown={e => {
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

              {/* Lot number / area / owner labels — rendered via placedLabels overlay (anti-collision + LOD). */}


              {lot.notes?.includes('route existante') && (
                <g className="select-none pointer-events-none">
                  <rect x={cx - 28} y={cy + (showAreas ? 18 : 10)} width={56} height={12} rx={2}
                    fill="#92400e" fillOpacity={0.15} stroke="#92400e" strokeWidth={0.5} strokeOpacity={0.4} />
                  <text x={cx} y={cy + (showAreas ? 24 : 16)} textAnchor="middle" dominantBaseline="middle"
                    fontSize={6} fill="#92400e" fontWeight="600">🛣 Route existante</text>
                </g>
              )}

              {/* Annotations / formes géométriques */}
              {lot.annotations?.map(ann => {
                const sp = toScreen(ann.position);
                const s = (ann.scale || 1) * 12;
                return (
                  <g key={ann.id} transform={`translate(${sp.x},${sp.y})`} className="select-none pointer-events-none">
                    {ann.type === 'circle' && (
                      <circle r={s} fill="rgba(239,68,68,0.25)" stroke="#ef4444" strokeWidth={1.5} />
                    )}
                    {ann.type === 'square' && (
                      <rect x={-s} y={-s} width={s * 2} height={s * 2} fill="rgba(59,130,246,0.25)" stroke="#3b82f6" strokeWidth={1.5} />
                    )}
                    {ann.type === 'rectangle' && (
                      <rect x={-s * 1.5} y={-s * 0.8} width={s * 3} height={s * 1.6} fill="rgba(34,197,94,0.25)" stroke="#22c55e" strokeWidth={1.5} />
                    )}
                    {ann.type === 'trapeze' && (
                      <polygon points={`${-s * 0.6},${-s} ${s * 0.6},${-s} ${s},${s} ${-s},${s}`} fill="rgba(245,158,11,0.25)" stroke="#f59e0b" strokeWidth={1.5} />
                    )}
                    {ann.type === 'polygon' && (
                      <polygon points={`0,${-s} ${s * 0.87},${-s * 0.5} ${s * 0.87},${s * 0.5} 0,${s} ${-s * 0.87},${s * 0.5} ${-s * 0.87},${-s * 0.5}`} fill="rgba(139,92,246,0.25)" stroke="#8b5cf6" strokeWidth={1.5} />
                    )}
                  </g>
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
                const isParentEdge = isEdgeOnParentBoundary(v, next);
                if (isParentEdge) cursorStyle = 'not-allowed';
                return (
                  <line
                    key={`edge-hit-${i}`}
                    x1={sv.x} y1={sv.y} x2={sn.x} y2={sn.y}
                    stroke="rgba(0,0,0,0.001)" strokeWidth={14} strokeLinecap="round"
                    pointerEvents="stroke" style={{ cursor: cursorStyle }}
                    onPointerDown={e => handleEdgeMouseDown(lot.id, i, e)}
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
                  >
                    {isParentEdge && <title>Limite de la parcelle-mère — verrouillée</title>}
                  </line>
                );
              })}

              {/* Lot edge dimensions — rendered via placedLabels overlay (anti-collision + LOD). */}



              {/* Vertices: locked grey squares for the parent boundary lot,
                  draggable boundary-handles (dotted halo) for lot vertices
                  sitting on the parent perimeter, plain draggable circles
                  otherwise. */}
              {!readOnly && mode === 'select' && isSelected && screenVertices.map((sv, i) => {
                if (lot.isParentBoundary) {
                  return (
                    <rect
                      key={i} x={sv.x - 3.5} y={sv.y - 3.5} width={7} height={7}
                      fill="hsl(var(--muted))" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5}
                      style={{ cursor: 'not-allowed' }}
                    >
                      <title>Sommet verrouillé — appartient à la parcelle-mère</title>
                    </rect>
                  );
                }
                const onBoundary = isOnParentBoundary(lot.vertices[i]);
                if (onBoundary) {
                  return (
                    <g key={i}>
                      {/* Dashed halo to signal "glissement contraint sur le périmètre" */}
                      <circle
                        cx={sv.x} cy={sv.y} r={10}
                        fill="none" stroke="hsl(var(--primary))" strokeWidth={1.2}
                        strokeDasharray="3 2" opacity={0.7}
                        className="pointer-events-none"
                      />
                      <circle
                        cx={sv.x} cy={sv.y} r={7}
                        fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth={2}
                        className="cursor-grab active:cursor-grabbing touch-none"
                        onPointerDown={e => handleVertexMouseDown(lot.id, i, e)}
                      >
                        <title>Sommet sur la limite — glisser le long du périmètre de la parcelle-mère</title>
                      </circle>
                    </g>
                  );
                }
                return (
                  <circle
                    key={i} cx={sv.x} cy={sv.y} r={7}
                    fill="white" stroke="hsl(var(--primary))" strokeWidth={2}
                    className="cursor-grab active:cursor-grabbing touch-none"
                    onPointerDown={e => handleVertexMouseDown(lot.id, i, e)}
                  />
                );
              })}

              {/* Rotation ring (skipped for locked parent-boundary lot) */}
              {!readOnly && mode === 'select' && isSelected && !lot.isParentBoundary && (() => {
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
                      onPointerDown={startRotationLot} />
                    {/* Guide line center → handle */}
                    <line x1={cx} y1={cy} x2={handleX} y2={handleY}
                      stroke="hsl(var(--primary))" strokeWidth={1} strokeDasharray="3 2" opacity={0.3}
                      className="pointer-events-none" />
                    {/* Handle on ring */}
                    <circle cx={handleX} cy={handleY} r={10}
                      fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth={2.5}
                      className="cursor-grab active:cursor-grabbing"
                      onPointerDown={startRotationLot} />
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
            </g>
          );

          return selectedRoadId ? <>{lotsBlock}{roadsBlock}</> : <>{roadsBlock}{lotsBlock}</>;
        })()}

        {/* Common spaces — side dimensions + label + accurate surface */}
        {showCommonSpaces && commonSpaces.map(space => {
          if (!space.vertices || space.vertices.length < 3) return null;
          const sv = space.vertices.map(v => toScreen(v));
          const pointsStr = sv.map(p => `${p.x},${p.y}`).join(' ');
          const cx = sv.reduce((s, p) => s + p.x, 0) / sv.length;
          const cy = sv.reduce((s, p) => s + p.y, 0) / sv.length;
          const fill = space.color || COMMON_SPACE_COLORS[space.type] || '#a855f7';
          const accurateAreaM2 = polygonAreaSqmAccurate(space.vertices, metricFrame);
          const label = COMMON_SPACE_LABELS[space.type] || 'Espace';
          return (
            <g key={space.id} className="pointer-events-none select-none">
              <polygon points={pointsStr} fill={fill} fillOpacity={0.18}
                stroke={fill} strokeWidth={1.5} strokeDasharray="3 2" />
              {showDimensions && space.vertices.map((v, i) => {
                const next = space.vertices[(i + 1) % space.vertices.length];
                const a = toScreen(v); const b = toScreen(next);
                const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2;
                const dx = b.y - a.y; const dy = a.x - b.x;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const ox = (dx / len) * 9; const oy = (dy / len) * 9;
                return (
                  <text key={`cs-dim-${space.id}-${i}`} x={mx + ox} y={my + oy}
                    textAnchor="middle" dominantBaseline="middle" fontSize={7} fill={fill}>
                    {formatMeters(edgeLengthM(v, next, metricFrame))}
                  </text>
                );
              })}
              <text x={cx} y={cy - 5} textAnchor="middle" dominantBaseline="middle"
                fontSize={9} fontWeight="bold" fill={fill}>{space.name || label}</text>
              <text x={cx} y={cy + 7} textAnchor="middle" dominantBaseline="middle"
                fontSize={8} fill={fill}>{formatSqm(accurateAreaM2 || space.areaSqm)}</text>
            </g>
          );
        })}

        {/* Invisible hit-areas for roads — always on top for clickability */}
        {showRoads && mode === 'select' && !readOnly && roads.map(road => {
          if (road.path.length < 2 || road.isExternal) return null;
          const pathPoints = road.path.map(p => toScreen(p));
          const polylineStr = pathPoints.map(p => `${p.x},${p.y}`).join(' ');
          const roadWidthPx = Math.max(4, (road.widthM / sideLength) * (CANVAS_W - 2 * PADDING));

          const p0 = pathPoints[0];
          const pN = pathPoints[pathPoints.length - 1];
          const rdx = pN.x - p0.x;
          const rdy = pN.y - p0.y;
          const rlen = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
          const nx = -rdy / rlen;
          const ny = rdx / rlen;
          const halfW = roadWidthPx / 2;

          const TL = { x: p0.x + nx * halfW, y: p0.y + ny * halfW };
          const TR = { x: pN.x + nx * halfW, y: pN.y + ny * halfW };
          const BR = { x: pN.x - nx * halfW, y: pN.y - ny * halfW };
          const BL = { x: p0.x - nx * halfW, y: p0.y - ny * halfW };
          const polygonStr = `${TL.x},${TL.y} ${TR.x},${TR.y} ${BR.x},${BR.y} ${BL.x},${BL.y}`;

          return (
            <g key={`road-hit-${road.id}`}>
              <polyline
                points={polylineStr}
                fill="none" stroke="transparent" strokeWidth={Math.max(20, roadWidthPx + 10)}
                strokeLinecap="round" strokeLinejoin="round"
                pointerEvents="all"
                className="cursor-pointer"
                onClick={e => handleRoadClick(road.id, e)}
              />
              <polygon
                points={polygonStr}
                fill="transparent"
                pointerEvents="all"
                className="cursor-pointer"
                onClick={e => handleRoadClick(road.id, e)}
              />
            </g>
          );
        })}

        {/* Road intersection markers */}
        {showRoads && roads.length >= 2 && (() => {
          const intersectionPts = getAllRoadIntersectionPoints(roads.filter(r => !r.isExternal));
          return intersectionPts.map((pt, i) => {
            const sp = toScreen(pt);
            return (
              <circle
                key={`isect-${i}`}
                cx={sp.x} cy={sp.y} r={5}
                fill="hsl(var(--destructive))"
                stroke="hsl(var(--background))"
                strokeWidth={1.5}
                pointerEvents="none"
              />
            );
          });
        })()}

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
        {(mode === 'drawLine' || mode === 'drawRoad') && (
          <g className="pointer-events-none">
            <rect x={CANVAS_W / 2 - 155} y={CANVAS_H - 24} width={310} height={20} rx={4} fill="hsl(var(--primary))" fillOpacity={0.1} />
            <text x={CANVAS_W / 2} y={CANVAS_H - 14} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="hsl(var(--primary))" fontWeight="600">
              {mode === 'drawRoad' ? '🛣' : '✏️'} Glissez pour tracer • Shift+clic: multi-segments • Backspace: annuler point
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

        {/* Snap indicator */}
        {snapEnabled && (
          <g className="pointer-events-none">
            <rect x={CANVAS_W - 48} y={CANVAS_H - 16} width={36} height={12} rx={3}
              fill="hsl(var(--primary))" fillOpacity={0.1} />
            <text x={CANVAS_W - 30} y={CANVAS_H - 10} textAnchor="middle" dominantBaseline="middle"
              fontSize={6} fill="hsl(var(--primary))" fontWeight="600">SNAP</text>
          </g>
        )}


        {/* Unified labels overlay (anti-collision + LOD + leader lines) */}
        <g className="labels-overlay select-none" pointerEvents="none">
          {placedLabels.map(lab => {
            if (lab.dropped) return null;
            const p = lab.payload || {};
            const dxL = lab.cx - lab.anchor.x;
            const dyL = lab.cy - lab.anchor.y;
            const distL = Math.hypot(dxL, dyL);
            const showLeader = lab.leadered && distL > Math.max(2, lab.height * 0.4);
            return (
              <g key={lab.id}>
                {showLeader && (
                  <>
                    <line
                      x1={lab.anchor.x} y1={lab.anchor.y}
                      x2={lab.cx} y2={lab.cy}
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={Math.max(0.4, lab.height * 0.04)}
                      strokeDasharray={`${Math.max(2, lab.height * 0.3)} ${Math.max(2, lab.height * 0.2)}`}
                      opacity={0.5}
                    />
                    <circle cx={lab.anchor.x} cy={lab.anchor.y}
                      r={Math.max(0.5, lab.height * 0.08)}
                      fill="hsl(var(--muted-foreground))" opacity={0.6} />
                  </>
                )}
                {p.withBg && (
                  <rect
                    x={lab.cx - lab.width / 2} y={lab.cy - lab.height / 2}
                    width={lab.width} height={lab.height}
                    rx={lab.height * 0.2}
                    fill="hsl(var(--background))" fillOpacity={0.85}
                    stroke="hsl(var(--primary))" strokeOpacity={0.4}
                    strokeWidth={Math.max(0.3, lab.height * 0.04)}
                  />
                )}
                <text
                  x={lab.cx} y={lab.cy}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={p.fontSize}
                  fontWeight={p.fontWeight}
                  fill={p.fill}
                >{p.text}</text>
              </g>
            );
          })}
        </g>

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

        {/* Real-time tooltip during boundary-vertex drag: shows the two
            adjacent edge lengths of the primary lot + areas of every lot
            sharing the dragged sommet. */}
        {drag.boundaryDragInfo && (() => {
          const info = drag.boundaryDragInfo;
          const primary = lots.find(l => l.id === info.primaryLotId);
          if (!primary || primary.vertices.length < 3) return null;
          const vIdx = info.primaryVertexIdx;
          const n = primary.vertices.length;
          const v = primary.vertices[vIdx];
          const vPrev = primary.vertices[(vIdx - 1 + n) % n];
          const vNext = primary.vertices[(vIdx + 1) % n];
          const lenPrev = metricFrame ? edgeLengthM(vPrev, v, metricFrame) : 0;
          const lenNext = metricFrame ? edgeLengthM(v, vNext, metricFrame) : 0;
          const anchor = toScreen(v);
          // Build line list (primary first, then other affected lots).
          const seen = new Set<string>();
          const rows: { label: string; areaSqm: number }[] = [];
          rows.push({ label: `Lot ${primary.lotNumber}`, areaSqm: primary.areaSqm ?? 0 });
          seen.add(primary.id);
          for (const t of info.twins) {
            if (seen.has(t.lotId)) continue;
            const l = lots.find(ll => ll.id === t.lotId);
            if (!l) continue;
            rows.push({ label: `Lot ${l.lotNumber}`, areaSqm: l.areaSqm ?? 0 });
            seen.add(t.lotId);
          }
          const padX = 8;
          const padY = 6;
          const lineH = 11;
          const headerLines = 2;
          const totalLines = headerLines + rows.length;
          const boxW = 150;
          const boxH = totalLines * lineH + padY * 2;
          // Keep tooltip on-screen: flip when too close to right/bottom edge.
          let x = anchor.x + 14;
          let y = anchor.y - boxH - 14;
          if (x + boxW > CANVAS_W - 4) x = anchor.x - boxW - 14;
          if (y < 4) y = anchor.y + 14;
          return (
            <g className="pointer-events-none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }}>
              <rect
                x={x} y={y} width={boxW} height={boxH} rx={4}
                fill="hsl(var(--popover))" stroke="hsl(var(--primary))" strokeWidth={1} opacity={0.97}
              />
              <text x={x + padX} y={y + padY + 9} fontSize={9} fontWeight="bold" fill="hsl(var(--primary))">
                Côté précédent : {formatMeters(lenPrev)}
              </text>
              <text x={x + padX} y={y + padY + 9 + lineH} fontSize={9} fontWeight="bold" fill="hsl(var(--primary))">
                Côté suivant : {formatMeters(lenNext)}
              </text>
              {rows.map((r, i) => (
                <text
                  key={i}
                  x={x + padX}
                  y={y + padY + 9 + (headerLines + i) * lineH}
                  fontSize={9}
                  fill="hsl(var(--popover-foreground))"
                >
                  {r.label} : {formatSqm(r.areaSqm)}
                </text>
              ))}
              {/* Connector from anchor to box */}
              <line
                x1={anchor.x} y1={anchor.y}
                x2={x < anchor.x ? x + boxW : x}
                y2={y < anchor.y ? y + boxH : y}
                stroke="hsl(var(--primary))" strokeWidth={1} strokeDasharray="2 2" opacity={0.6}
              />
            </g>
          );
        })()}
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

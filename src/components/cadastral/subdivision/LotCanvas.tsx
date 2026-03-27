import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { SubdivisionLot, SubdivisionRoad, LOT_COLORS, USAGE_LABELS, Point2D, LotAnnotation, CLIPART_TYPES } from './types';
import { useCanvasViewport } from './hooks/useCanvasViewport';
import { useCanvasDrag } from './hooks/useCanvasDrag';
import { useCanvasKeyboard } from './hooks/useCanvasKeyboard';
import ClipartPalette from './ClipartPalette';
import { ZoomIn, ZoomOut, Maximize2, Magnet, Scissors, Trash2, Copy, Sticker } from 'lucide-react';

interface ParcelSide {
  length?: number | string;
  orientation?: string;
  [key: string]: any;
}

export type CanvasMode = 'select' | 'cut' | 'drawRoad' | 'clipart';

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
  selectedRoadId, onSelectRoad, onDeleteRoad, onSplitLot, onMergeLots,
  onCutLot, onFinishRoadDraw, mode = 'select', onModeChange,
  showGrid = true, onToggleGrid, showDimensions = true, showLotNumbers = true,
  showAreas = true, showRoads = true, showNorth = true,
  showLegend = false, showScale = true, showOwnerNames = false,
  readOnly = false, onUndo, onRedo, minLotAreaSqm = 50
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showClipartPalette, setShowClipartPalette] = useState(false);
  const [clipartType, setClipartType] = useState<LotAnnotation['type'] | null>(null);

  // Cut mode state
  const [cutPoints, setCutPoints] = useState<Point2D[]>([]);
  const [cutMousePos, setCutMousePos] = useState<Point2D | null>(null);

  // Draw road mode state
  const [roadDrawPoints, setRoadDrawPoints] = useState<Point2D[]>([]);
  const [roadDrawMousePos, setRoadDrawMousePos] = useState<Point2D | null>(null);

  // Context menu state
  const [contextMenuLotId, setContextMenuLotId] = useState<string | null>(null);

  // Viewport (zoom/pan)
  const viewport = useCanvasViewport(CANVAS_W, CANVAS_H);

  // Drag system
  const drag = useCanvasDrag(lots, onUpdateLot, snapEnabled, showGrid);

  // Reset drawing states when mode changes
  useEffect(() => {
    setCutPoints([]);
    setCutMousePos(null);
    setRoadDrawPoints([]);
    setRoadDrawMousePos(null);
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
      onSelectLot(null);
      onModeChange?.('select');
      setContextMenuLotId(null);
      setShowClipartPalette(false);
      setClipartType(null);
    },
    onToggleGrid: onToggleGrid,
    onToggleSnap: () => setSnapEnabled(prev => !prev),
    onSpaceDown: () => viewport.setSpaceDown(true),
    onSpaceUp: () => viewport.setSpaceDown(false),
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
      rawScaleX: CANVAS_W / rect.width,
      rawScaleY: CANVAS_H / rect.height,
    };
  }, [viewport.viewport]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    // Space + drag = pan
    if (viewport.isSpaceDown() || e.button === 1) {
      e.preventDefault();
      viewport.startPan(e.clientX, e.clientY);
      return;
    }
  }, [readOnly, viewport]);

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
    if (lotId !== selectedLotId) return; // Only drag already-selected lots
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

    if (mode === 'cut' && cutPoints.length === 1) {
      setCutMousePos({ x: pos.x, y: pos.y });
    }
    if (mode === 'drawRoad' && roadDrawPoints.length > 0) {
      setRoadDrawMousePos({ x: pos.x, y: pos.y });
    }

    if (drag.isDragging) {
      const normalized = fromScreen(pos.x, pos.y);
      drag.moveDrag(normalized);
    }
  }, [viewport, getSvgPos, fromScreen, mode, cutPoints, roadDrawPoints, drag]);

  const handleMouseUp = useCallback(() => {
    drag.endDrag();
    viewport.endPan();
  }, [drag, viewport]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    if (drag.isDragging) return;
    const pos = getSvgPos(e);
    const normalized = fromScreen(pos.x, pos.y);

    if (mode === 'cut') {
      if (cutPoints.length === 0) {
        setCutPoints([normalized]);
        setCutMousePos(null);
      } else if (cutPoints.length === 1) {
        const cutStart = cutPoints[0];
        const cutEnd = normalized;
        const mid = { x: (cutStart.x + cutEnd.x) / 2, y: (cutStart.y + cutEnd.y) / 2 };
        const targetLot = lots.find(lot => pointInPolygon(mid, lot.vertices));
        if (targetLot && onCutLot) {
          onCutLot(targetLot.id, cutStart, cutEnd);
        }
        setCutPoints([]);
        setCutMousePos(null);
      }
      return;
    }

    if (mode === 'drawRoad') {
      setRoadDrawPoints(prev => [...prev, normalized]);
      return;
    }

    if (mode === 'clipart' && clipartType) {
      // Place clipart on the lot under cursor
      const targetLot = lots.find(lot => pointInPolygon(normalized, lot.vertices));
      if (targetLot && onUpdateLotAnnotations) {
        const cx = targetLot.vertices.reduce((s, v) => s + v.x, 0) / targetLot.vertices.length;
        const cy = targetLot.vertices.reduce((s, v) => s + v.y, 0) / targetLot.vertices.length;
        const relPos = { x: normalized.x - cx + 0.5, y: normalized.y - cy + 0.5 };
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
    }
  }, [readOnly, mode, getSvgPos, fromScreen, cutPoints, lots, onCutLot, onSelectLot, onSelectRoad, clipartType, onUpdateLotAnnotations, drag.isDragging]);

  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    if (mode === 'drawRoad' && roadDrawPoints.length >= 2 && onFinishRoadDraw) {
      e.preventDefault();
      e.stopPropagation();
      onFinishRoadDraw(roadDrawPoints);
      setRoadDrawPoints([]);
      setRoadDrawMousePos(null);
    }
    // Double-click on empty = reset view
    if (mode === 'select') {
      viewport.resetView();
    }
  }, [mode, roadDrawPoints, onFinishRoadDraw, viewport]);

  const handleLotClick = useCallback((lotId: string, e: React.MouseEvent) => {
    if (mode === 'clipart') return; // handled in canvas click
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

  const sideLength = Math.sqrt(parentAreaSqm);

  const getDimensionLabel = (p1: Point2D, p2: Point2D): string => {
    const dx = Math.abs(p2.x - p1.x) * sideLength;
    const dy = Math.abs(p2.y - p1.y) * sideLength;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return `${Math.round(dist)}m`;
  };

  const svgCursor = viewport.isSpaceDown()
    ? 'grab'
    : mode === 'cut' || mode === 'drawRoad' ? 'crosshair'
    : mode === 'clipart' ? 'cell'
    : 'default';

  // Detect lots below minimum area
  const tooSmallLotIds = useMemo(() => {
    return new Set(lots.filter(l => l.areaSqm < minLotAreaSqm).map(l => l.id));
  }, [lots, minLotAreaSqm]);

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

        {/* Roads */}
        {showRoads && roads.map(road => {
          if (road.path.length < 2) return null;
          const pathPoints = road.path.map(p => toScreen(p));
          const roadWidthPx = (road.widthM / sideLength) * (CANVAS_W - 2 * PADDING);
          const isExisting = (road as any).isExisting;
          const isRoadSelected = road.id === selectedRoadId;
          
          return (
            <g key={road.id}>
              <line
                x1={pathPoints[0].x} y1={pathPoints[0].y}
                x2={pathPoints[pathPoints.length - 1].x} y2={pathPoints[pathPoints.length - 1].y}
                stroke="transparent" strokeWidth={Math.max(20, roadWidthPx + 10)}
                className={readOnly || mode !== 'select' ? '' : 'cursor-pointer'}
                onClick={e => !readOnly && handleRoadClick(road.id, e)}
              />
              <line
                x1={pathPoints[0].x} y1={pathPoints[0].y}
                x2={pathPoints[pathPoints.length - 1].x} y2={pathPoints[pathPoints.length - 1].y}
                stroke={isRoadSelected ? 'hsl(var(--primary))' : isExisting ? '#92400e' : '#9ca3af'}
                strokeWidth={Math.max(isExisting ? 6 : 4, roadWidthPx)}
                strokeLinecap="round"
                strokeDasharray={isExisting ? 'none' : '6 3'}
                opacity={isRoadSelected ? 0.8 : isExisting ? 0.6 : 0.4}
                className={readOnly || mode !== 'select' ? '' : 'cursor-pointer'}
                onClick={e => !readOnly && handleRoadClick(road.id, e)}
              />
              {isRoadSelected && (
                <line
                  x1={pathPoints[0].x} y1={pathPoints[0].y}
                  x2={pathPoints[pathPoints.length - 1].x} y2={pathPoints[pathPoints.length - 1].y}
                  stroke="hsl(var(--primary))"
                  strokeWidth={Math.max(isExisting ? 8 : 6, roadWidthPx + 4)}
                  strokeLinecap="round" opacity={0.2} className="pointer-events-none"
                />
              )}
              {/* Road label */}
              {(() => {
                const mx = (pathPoints[0].x + pathPoints[pathPoints.length - 1].x) / 2;
                const my = (pathPoints[0].y + pathPoints[pathPoints.length - 1].y) / 2;
                const dx = pathPoints[pathPoints.length - 1].y - pathPoints[0].y;
                const dy = pathPoints[0].x - pathPoints[pathPoints.length - 1].x;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const off = isExisting ? 14 : 8;
                const ox = (dx / len) * off;
                const oy = (dy / len) * off;
                return (
                  <g>
                    <rect x={mx + ox - 35} y={my + oy - 7} width={70} height={14} rx={3}
                      fill={isRoadSelected ? 'hsl(var(--primary))' : isExisting ? 'hsl(30, 70%, 95%)' : 'hsl(var(--background))'}
                      fillOpacity={isRoadSelected ? 0.15 : 0.9}
                      stroke={isRoadSelected ? 'hsl(var(--primary))' : isExisting ? '#92400e' : '#9ca3af'}
                      strokeWidth={isRoadSelected ? 1.5 : 0.5} strokeOpacity={isRoadSelected ? 0.8 : 0.5}
                    />
                    <text x={mx + ox} y={my + oy} textAnchor="middle" dominantBaseline="middle" fontSize={7}
                      fontWeight={isRoadSelected || isExisting ? 'bold' : 'normal'}
                      fill={isRoadSelected ? 'hsl(var(--primary))' : isExisting ? '#92400e' : '#6b7280'}>
                      {road.name} ({road.widthM}m)
                    </text>
                  </g>
                );
              })()}
              {/* Delete button on selected road */}
              {isRoadSelected && !isExisting && !readOnly && onDeleteRoad && (() => {
                const mx = (pathPoints[0].x + pathPoints[pathPoints.length - 1].x) / 2;
                const my = (pathPoints[0].y + pathPoints[pathPoints.length - 1].y) / 2;
                const dx = pathPoints[pathPoints.length - 1].y - pathPoints[0].y;
                const dy = pathPoints[0].x - pathPoints[pathPoints.length - 1].x;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const off = 8;
                const ox = -(dx / len) * (off + 14);
                const oy = -(dy / len) * (off + 14);
                return (
                  <g className="cursor-pointer" onClick={e => { e.stopPropagation(); onDeleteRoad(road.id); }}>
                    <circle cx={mx + ox} cy={my + oy} r={10} fill="hsl(var(--destructive))" fillOpacity={0.9} />
                    <text x={mx + ox} y={my + oy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="white" fontWeight="bold" className="pointer-events-none select-none">✕</text>
                  </g>
                );
              })()}
            </g>
          );
        })}

        {/* Lots */}
        {lots.map(lot => {
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
              {/* Lot polygon fill — draggable when selected */}
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

              {/* Too small warning */}
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

              {/* Edge hit targets with resize cursor — now functional */}
              {!readOnly && mode === 'select' && lot.vertices.map((v, i) => {
                const next = lot.vertices[(i + 1) % lot.vertices.length];
                const sv = toScreen(v);
                const sn = toScreen(next);
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

              {/* Context menu (floating toolbar) on selected lot */}
              {contextMenuLotId === lot.id && !readOnly && mode === 'select' && (
                <g>
                  <rect x={cx - 60} y={cy - 45} width={120} height={28} rx={8}
                    fill="hsl(var(--background))" fillOpacity={0.95}
                    stroke="hsl(var(--border))" strokeWidth={1} />
                  {/* Split */}
                  {onSplitLot && (
                    <g className="cursor-pointer" onClick={e => { e.stopPropagation(); onSplitLot(lot.id); setContextMenuLotId(null); }}>
                      <rect x={cx - 56} y={cy - 42} width={24} height={22} rx={4} fill="transparent" />
                      <text x={cx - 44} y={cy - 31} textAnchor="middle" dominantBaseline="middle" fontSize={14} className="pointer-events-none select-none">✂️</text>
                    </g>
                  )}
                  {/* Duplicate */}
                  {onDuplicateLot && (
                    <g className="cursor-pointer" onClick={e => { e.stopPropagation(); onDuplicateLot(lot.id); setContextMenuLotId(null); }}>
                      <rect x={cx - 28} y={cy - 42} width={24} height={22} rx={4} fill="transparent" />
                      <text x={cx - 16} y={cy - 31} textAnchor="middle" dominantBaseline="middle" fontSize={14} className="pointer-events-none select-none">📋</text>
                    </g>
                  )}
                  {/* Clipart */}
                  <g className="cursor-pointer" onClick={e => { e.stopPropagation(); setShowClipartPalette(true); setContextMenuLotId(null); onModeChange?.('clipart'); }}>
                    <rect x={cx} y={cy - 42} width={24} height={22} rx={4} fill="transparent" />
                    <text x={cx + 12} y={cy - 31} textAnchor="middle" dominantBaseline="middle" fontSize={14} className="pointer-events-none select-none">🎨</text>
                  </g>
                  {/* Delete */}
                  {onDeleteLot && (
                    <g className="cursor-pointer" onClick={e => { e.stopPropagation(); onDeleteLot(lot.id); setContextMenuLotId(null); }}>
                      <rect x={cx + 28} y={cy - 42} width={24} height={22} rx={4} fill="transparent" />
                      <text x={cx + 40} y={cy - 31} textAnchor="middle" dominantBaseline="middle" fontSize={14} className="pointer-events-none select-none">🗑️</text>
                    </g>
                  )}
                </g>
              )}
            </g>
          );
        })}

        {/* Merge button when multiple lots selected */}
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

        {/* Cut line preview */}
        {mode === 'cut' && cutPoints.length === 1 && cutMousePos && (
          <g className="pointer-events-none">
            <line x1={toScreen(cutPoints[0]).x} y1={toScreen(cutPoints[0]).y} x2={cutMousePos.x} y2={cutMousePos.y}
              stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="6 4" opacity={0.8} />
            <circle cx={toScreen(cutPoints[0]).x} cy={toScreen(cutPoints[0]).y} r={5} fill="hsl(var(--destructive))" opacity={0.9} />
            <circle cx={cutMousePos.x} cy={cutMousePos.y} r={4} fill="hsl(var(--destructive))" opacity={0.5} />
          </g>
        )}
        {mode === 'cut' && cutPoints.length === 1 && !cutMousePos && (
          <circle cx={toScreen(cutPoints[0]).x} cy={toScreen(cutPoints[0]).y} r={5} fill="hsl(var(--destructive))" opacity={0.9} className="pointer-events-none" />
        )}

        {/* Road drawing preview */}
        {mode === 'drawRoad' && roadDrawPoints.length > 0 && (
          <g className="pointer-events-none">
            {roadDrawPoints.map((p, i) => {
              if (i === 0) return null;
              const prev = toScreen(roadDrawPoints[i - 1]);
              const curr = toScreen(p);
              return <line key={`road-draw-seg-${i}`} x1={prev.x} y1={prev.y} x2={curr.x} y2={curr.y} stroke="hsl(var(--primary))" strokeWidth={4} strokeLinecap="round" opacity={0.7} />;
            })}
            {roadDrawMousePos && (
              <line x1={toScreen(roadDrawPoints[roadDrawPoints.length - 1]).x} y1={toScreen(roadDrawPoints[roadDrawPoints.length - 1]).y}
                x2={roadDrawMousePos.x} y2={roadDrawMousePos.y}
                stroke="hsl(var(--primary))" strokeWidth={3} strokeLinecap="round" strokeDasharray="6 4" opacity={0.5} />
            )}
            {roadDrawPoints.map((p, i) => {
              const s = toScreen(p);
              return <circle key={`road-draw-pt-${i}`} cx={s.x} cy={s.y} r={4} fill="white" stroke="hsl(var(--primary))" strokeWidth={2} />;
            })}
          </g>
        )}

        {/* Mode instruction overlay */}
        {mode === 'cut' && (
          <g className="pointer-events-none">
            <rect x={CANVAS_W / 2 - 120} y={CANVAS_H - 24} width={240} height={20} rx={4} fill="hsl(var(--destructive))" fillOpacity={0.1} />
            <text x={CANVAS_W / 2} y={CANVAS_H - 14} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="hsl(var(--destructive))" fontWeight="600">
              ✂ Cliquez 2 points pour tracer la ligne de découpe
            </text>
          </g>
        )}
        {mode === 'drawRoad' && (
          <g className="pointer-events-none">
            <rect x={CANVAS_W / 2 - 140} y={CANVAS_H - 24} width={280} height={20} rx={4} fill="hsl(var(--primary))" fillOpacity={0.1} />
            <text x={CANVAS_W / 2} y={CANVAS_H - 14} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="hsl(var(--primary))" fontWeight="600">
              🛣 Cliquez pour tracer la voie • Double-clic pour terminer
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
          Del: suppr • Ctrl+D: dupliquer • G: grille • S: snap • Espace: pan • Molette: zoom
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

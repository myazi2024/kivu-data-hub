import React, { useRef, useState, useCallback } from 'react';
import { SubdivisionLot, SubdivisionRoad, LOT_COLORS, USAGE_LABELS, Point2D } from './types';

interface ParcelSide {
  length?: number | string;
  orientation?: string;
  [key: string]: any;
}

interface LotCanvasProps {
  lots: SubdivisionLot[];
  roads: SubdivisionRoad[];
  parentAreaSqm: number;
  parentVertices?: Point2D[];
  parentSides?: ParcelSide[];
  selectedLotId: string | null;
  onSelectLot: (id: string | null) => void;
  onUpdateLot: (id: string, vertices: Point2D[]) => void;
  selectedRoadId?: string | null;
  onSelectRoad?: (id: string | null) => void;
  onDeleteRoad?: (id: string) => void;
  showGrid?: boolean;
  showDimensions?: boolean;
  showLotNumbers?: boolean;
  showAreas?: boolean;
  showRoads?: boolean;
  showNorth?: boolean;
  showLegend?: boolean;
  showScale?: boolean;
  showOwnerNames?: boolean;
  readOnly?: boolean;
}

const CANVAS_W = 600;
const CANVAS_H = 400;
const PADDING = 30;

const LotCanvas: React.FC<LotCanvasProps> = ({
  lots, roads, parentAreaSqm, parentVertices, parentSides, selectedLotId, onSelectLot, onUpdateLot,
  showGrid = true, showDimensions = true, showLotNumbers = true,
  showAreas = true, showRoads = true, showNorth = true,
  showLegend = false, showScale = true, showOwnerNames = false,
  readOnly = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingVertex, setDraggingVertex] = useState<{ lotId: string; vertexIdx: number } | null>(null);

  const toScreen = useCallback((p: Point2D) => ({
    x: PADDING + p.x * (CANVAS_W - 2 * PADDING),
    y: PADDING + (1 - p.y) * (CANVAS_H - 2 * PADDING), // Flip Y
  }), []);

  const fromScreen = useCallback((sx: number, sy: number): Point2D => ({
    x: Math.max(0, Math.min(1, (sx - PADDING) / (CANVAS_W - 2 * PADDING))),
    y: Math.max(0, Math.min(1, 1 - (sy - PADDING) / (CANVAS_H - 2 * PADDING))),
  }), []);

  const getMousePos = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handleMouseDown = useCallback((lotId: string, vertexIdx: number, e: React.MouseEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    setDraggingVertex({ lotId, vertexIdx });
  }, [readOnly]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingVertex) return;
    const pos = getMousePos(e);
    const normalized = fromScreen(pos.x, pos.y);
    const lot = lots.find(l => l.id === draggingVertex.lotId);
    if (!lot) return;
    const newVertices = [...lot.vertices];
    newVertices[draggingVertex.vertexIdx] = normalized;
    onUpdateLot(draggingVertex.lotId, newVertices);
  }, [draggingVertex, lots, getMousePos, fromScreen, onUpdateLot]);

  const handleMouseUp = useCallback(() => {
    setDraggingVertex(null);
  }, []);

  const handleLotClick = useCallback((lotId: string) => {
    onSelectLot(lotId === selectedLotId ? null : lotId);
  }, [selectedLotId, onSelectLot]);

  const sideLength = Math.sqrt(parentAreaSqm);

  const getDimensionLabel = (p1: Point2D, p2: Point2D): string => {
    const dx = Math.abs(p2.x - p1.x) * sideLength;
    const dy = Math.abs(p2.y - p1.y) * sideLength;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return `${Math.round(dist)}m`;
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      className="w-full h-auto bg-white dark:bg-gray-950 rounded-lg"
      style={{ minHeight: 280 }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
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

      {/* Parent parcel outline — actual shape or fallback rectangle */}
      {parentVertices && parentVertices.length >= 3 ? (
        <polygon
          points={parentVertices.map(v => {
            const s = toScreen(v);
            return `${s.x},${s.y}`;
          }).join(' ')}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeDasharray="6 3"
          opacity={0.5}
        />
      ) : (
        <rect
          x={PADDING}
          y={PADDING}
          width={CANVAS_W - 2 * PADDING}
          height={CANVAS_H - 2 * PADDING}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeDasharray="6 3"
          opacity={0.5}
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
                  x={mx + offsetX - 22}
                  y={my + offsetY - 8}
                  width={44}
                  height={orientationLabel ? 22 : 14}
                  rx={3}
                  fill="hsl(var(--background))"
                  fillOpacity={0.85}
                  stroke="hsl(var(--primary))"
                  strokeWidth={0.5}
                  strokeOpacity={0.4}
                />
                <text
                  x={mx + offsetX}
                  y={my + offsetY + (orientationLabel ? -1 : 2)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={9}
                  fontWeight="bold"
                  fill="hsl(var(--primary))"
                  className="select-none pointer-events-none"
                >
                  {label}
                </text>
                {orientationLabel && (
                  <text
                    x={mx + offsetX}
                    y={my + offsetY + 10}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={7}
                    fill="hsl(var(--muted-foreground))"
                    className="select-none pointer-events-none"
                  >
                    {orientationLabel}
                  </text>
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
        
        return (
          <g key={road.id}>
            <line
              x1={pathPoints[0].x}
              y1={pathPoints[0].y}
              x2={pathPoints[pathPoints.length - 1].x}
              y2={pathPoints[pathPoints.length - 1].y}
              stroke={isExisting ? '#92400e' : '#9ca3af'}
              strokeWidth={Math.max(isExisting ? 6 : 4, roadWidthPx)}
              strokeLinecap="round"
              strokeDasharray={isExisting ? 'none' : '6 3'}
              opacity={isExisting ? 0.6 : 0.4}
            />
            {/* Road label */}
            {(() => {
              const mx = (pathPoints[0].x + pathPoints[pathPoints.length - 1].x) / 2;
              const my = (pathPoints[0].y + pathPoints[pathPoints.length - 1].y) / 2;
              // Offset label outward from the edge
              const dx = pathPoints[pathPoints.length - 1].y - pathPoints[0].y;
              const dy = pathPoints[0].x - pathPoints[pathPoints.length - 1].x;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              const off = isExisting ? 14 : 8;
              const ox = (dx / len) * off;
              const oy = (dy / len) * off;
              
              return (
                <g>
                  <rect
                    x={mx + ox - 35}
                    y={my + oy - 7}
                    width={70}
                    height={14}
                    rx={3}
                    fill={isExisting ? 'hsl(30, 70%, 95%)' : 'hsl(var(--background))'}
                    fillOpacity={0.9}
                    stroke={isExisting ? '#92400e' : '#9ca3af'}
                    strokeWidth={0.5}
                    strokeOpacity={0.5}
                  />
                  <text
                    x={mx + ox}
                    y={my + oy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={7}
                    fontWeight={isExisting ? 'bold' : 'normal'}
                    fill={isExisting ? '#92400e' : '#6b7280'}
                  >
                    {road.name} ({road.widthM}m)
                  </text>
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
        const color = lot.color || LOT_COLORS[lot.intendedUse];

        // Centroid for labels
        const cx = screenVertices.reduce((s, p) => s + p.x, 0) / screenVertices.length;
        const cy = screenVertices.reduce((s, p) => s + p.y, 0) / screenVertices.length;

        return (
          <g key={lot.id}>
            {/* Lot polygon */}
            <polygon
              points={pointsStr}
              fill={color}
              fillOpacity={isSelected ? 0.35 : 0.2}
              stroke={isSelected ? 'hsl(var(--primary))' : color}
              strokeWidth={isSelected ? 2.5 : 1.5}
              className={readOnly ? '' : 'cursor-pointer'}
              onClick={() => handleLotClick(lot.id)}
            />

            {/* Lot number */}
            {showLotNumbers && (
              <text
                x={cx}
                y={cy - (showAreas ? 6 : 0)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={14}
                fontWeight="bold"
                fill={color}
                className="select-none pointer-events-none"
              >
                {lot.lotNumber}
              </text>
            )}

            {/* Area */}
            {showAreas && (
              <text
                x={cx}
                y={cy + (showLotNumbers ? 10 : 0)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={9}
                fill="#666"
                className="select-none pointer-events-none"
              >
                {lot.areaSqm.toLocaleString()} m²
              </text>
            )}

            {/* Owner name */}
            {showOwnerNames && lot.ownerName && (
              <text
                x={cx}
                y={cy + 22}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={7}
                fill="#888"
                className="select-none pointer-events-none"
              >
                {lot.ownerName}
              </text>
            )}

            {/* Road-served indicator */}
            {lot.notes?.includes('route existante') && (
              <g className="select-none pointer-events-none">
                <rect
                  x={cx - 28}
                  y={cy + (showAreas ? 18 : 10)}
                  width={56}
                  height={12}
                  rx={2}
                  fill="#92400e"
                  fillOpacity={0.15}
                  stroke="#92400e"
                  strokeWidth={0.5}
                  strokeOpacity={0.4}
                />
                <text
                  x={cx}
                  y={cy + (showAreas ? 24 : 16)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={6}
                  fill="#92400e"
                  fontWeight="600"
                >
                  🛣 Route existante
                </text>
              </g>
            )}

            {/* Dimensions on edges */}
            {showDimensions && lot.vertices.map((v, i) => {
              const next = lot.vertices[(i + 1) % lot.vertices.length];
              const sv = toScreen(v);
              const sn = toScreen(next);
              const mx = (sv.x + sn.x) / 2;
              const my = (sv.y + sn.y) / 2;
              const label = getDimensionLabel(v, next);
              // Offset label outward slightly
              const dx = sn.y - sv.y;
              const dy = sv.x - sn.x;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              const offsetX = (dx / len) * 10;
              const offsetY = (dy / len) * 10;
              return (
                <text
                  key={i}
                  x={mx + offsetX}
                  y={my + offsetY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={7}
                  fill="#999"
                  className="select-none pointer-events-none"
                >
                  {label}
                </text>
              );
            })}

            {/* Draggable vertices */}
            {!readOnly && isSelected && screenVertices.map((sv, i) => (
              <circle
                key={i}
                cx={sv.x}
                cy={sv.y}
                r={5}
                fill="white"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                className="cursor-grab active:cursor-grabbing"
                onMouseDown={e => handleMouseDown(lot.id, i, e)}
              />
            ))}
          </g>
        );
      })}

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
  );
};

export default LotCanvas;

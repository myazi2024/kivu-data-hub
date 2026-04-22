import React, { useMemo } from 'react';
import { LOT_COLORS, USAGE_LABELS, COMMON_SPACE_COLORS, COMMON_SPACE_LABELS, type Point2D } from './types';

/**
 * Read-only SVG renderer for a subdivision plan.
 * Used by admin screens to preview lots/roads/common spaces from
 * `subdivision_plan_data` (or persisted `subdivision_lots` rows) without
 * embedding the full interactive LotCanvas editor.
 */

interface MiniLot {
  lotNumber?: string | number;
  vertices?: Point2D[];
  areaSqm?: number;
  intendedUse?: keyof typeof LOT_COLORS;
  color?: string;
}

interface MiniRoad {
  name?: string;
  widthM?: number;
  surfaceType?: string;
  path?: Point2D[];
}

interface MiniCommonSpace {
  name?: string;
  type?: keyof typeof COMMON_SPACE_COLORS;
  vertices?: Point2D[];
  color?: string;
}

interface SubdivisionMiniMapProps {
  parentVertices?: Point2D[];
  lots?: MiniLot[];
  roads?: MiniRoad[];
  commonSpaces?: MiniCommonSpace[];
  width?: number;
  height?: number;
  showLegend?: boolean;
  showLotNumbers?: boolean;
}

const PADDING = 12;

export const SubdivisionMiniMap: React.FC<SubdivisionMiniMapProps> = ({
  parentVertices,
  lots = [],
  roads = [],
  commonSpaces = [],
  width = 520,
  height = 320,
  showLegend = true,
  showLotNumbers = true,
}) => {
  const innerW = width - PADDING * 2;
  const innerH = height - PADDING * 2 - (showLegend ? 28 : 0);

  // Default parent = unit square if not provided
  const parent = useMemo<Point2D[]>(() => {
    if (parentVertices && parentVertices.length >= 3) return parentVertices;
    return [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
  }, [parentVertices]);

  // Compute bounds of normalized space (clamped 0..1)
  const project = (p: Point2D) => ({
    x: PADDING + p.x * innerW,
    y: PADDING + p.y * innerH,
  });

  const polyPoints = (pts: Point2D[]) =>
    pts.map(p => {
      const q = project(p);
      return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;
    }).join(' ');

  const centroid = (pts: Point2D[]): Point2D => {
    if (!pts?.length) return { x: 0.5, y: 0.5 };
    const sum = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / pts.length, y: sum.y / pts.length };
  };

  const totalLots = lots.length;
  const totalRoads = roads.length;
  const totalCommon = commonSpaces.length;

  return (
    <div className="w-full overflow-hidden rounded-md border border-border bg-card">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label="Aperçu du plan de lotissement"
      >
        {/* Background grid */}
        <defs>
          <pattern id="mini-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--muted))" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect x={PADDING} y={PADDING} width={innerW} height={innerH} fill="url(#mini-grid)" opacity={0.5} />

        {/* Parent parcel outline */}
        <polygon
          points={polyPoints(parent)}
          fill="hsl(var(--background))"
          stroke="hsl(var(--foreground))"
          strokeWidth={1.5}
        />

        {/* Common spaces (under lots) */}
        {commonSpaces.map((cs, i) => {
          if (!cs.vertices || cs.vertices.length < 3) return null;
          const fill = cs.color || (cs.type ? COMMON_SPACE_COLORS[cs.type] : '#a855f7');
          return (
            <polygon
              key={`cs-${i}`}
              points={polyPoints(cs.vertices)}
              fill={fill}
              fillOpacity={0.35}
              stroke={fill}
              strokeWidth={1}
            />
          );
        })}

        {/* Lots */}
        {lots.map((lot, i) => {
          if (!lot.vertices || lot.vertices.length < 3) return null;
          const fill = lot.color || (lot.intendedUse ? LOT_COLORS[lot.intendedUse] : '#22c55e');
          const c = project(centroid(lot.vertices));
          return (
            <g key={`lot-${i}`}>
              <polygon
                points={polyPoints(lot.vertices)}
                fill={fill}
                fillOpacity={0.45}
                stroke={fill}
                strokeWidth={1}
              />
              {showLotNumbers && (
                <text
                  x={c.x}
                  y={c.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontWeight="600"
                  fill="hsl(var(--foreground))"
                  style={{ pointerEvents: 'none' }}
                >
                  {lot.lotNumber ?? i + 1}
                </text>
              )}
            </g>
          );
        })}

        {/* Roads */}
        {roads.map((r, i) => {
          if (!r.path || r.path.length < 2) return null;
          const widthPx = Math.max(2, Math.min(10, (r.widthM || 4) * 0.8));
          return (
            <polyline
              key={`r-${i}`}
              points={polyPoints(r.path)}
              fill="none"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={widthPx}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />
          );
        })}

        {/* Empty state */}
        {totalLots === 0 && totalRoads === 0 && totalCommon === 0 && (
          <text
            x={width / 2}
            y={height / 2}
            textAnchor="middle"
            fontSize={11}
            fill="hsl(var(--muted-foreground))"
          >
            Aucun élément à afficher
          </text>
        )}

        {/* Legend */}
        {showLegend && (
          <g transform={`translate(${PADDING}, ${PADDING + innerH + 8})`}>
            <text x={0} y={10} fontSize={10} fill="hsl(var(--muted-foreground))">
              {totalLots} lot{totalLots > 1 ? 's' : ''} · {totalRoads} voie{totalRoads > 1 ? 's' : ''} · {totalCommon} espace{totalCommon > 1 ? 's' : ''} commun{totalCommon > 1 ? 's' : ''}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

export default SubdivisionMiniMap;

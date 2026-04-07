import React, { useMemo } from 'react';

interface Coordinate {
  lat: number | string;
  lng: number | string;
  borne: string;
}

interface ParcelSide {
  name: string;
  length: string;
  orientation?: string;
}

interface BuildingShape {
  id?: string;
  vertices?: { lat: number; lng: number }[];
  sides?: { name: string; length: string }[];
  areaSqm?: number;
  perimeterM?: number;
  // Rétro-compatibilité
  type?: string;
  size?: number;
  rotation?: number;
  position?: { lat: number; lng: number };
}

interface RoadSideInfo {
  sideIndex?: number;
  index?: number;
  roadType?: string;
  roadName?: string;
  roadWidth?: number | string;
  borderType?: string;
  bordersRoad?: boolean;
  isConfirmed?: boolean;
  name?: string;
  orientation?: string;
}

interface ParcelSketchSVGProps {
  coordinates: Coordinate[];
  parcelSides: ParcelSide[];
  buildingShapes: BuildingShape[];
  roadSides?: RoadSideInfo[];
  servitude?: { hasServitude: boolean; width?: number };
  height?: number;
}

const SHAPE_LABELS: Record<string, string> = {
  circle: 'C', square: 'Ca', rectangle: 'R', trapeze: 'T', polygon: 'P',
};

const ROAD_TYPE_LABELS: Record<string, string> = {
  nationale: 'Route Nationale',
  provinciale: 'Route Provinciale',
  communale: 'Route Communale',
  locale: 'Route Locale',
  piste: 'Piste',
  chemin: 'Chemin',
};

const SVG_W = 440;

const ParcelSketchSVG: React.FC<ParcelSketchSVGProps> = ({
  coordinates, parcelSides, buildingShapes, roadSides = [], servitude, height: heightProp,
}) => {
  const validCoords = useMemo(
    () => coordinates.filter((c) => c.lat && c.lng).map(c => ({ ...c, lat: Number(c.lat), lng: Number(c.lng) })),
    [coordinates],
  );

  // Compute dynamic height based on parcel real-world aspect ratio
  const dynamicHeight = useMemo(() => {
    if (heightProp) return heightProp;
    if (validCoords.length < 3) return 400;

    const lats = validCoords.map(c => c.lat);
    const lngs = validCoords.map(c => c.lng);
    const avgLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const metersPerDegLat = 111320;
    const metersPerDegLng = 111320 * Math.cos((avgLat * Math.PI) / 180);

    const rangeXm = (Math.max(...lngs) - Math.min(...lngs)) * metersPerDegLng;
    const rangeYm = (Math.max(...lats) - Math.min(...lats)) * metersPerDegLat;

    const aspect = rangeXm > 0 ? rangeYm / rangeXm : 1;
    // Clamp height between 300 and 600, base width is SVG_W
    const computed = Math.round(SVG_W * Math.min(Math.max(aspect, 0.5), 1.4));
    return Math.max(300, Math.min(600, computed));
  }, [validCoords, heightProp]);

  const height = dynamicHeight;

  const { points, bounds, cx, cy, metersPerPx } = useMemo(() => {
    if (validCoords.length < 3) return { points: [], bounds: { w: 0, h: 0 }, cx: 0, cy: 0, metersPerPx: 1 };

    const lats = validCoords.map((c) => c.lat);
    const lngs = validCoords.map((c) => c.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const padding = 80;
    const svgW = SVG_W;
    const svgH = height;
    const usableW = svgW - padding * 2;
    const usableH = svgH - padding * 2;

    const rangeX = maxLng - minLng || 0.0001;
    const rangeY = maxLat - minLat || 0.0001;
    // Scale factor x2 for better visibility
    const scale = Math.min(usableW / rangeX, usableH / rangeY);

    // Calculate meters per pixel for scale bar
    const avgLat = (minLat + maxLat) / 2;
    const metersPerDegLng = 111320 * Math.cos((avgLat * Math.PI) / 180);
    const mPerPx = metersPerDegLng / scale;

    const mapped = validCoords.map((c) => ({
      x: padding + (c.lng - minLng) * scale + (usableW - rangeX * scale) / 2,
      y: padding + (maxLat - c.lat) * scale + (usableH - rangeY * scale) / 2,
      borne: c.borne, lat: c.lat, lng: c.lng,
    }));

    const centroidX = mapped.reduce((s, p) => s + p.x, 0) / mapped.length;
    const centroidY = mapped.reduce((s, p) => s + p.y, 0) / mapped.length;

    return { points: mapped, bounds: { w: svgW, h: svgH }, cx: centroidX, cy: centroidY, metersPerPx: mPerPx };
  }, [validCoords, height]);

  if (points.length < 3) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground bg-muted/30 rounded-xl">
        Pas assez de bornes pour afficher le croquis
      </div>
    );
  }

  const polygonPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

  // Road sides indexed
  const roadSideMap = new Map<number, RoadSideInfo>();
  roadSides.forEach((rs) => {
    const idx = parseInt(String(rs.sideIndex ?? rs.index), 10);
    if (!isNaN(idx) && idx >= 0) roadSideMap.set(idx, rs);
  });

  // Scale bar calculation — pick a nice round number
  const niceScales = [1, 2, 5, 10, 15, 20, 25, 50, 100, 200, 500];
  const rawBarPx = 60;
  const rawBarMeters = rawBarPx * metersPerPx;
  const scaleMeters = niceScales.find(n => n >= rawBarMeters * 0.6) || Math.round(rawBarMeters);
  const scaleBarPx = scaleMeters / metersPerPx;

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${bounds.w} ${bounds.h}`}
        className="w-full rounded-xl border border-border/50 bg-muted/20"
        style={{ height, maxHeight: height }}
        role="img"
        aria-label="Croquis de la parcelle"
      >
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.15" />
          </pattern>
          <marker id="arrow-n" markerWidth="6" markerHeight="6" refX="3" refY="6" orient="auto">
            <path d="M0,6 L3,0 L6,6" fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.2" />
          </marker>
        </defs>

        {/* ─── Parcelle remplie ─── */}
        <path d={polygonPath} fill="url(#hatch)" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinejoin="round" />

        {/* ─── Routes — lignes parallèles avec info ─── */}
        {points.map((p, i) => {
          const rs = roadSideMap.get(i);
          if (!rs) return null;
          const next = points[(i + 1) % points.length];

          // Direction perpendiculaire outward (away from centroid)
          const dx = next.x - p.x;
          const dy = next.y - p.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          // Perpendicular unit vector
          let nx = -dy / len;
          let ny = dx / len;
          // Ensure it points outward from centroid
          const midX = (p.x + next.x) / 2;
          const midY = (p.y + next.y) / 2;
          const toCx = cx - midX;
          const toCy = cy - midY;
          if (nx * toCx + ny * toCy > 0) { nx = -nx; ny = -ny; }

          const roadOffset = 24; // px offset for the parallel road line

          // Road dashed line on the parcel side
          const roadLine = (
            <line
              key={`road-line-${i}`}
              x1={p.x} y1={p.y} x2={next.x} y2={next.y}
              stroke="hsl(var(--destructive))" strokeWidth="3" strokeDasharray="8 4" opacity="0.7"
            />
          );

          // Parallel line outside
          const px1 = p.x + nx * roadOffset;
          const py1 = p.y + ny * roadOffset;
          const px2 = next.x + nx * roadOffset;
          const py2 = next.y + ny * roadOffset;

          const parallelLine = (
            <line
              key={`road-parallel-${i}`}
              x1={px1} y1={py1} x2={px2} y2={py2}
              stroke="hsl(var(--destructive))" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5"
            />
          );

          // Connector lines at endpoints
          const connectors = (
            <g key={`road-conn-${i}`}>
              <line x1={p.x} y1={p.y} x2={px1} y2={py1} stroke="hsl(var(--destructive))" strokeWidth="0.8" opacity="0.35" />
              <line x1={next.x} y1={next.y} x2={px2} y2={py2} stroke="hsl(var(--destructive))" strokeWidth="0.8" opacity="0.35" />
            </g>
          );

          // Road info label — positioned between parcel side and parallel line
          const labelX = (midX + (midX + nx * roadOffset)) / 2;
          const labelY = (midY + (midY + ny * roadOffset)) / 2;

          // Build label text
          const typeLabel = rs.roadType ? (ROAD_TYPE_LABELS[rs.roadType] || rs.roadType) : '';
          const nameLabel = rs.roadName || '';
          const widthLabel = rs.roadWidth ? `${rs.roadWidth}m` : '';
          const parts = [typeLabel, nameLabel, widthLabel].filter(Boolean);

          // Angle of the side for text rotation
          const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
          // Keep text readable (not upside down)
          const textAngle = (angleDeg > 90 || angleDeg < -90) ? angleDeg + 180 : angleDeg;

          const roadLabel = parts.length > 0 ? (
            <g key={`road-label-${i}`} transform={`translate(${labelX}, ${labelY}) rotate(${textAngle})`}>
              <rect x={-Math.min(parts.join(' · ').length * 3.2, 70)} y={-7} width={Math.min(parts.join(' · ').length * 6.4, 140)} height="14" rx="3"
                fill="hsl(var(--background))" stroke="hsl(var(--destructive))" strokeWidth="0.5" opacity="0.9" />
              <text x="0" y="3.5" textAnchor="middle" fontSize="7.5" fontWeight="500" fill="hsl(var(--destructive))">
                {parts.join(' · ')}
              </text>
            </g>
          ) : null;

          return <g key={`road-group-${i}`}>{roadLine}{parallelLine}{connectors}{roadLabel}</g>;
        })}

        {/* ─── Dimensions des côtés ─── */}
        {points.map((p, i) => {
          const next = points[(i + 1) % points.length];
          const side = parcelSides[i];
          if (!side?.length) return null;
          const midX = (p.x + next.x) / 2;
          const midY = (p.y + next.y) / 2;

          // Offset toward center (inside the polygon) for non-road sides
          const isRoad = roadSideMap.has(i);
          const ddx = midX - cx;
          const ddy = midY - cy;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
          const dir = isRoad ? -1 : 1; // road sides: push inward; others: push outward
          const offsetX = midX + (ddx / dist) * 18 * dir;
          const offsetY = midY + (ddy / dist) * 18 * dir;

          const orientLabel = side.orientation ? ` (${side.orientation})` : '';
          const text = `${side.length}m${orientLabel}`;
          const boxW = Math.max(text.length * 5.5, 36);

          return (
            <g key={`dim-${i}`}>
              <rect x={offsetX - boxW / 2} y={offsetY - 8} width={boxW} height="16" rx="4"
                fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="0.5" />
              <text x={offsetX} y={offsetY + 4} textAnchor="middle" fontSize="9" fontWeight="600" fill="hsl(var(--foreground))">
                {text}
              </text>
            </g>
          );
        })}

        {/* ─── Bornes ─── */}
        {points.map((p, i) => (
          <g key={`borne-${i}`}>
            <circle cx={p.x} cy={p.y} r="10" fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth="2" />
            <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="hsl(var(--primary-foreground))">
              {p.borne}
            </text>
          </g>
        ))}

        {/* ─── Constructions (polygones à partir de vertices) ─── */}
        {buildingShapes.map((shape, i) => {
          if (!shape.vertices || shape.vertices.length < 3) return null;
          
          // Projeter les sommets de la construction dans l'espace SVG
          const lats = validCoords.map(c => c.lat);
          const lngs = validCoords.map(c => c.lng);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);
          
          const padding = 80;
          const usableW = SVG_W - padding * 2;
          const usableH = height - padding * 2;
          const rangeX = (maxLng - minLng) || 0.0001;
          const rangeY = (maxLat - minLat) || 0.0001;
          const scale = Math.min(usableW / rangeX, usableH / rangeY);
          
          const bldPoints = shape.vertices.map(v => ({
            x: padding + (v.lng - minLng) * scale + (usableW - rangeX * scale) / 2,
            y: padding + (maxLat - v.lat) * scale + (usableH - rangeY * scale) / 2,
          }));
          
          const bldPath = bldPoints.map((p, j) => `${j === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';
          
          return (
            <g key={`bld-${i}`}>
              <path d={bldPath} fill="hsl(var(--destructive))" fillOpacity="0.2" stroke="hsl(var(--destructive))" strokeWidth="1.5" strokeDasharray="4 2" />
              {/* Dimensions des côtés de la construction */}
              {bldPoints.map((p, j) => {
                const nextP = bldPoints[(j + 1) % bldPoints.length];
                const side = shape.sides?.[j];
                if (!side) return null;
                const mx = (p.x + nextP.x) / 2;
                const my = (p.y + nextP.y) / 2;
                return (
                  <text key={`bld-dim-${i}-${j}`} x={mx} y={my - 4} textAnchor="middle" fontSize="7" fontWeight="600" fill="hsl(var(--destructive))">
                    {side.length}m
                  </text>
                );
              })}
              {/* Label surface au centre */}
              {shape.areaSqm && (
                <text
                  x={bldPoints.reduce((s, p) => s + p.x, 0) / bldPoints.length}
                  y={bldPoints.reduce((s, p) => s + p.y, 0) / bldPoints.length + 4}
                  textAnchor="middle" fontSize="8" fontWeight="700" fill="hsl(var(--destructive))"
                >
                  {shape.areaSqm.toFixed(1)}m²
                </text>
              )}
            </g>
          );
        })}

        {/* ─── Servitude ─── */}
        {servitude?.hasServitude && (
          <text x={bounds.w - 8} y={bounds.h - 8} textAnchor="end" fontSize="8" fill="hsl(var(--muted-foreground))">
            Servitude: {servitude.width || '?'}m
          </text>
        )}

        {/* ─── Boussole (Nord) ─── */}
        <g transform={`translate(${bounds.w - 30}, 30)`}>
          {/* Circle background */}
          <circle cx="0" cy="0" r="18" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.9" />
          {/* Arrow pointing up (North) */}
          <line x1="0" y1="10" x2="0" y2="-12" stroke="hsl(var(--foreground))" strokeWidth="1.5" markerEnd="url(#arrow-n)" />
          {/* N label */}
          <text x="0" y="-10" textAnchor="middle" fontSize="8" fontWeight="700" fill="hsl(var(--destructive))" dy="-4">N</text>
          {/* Cardinal directions */}
          <text x="0" y="14" textAnchor="middle" fontSize="6" fill="hsl(var(--muted-foreground))">S</text>
          <text x="13" y="3" textAnchor="middle" fontSize="6" fill="hsl(var(--muted-foreground))">E</text>
          <text x="-13" y="3" textAnchor="middle" fontSize="6" fill="hsl(var(--muted-foreground))">O</text>
        </g>

        {/* ─── Barre d'échelle ─── */}
        <g transform={`translate(16, ${bounds.h - 20})`}>
          <line x1="0" y1="0" x2={scaleBarPx} y2="0" stroke="hsl(var(--foreground))" strokeWidth="2" />
          <line x1="0" y1="-4" x2="0" y2="4" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
          <line x1={scaleBarPx} y1="-4" x2={scaleBarPx} y2="4" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
          <text x={scaleBarPx / 2} y="-6" textAnchor="middle" fontSize="8" fontWeight="600" fill="hsl(var(--foreground))">
            {scaleMeters}m
          </text>
        </g>
      </svg>

      {/* Légende */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground px-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary" /> Borne
        </span>
        {roadSideMap.size > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-0.5 bg-destructive" style={{ borderTop: '2px dashed' }} /> Route
          </span>
        )}
        {buildingShapes.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-accent border border-accent-foreground/30" /> Construction
          </span>
        )}
        {servitude?.hasServitude && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0 border-t border-dashed border-muted-foreground" /> Servitude
          </span>
        )}
      </div>
    </div>
  );
};

export default ParcelSketchSVG;

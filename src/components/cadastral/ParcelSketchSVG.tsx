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
  type: string;
  size: number;
  rotation?: number;
  position?: { lat: number; lng: number };
}

interface ParcelSketchSVGProps {
  coordinates: Coordinate[];
  parcelSides: ParcelSide[];
  buildingShapes: BuildingShape[];
  roadSides?: any[];
  servitude?: { hasServitude: boolean; width?: number };
  height?: number;
}

const SHAPE_LABELS: Record<string, string> = {
  circle: 'C',
  square: 'Ca',
  rectangle: 'R',
  trapeze: 'T',
  polygon: 'P',
};

const SHAPE_NAMES: Record<string, string> = {
  circle: 'Cercle',
  square: 'Carré',
  rectangle: 'Rectangle',
  trapeze: 'Trapèze',
  polygon: 'Polygone',
};

/**
 * Composant SVG statique léger pour représenter le croquis de la parcelle
 * dans le récapitulatif — remplace le composant Leaflet lourd.
 */
const ParcelSketchSVG: React.FC<ParcelSketchSVGProps> = ({
  coordinates,
  parcelSides,
  buildingShapes,
  roadSides = [],
  servitude,
  height = 260,
}) => {
  const validCoords = useMemo(
    () => coordinates.filter((c) => c.lat && c.lng),
    [coordinates],
  );

  const { points, bounds, cx, cy } = useMemo(() => {
    if (validCoords.length < 3) return { points: [], bounds: { w: 0, h: 0 }, cx: 0, cy: 0 };

    const lats = validCoords.map((c) => c.lat);
    const lngs = validCoords.map((c) => c.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Conversion relative en pixels — garder un padding de 60px
    const padding = 60;
    const svgW = 400;
    const svgH = height;
    const usableW = svgW - padding * 2;
    const usableH = svgH - padding * 2;

    const rangeX = maxLng - minLng || 0.0001;
    const rangeY = maxLat - minLat || 0.0001;
    const scale = Math.min(usableW / rangeX, usableH / rangeY);

    const mapped = validCoords.map((c) => ({
      x: padding + (c.lng - minLng) * scale + (usableW - rangeX * scale) / 2,
      // Inverser Y car lat augmente vers le haut
      y: padding + (maxLat - c.lat) * scale + (usableH - rangeY * scale) / 2,
      borne: c.borne,
      lat: c.lat,
      lng: c.lng,
    }));

    const centroidX = mapped.reduce((s, p) => s + p.x, 0) / mapped.length;
    const centroidY = mapped.reduce((s, p) => s + p.y, 0) / mapped.length;

    return { points: mapped, bounds: { w: svgW, h: svgH }, cx: centroidX, cy: centroidY };
  }, [validCoords, height]);

  if (points.length < 3) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground bg-muted/30 rounded-xl">
        Pas assez de bornes pour afficher le croquis
      </div>
    );
  }

  // Polygon path
  const polygonPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

  // Midpoints for side dimensions
  const midpoints = points.map((p, i) => {
    const next = points[(i + 1) % points.length];
    return { x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 };
  });

  // Road sides set (by index)
  const roadSideIndices = new Set(
    roadSides
      .map((rs: any) => {
        const idx = parseInt(rs.sideIndex ?? rs.index, 10);
        return isNaN(idx) ? -1 : idx;
      })
      .filter((i: number) => i >= 0),
  );

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${bounds.w} ${bounds.h}`}
        className="w-full rounded-xl border border-border/50 bg-muted/20"
        style={{ height, maxHeight: height }}
        role="img"
        aria-label="Croquis de la parcelle"
      >
        {/* Defs */}
        <defs>
          <marker id="road-hatch" patternUnits="userSpaceOnUse" markerWidth="6" markerHeight="6">
            <line x1="0" y1="6" x2="6" y2="0" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" opacity="0.4" />
          </marker>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.15" />
          </pattern>
        </defs>

        {/* Parcelle remplie */}
        <path d={polygonPath} fill="url(#hatch)" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinejoin="round" />

        {/* Routes — côtés bordant une route en trait épais */}
        {points.map((p, i) => {
          if (!roadSideIndices.has(i)) return null;
          const next = points[(i + 1) % points.length];
          return (
            <line
              key={`road-${i}`}
              x1={p.x} y1={p.y} x2={next.x} y2={next.y}
              stroke="hsl(var(--destructive))"
              strokeWidth="4"
              strokeDasharray="8 4"
              opacity="0.6"
            />
          );
        })}

        {/* Dimensions des côtés */}
        {midpoints.map((mid, i) => {
          const side = parcelSides[i];
          if (!side?.length) return null;
          // Offset label away from center
          const dx = mid.x - cx;
          const dy = mid.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const offsetX = mid.x + (dx / dist) * 18;
          const offsetY = mid.y + (dy / dist) * 18;
          return (
            <g key={`dim-${i}`}>
              <rect
                x={offsetX - 18} y={offsetY - 8}
                width="36" height="16" rx="4"
                fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="0.5"
              />
              <text
                x={offsetX} y={offsetY + 4}
                textAnchor="middle" fontSize="10" fontWeight="600"
                fill="hsl(var(--foreground))"
              >
                {side.length}m
              </text>
            </g>
          );
        })}

        {/* Bornes (marqueurs) */}
        {points.map((p, i) => (
          <g key={`borne-${i}`}>
            <circle cx={p.x} cy={p.y} r="10" fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth="2" />
            <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="hsl(var(--primary-foreground))">
              {p.borne}
            </text>
          </g>
        ))}

        {/* Constructions (bâtiments) */}
        {buildingShapes.map((shape, i) => {
          // Placer les constructions autour du centroïde
          const angle = (i / buildingShapes.length) * Math.PI * 2 - Math.PI / 2;
          const radius = 28;
          const sx = cx + Math.cos(angle) * radius;
          const sy = cy + Math.sin(angle) * radius;
          const sz = Math.min(shape.size * 2, 30);
          const label = SHAPE_LABELS[shape.type] || '?';

          return (
            <g key={`bld-${i}`} transform={`translate(${sx}, ${sy})${shape.rotation ? ` rotate(${shape.rotation})` : ''}`}>
              {shape.type === 'circle' ? (
                <circle cx="0" cy="0" r={sz / 2} fill="hsl(var(--accent))" stroke="hsl(var(--accent-foreground))" strokeWidth="1" opacity="0.7" />
              ) : (
                <rect x={-sz / 2} y={-sz / 2} width={sz} height={sz} rx="2" fill="hsl(var(--accent))" stroke="hsl(var(--accent-foreground))" strokeWidth="1" opacity="0.7" />
              )}
              <text x="0" y="4" textAnchor="middle" fontSize="9" fontWeight="600" fill="hsl(var(--accent-foreground))">
                {label}
              </text>
            </g>
          );
        })}

        {/* Servitude */}
        {servitude?.hasServitude && (
          <text x={bounds.w - 8} y={bounds.h - 8} textAnchor="end" fontSize="8" fill="hsl(var(--muted-foreground))">
            Servitude: {servitude.width || '?'}m
          </text>
        )}
      </svg>

      {/* Légende sous le SVG */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground px-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary" /> Borne
        </span>
        {roadSideIndices.size > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-0.5 bg-destructive" style={{ borderTop: '2px dashed' }} /> Route
          </span>
        )}
        {buildingShapes.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-accent border border-accent-foreground/30" /> Construction
          </span>
        )}
      </div>
    </div>
  );
};

export default ParcelSketchSVG;

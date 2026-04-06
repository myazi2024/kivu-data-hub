import React, { useState, useMemo, useEffect, useRef } from 'react';

interface Feature {
  type: string;
  properties: { name: string; commune: string };
  geometry: { type: string; coordinates: any[] };
}

interface Props {
  ville: string;
  commune?: string;
  quartier?: string;
  onQuartierSelect?: (quartier: string) => void;
}

const COLORS = [
  'hsl(var(--primary) / 0.35)',
  'hsl(var(--primary) / 0.25)',
  'hsl(var(--primary) / 0.45)',
  'hsl(var(--primary) / 0.3)',
  'hsl(var(--primary) / 0.4)',
  'hsl(var(--primary) / 0.2)',
];

const HIGHLIGHT = 'hsl(var(--primary) / 0.7)';
const STROKE = 'hsl(var(--foreground) / 0.3)';
const HIGHLIGHT_STROKE = 'hsl(var(--primary))';

function flatCoords(geometry: any): [number, number][] {
  const coords: [number, number][] = [];
  const extract = (arr: any) => {
    if (typeof arr[0] === 'number') { coords.push(arr as [number, number]); return; }
    arr.forEach(extract);
  };
  extract(geometry.coordinates);
  return coords;
}

function projectFeature(
  geometry: any,
  bbox: { minLng: number; maxLng: number; minLat: number; maxLat: number },
  width: number, height: number, padding: number
): string {
  const lngRange = bbox.maxLng - bbox.minLng || 0.01;
  const latRange = bbox.maxLat - bbox.minLat || 0.01;
  const drawW = width - padding * 2;
  const drawH = height - padding * 2;
  const scale = Math.min(drawW / lngRange, drawH / latRange);
  const offsetX = padding + (drawW - lngRange * scale) / 2;
  const offsetY = padding + (drawH - latRange * scale) / 2;

  const project = (lng: number, lat: number): [number, number] => [
    offsetX + (lng - bbox.minLng) * scale,
    offsetY + (bbox.maxLat - lat) * scale,
  ];

  const paths: string[] = [];
  const renderRing = (ring: any[]) => {
    if (ring.length === 0) return '';
    const pts = ring.map((c: number[]) => project(c[0], c[1]));
    return 'M' + pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L') + 'Z';
  };

  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach((ring: any[]) => { paths.push(renderRing(ring)); });
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach((poly: any[][]) => {
      poly.forEach((ring: any[]) => { paths.push(renderRing(ring)); });
    });
  }
  return paths.join(' ');
}

function centroid(geometry: any, bbox: any, w: number, h: number, padding: number): [number, number] {
  const coords = flatCoords(geometry);
  if (coords.length === 0) return [w / 2, h / 2];
  const avgLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const avgLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  const lngRange = bbox.maxLng - bbox.minLng || 0.01;
  const latRange = bbox.maxLat - bbox.minLat || 0.01;
  const drawW = w - padding * 2;
  const drawH = h - padding * 2;
  const scale = Math.min(drawW / lngRange, drawH / latRange);
  const offsetX = padding + (drawW - lngRange * scale) / 2;
  const offsetY = padding + (drawH - latRange * scale) / 2;
  return [
    offsetX + (avgLng - bbox.minLng) * scale,
    offsetY + (bbox.maxLat - avgLat) * scale,
  ];
}

const DRCQuartiersMap: React.FC<Props> = ({ ville, commune, quartier, onQuartierSelect }) => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 400, h: 300 });

  useEffect(() => {
    fetch('/goma-quartiers.geojson')
      .then(r => r.json())
      .then(data => setFeatures(data.features || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDims({ w: width, h: height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const filtered = useMemo(() => {
    if (!commune) return features;
    const norm = commune.toLowerCase();
    return features.filter(f => f.properties.commune?.toLowerCase() === norm);
  }, [features, commune]);

  const bbox = useMemo(() => {
    if (filtered.length === 0) return { minLng: 0, maxLng: 1, minLat: 0, maxLat: 1 };
    const source = quartier
      ? filtered.filter(f => f.properties.name.toLowerCase() === quartier.toLowerCase())
      : filtered;
    const target = source.length > 0 ? source : filtered;
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    target.forEach(f => {
      flatCoords(f.geometry).forEach(([lng, lat]) => {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      });
    });
    const padLng = (maxLng - minLng) * 0.1;
    const padLat = (maxLat - minLat) * 0.1;
    return { minLng: minLng - padLng, maxLng: maxLng + padLng, minLat: minLat - padLat, maxLat: maxLat + padLat };
  }, [filtered, quartier]);

  if (filtered.length === 0 && features.length > 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-[10px]">
        Aucun quartier trouvé pour la commune « {commune} »
      </div>
    );
  }

  const padding = 20;

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg viewBox={`0 0 ${dims.w} ${dims.h}`} className="w-full h-full">
        {filtered.map((f, i) => {
          const name = f.properties.name;
          const isSelected = quartier && name.toLowerCase() === quartier.toLowerCase();
          const isHovered = hovered === name;
          const hasSelection = !!quartier;
          const path = projectFeature(f.geometry, bbox, dims.w, dims.h, padding);
          const fill = isSelected ? HIGHLIGHT : isHovered ? 'hsl(var(--primary) / 0.55)' : hasSelection ? 'hsl(var(--muted) / 0.15)' : COLORS[i % COLORS.length];
          const stroke = isSelected ? HIGHLIGHT_STROKE : hasSelection ? 'hsl(var(--foreground) / 0.1)' : STROKE;
          const strokeWidth = isSelected ? 2 : isHovered ? 1.5 : 0.8;

          return (
            <path
              key={name}
              d={path}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              className="transition-colors duration-150 cursor-pointer"
              onMouseEnter={() => setHovered(name)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onQuartierSelect?.(name)}
            />
          );
        })}

        {filtered.map((f) => {
          const [cx, cy] = centroid(f.geometry, bbox, dims.w, dims.h, padding);
          const name = f.properties.name;
          const isSelected = quartier && name.toLowerCase() === quartier.toLowerCase();
          return (
            <text
              key={`label-${name}`}
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              className={`pointer-events-none select-none ${isSelected ? 'fill-primary-foreground font-semibold' : 'fill-foreground'}`}
              fontSize={filtered.length > 12 ? 7 : 9}
            >
              {name}
            </text>
          );
        })}
      </svg>

      {hovered && (
        <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm border border-border/50 rounded px-2 py-1 text-[10px] shadow-sm pointer-events-none z-10">
          <span className="font-medium">{hovered}</span>
          <span className="text-muted-foreground ml-1">— {commune || ville}</span>
        </div>
      )}
    </div>
  );
};

export default DRCQuartiersMap;

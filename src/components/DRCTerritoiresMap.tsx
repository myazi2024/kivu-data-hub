import React, { useState, useMemo, useEffect, useRef } from 'react';
import { flatCoords, projectFeature, centroid, computeBBox, useAnimatedBbox, useGeoJsonData, type BBox } from '@/lib/mapProjection';
import MapZoomBackButton from '@/components/map/ui/MapZoomBackButton';

interface Feature {
  type: string;
  properties: { name: string; [k: string]: any };
  geometry: { type: string; coordinates: any[] };
}

interface Props {
  province?: string;
  territoire?: string;
  onTerritoireSelect?: (territoire: string) => void;
  territoireNames?: string[];
  showAll?: boolean;
  /** Optional drilldown coloring per territoire name */
  getEntityColor?: (territoireName: string) => string | undefined;
  /** Optional title shown in top-left chip when drilldown coloring is active */
  profileLabel?: string;
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

const DRCTerritoiresMap: React.FC<Props> = ({ province, territoire, onTerritoireSelect, territoireNames, showAll, getEntityColor, profileLabel }) => {
  const features = useGeoJsonData<Feature>('/drc-territoires.geojson');
  const [hovered, setHovered] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 400, h: 300 });

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
    if (showAll) return features;
    if (!territoireNames || territoireNames.length === 0) return [];
    const namesLower = new Set(territoireNames.map(n => n.toLowerCase()));
    return features.filter(f => namesLower.has(f.properties.name?.toLowerCase()));
  }, [features, territoireNames, showAll]);

  const targetBbox = useMemo<BBox>(() =>
    computeBBox(filtered, territoire, (f: Feature) => f.properties.name),
  [filtered, territoire]);

  const animBbox = useAnimatedBbox(targetBbox);

  if (!province && !showAll) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-[10px]">
        Sélectionnez une province pour afficher les territoires
      </div>
    );
  }

  if (filtered.length === 0 && features.length > 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-[10px]">
        Aucun territoire trouvé pour « {province} »
      </div>
    );
  }

  const padding = 20;
  const showLabels = !showAll || !!territoire;

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg viewBox={`0 0 ${dims.w} ${dims.h}`} className="w-full h-full">
        {filtered.map((f, i) => {
          const name = f.properties.name;
          const isSelected = territoire && name.toLowerCase() === territoire.toLowerCase();
          const isHovered = hovered === name;
          const hasSelection = !!territoire;
          const path = projectFeature(f.geometry, animBbox, dims.w, dims.h, padding);
          const profileColor = getEntityColor?.(name);
          const fill = isSelected
            ? HIGHLIGHT
            : isHovered
              ? 'hsl(var(--primary) / 0.55)'
              : profileColor
                ? profileColor
                : hasSelection
                  ? 'hsl(var(--muted) / 0.15)'
                  : COLORS[i % COLORS.length];
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
              onClick={() => onTerritoireSelect?.(name)}
            />
          );
        })}

        {showLabels && filtered.map((f) => {
          const [cx, cy] = centroid(f.geometry, animBbox, dims.w, dims.h, padding);
          const name = f.properties.name;
          const isSelected = territoire && name.toLowerCase() === territoire.toLowerCase();
          return (
            <text
              key={`label-${name}`}
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              className={`pointer-events-none select-none transition-opacity duration-300 ${isSelected ? 'fill-primary-foreground font-semibold' : 'fill-foreground'}`}
              fontSize={filtered.length > 10 ? 7 : 9}
            >
              {name}
            </text>
          );
        })}
      </svg>

      {territoire && onTerritoireSelect && (
        <MapZoomBackButton onClick={() => onTerritoireSelect(territoire)} label={`Retour — ${province || 'RDC'}`} />
      )}

      {hovered && (
        <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm border border-border/50 rounded px-2 py-1 text-[10px] shadow-sm pointer-events-none z-10">
          <span className="font-medium">{hovered}</span>
          <span className="text-muted-foreground ml-1">— {province}</span>
        </div>
      )}
      {profileLabel && !hovered && (
        <div className="absolute top-2 left-2 bg-background/85 backdrop-blur-sm border border-border/40 rounded px-1.5 py-0.5 text-[9px] shadow-sm pointer-events-none z-10">
          <span className="font-medium text-foreground">{profileLabel}</span>
          <span className="text-muted-foreground ml-1">— par territoire</span>
        </div>
      )}
    </div>
  );
};

export default DRCTerritoiresMap;

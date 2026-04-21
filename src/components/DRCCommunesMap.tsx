import React, { useState, useMemo, useEffect, useRef } from 'react';
import { projectFeature, centroid, computeBBox, useAnimatedBbox, useGeoJsonData, type BBox } from '@/lib/mapProjection';
import MapZoomBackButton from '@/components/map/ui/MapZoomBackButton';

interface Feature {
  type: string;
  properties: { name: string; is_in_admi: string; [k: string]: any };
  geometry: { type: string; coordinates: any[] };
}

interface Props {
  ville?: string;
  commune?: string;
  onCommuneSelect?: (commune: string) => void;
  /** Optional drilldown coloring: returns a CSS color per commune name. When provided, overrides the default tile palette. */
  getEntityColor?: (communeName: string) => string | undefined;
  /** Optional title shown in the top-left chip when drilldown coloring is active */
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

const DRCCommunesMap: React.FC<Props> = ({ ville, commune, onCommuneSelect, getEntityColor, profileLabel }) => {
  const features = useGeoJsonData<Feature>('/drc-communes.geojson');
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
    if (!ville) return [];
    const normalizedVille = ville.toLowerCase();
    return features.filter(f => f.properties.is_in_admi?.toLowerCase() === normalizedVille);
  }, [features, ville]);

  const targetBbox = useMemo<BBox>(() =>
    computeBBox(filtered, commune, (f: Feature) => f.properties.name),
  [filtered, commune]);

  const animBbox = useAnimatedBbox(targetBbox);

  if (!ville) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-[10px]">
        Sélectionnez une ville dans les filtres pour afficher la carte des communes
      </div>
    );
  }

  if (filtered.length === 0 && features.length > 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-[10px]">
        Aucune commune trouvée pour la ville « {ville} »
      </div>
    );
  }

  const padding = 20;

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg viewBox={`0 0 ${dims.w} ${dims.h}`} className="w-full h-full">
        {filtered.map((f, i) => {
          const name = f.properties.name;
          const isSelected = commune && name.toLowerCase() === commune.toLowerCase();
          const isHovered = hovered === name;
          const hasSelection = !!commune;
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
              onClick={() => onCommuneSelect?.(name)}
            />
          );
        })}

        {filtered.map((f) => {
          const [cx, cy] = centroid(f.geometry, animBbox, dims.w, dims.h, padding);
          const name = f.properties.name;
          const isSelected = commune && name.toLowerCase() === commune.toLowerCase();
          return (
            <text
              key={`label-${name}`}
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              className={`pointer-events-none select-none transition-opacity duration-300 ${isSelected ? 'fill-primary-foreground font-semibold' : 'fill-foreground'}`}
              fontSize={filtered.length > 8 ? 8 : 10}
            >
              {name}
            </text>
          );
        })}
      </svg>

      {commune && onCommuneSelect && (
        <MapZoomBackButton onClick={() => onCommuneSelect(commune)} label={`Retour — ${ville}`} />
      )}

      {hovered && (
        <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm border border-border/50 rounded px-2 py-1 text-[10px] shadow-sm pointer-events-none z-10">
          <span className="font-medium">{hovered}</span>
          <span className="text-muted-foreground ml-1">— {ville}</span>
        </div>
      )}
      {profileLabel && !hovered && (
        <div className="absolute top-2 left-2 bg-background/85 backdrop-blur-sm border border-border/40 rounded px-1.5 py-0.5 text-[9px] shadow-sm pointer-events-none z-10">
          <span className="font-medium text-foreground">{profileLabel}</span>
          <span className="text-muted-foreground ml-1">— par commune</span>
        </div>
      )}
    </div>
  );
};

export default DRCCommunesMap;

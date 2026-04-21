import React, { useState, useMemo, useEffect, useRef } from 'react';
import { projectFeature, centroid, computeBBox, useAnimatedBbox, useGeoJsonData, type BBox } from '@/lib/mapProjection';
import { MapZoomBackButton } from '@/components/map/ui/MapZoomBackButton';

interface Feature {
  type: string;
  properties: { name: string; commune: string; ville?: string };
  geometry: { type: string; coordinates: any[] };
}

interface Props {
  ville: string;
  commune?: string;
  quartier?: string;
  onQuartierSelect?: (quartier: string) => void;
  /** Optional drilldown coloring per quartier name */
  getEntityColor?: (quartierName: string) => string | undefined;
  /** Optional title shown in top-left chip when drilldown coloring is active */
  profileLabel?: string;
  /** Source du dataset : 'goma' (détail OSM) ou 'national' (HDX 12 villes RDC) */
  dataSource?: 'goma' | 'national';
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

const DRCQuartiersMap: React.FC<Props> = ({ ville, commune, quartier, onQuartierSelect, getEntityColor, profileLabel, dataSource = 'goma' }) => {
  const url = dataSource === 'goma' ? '/goma-quartiers.geojson' : '/drc-quartiers.geojson';
  const features = useGeoJsonData<Feature>(url);
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
    const normCommune = commune?.toLowerCase();
    const normVille = ville?.toLowerCase();
    return features.filter(f => {
      const c = f.properties.commune?.toLowerCase();
      // National dataset has city collisions on commune names — filter both
      if (dataSource === 'national') {
        const v = f.properties.ville?.toLowerCase();
        if (normVille && v !== normVille) return false;
      }
      if (normCommune && c !== normCommune) return false;
      return true;
    });
  }, [features, commune, ville, dataSource]);

  const targetBbox = useMemo<BBox>(() =>
    computeBBox(filtered, quartier, (f: Feature) => f.properties.name),
  [filtered, quartier]);

  const animBbox = useAnimatedBbox(targetBbox);

  if (filtered.length === 0 && features.length > 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-[10px] px-3 text-center">
        {dataSource === 'national'
          ? `Découpage des quartiers indisponible pour ${commune ? `« ${commune} » — ` : ''}${ville}. Source : OSM/HDX (12 villes RDC).`
          : `Aucun quartier trouvé pour la commune « ${commune} »`}
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
              key={`${name}-${i}`}
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

        {filtered.length <= 30 && filtered.map((f, i) => {
          const [cx, cy] = centroid(f.geometry, animBbox, dims.w, dims.h, padding);
          const name = f.properties.name;
          const isSelected = quartier && name.toLowerCase() === quartier.toLowerCase();
          return (
            <text
              key={`label-${name}-${i}`}
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              className={`pointer-events-none select-none transition-opacity duration-300 ${isSelected ? 'fill-primary-foreground font-semibold' : 'fill-foreground'}`}
              fontSize={filtered.length > 12 ? 7 : 9}
            >
              {name}
            </text>
          );
        })}
      </svg>

      {quartier && onQuartierSelect && (
        <MapZoomBackButton onBack={() => onQuartierSelect(quartier)} label={`Retour — ${commune || ville}`} />
      )}

      {hovered && (
        <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm border border-border/50 rounded px-2 py-1 text-[10px] shadow-sm pointer-events-none z-10">
          <span className="font-medium">{hovered}</span>
          <span className="text-muted-foreground ml-1">— {commune || ville}</span>
        </div>
      )}
      {profileLabel && !hovered && (
        <div className="absolute top-2 left-2 bg-background/85 backdrop-blur-sm border border-border/40 rounded px-1.5 py-0.5 text-[9px] shadow-sm pointer-events-none z-10">
          <span className="font-medium text-foreground">{profileLabel}</span>
          <span className="text-muted-foreground ml-1">— par quartier</span>
        </div>
      )}
    </div>
  );
};

export default DRCQuartiersMap;

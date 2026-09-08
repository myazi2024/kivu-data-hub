import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MapPin, PencilLine, Trash2, Square } from 'lucide-react';

export interface MapVertex { lat: number; lng: number }

export interface MapBuilding {
  ref: string;
  label: string;
  vertices: MapVertex[];
}

export type ExpertiseSelectionMode = 'whole' | 'buildings' | 'area';

interface ExpertiseTargetMapProps {
  parcelVertices: MapVertex[];
  buildings: MapBuilding[];
  mode: ExpertiseSelectionMode;
  selectedRefs: string[];
  drawnArea: MapVertex[] | null;
  onToggleBuilding: (ref: string) => void;
  onDrawnAreaChange: (area: MapVertex[] | null) => void;
  height?: number;
}

const PAD = 16;

/**
 * Carte de sélection du périmètre d'expertise.
 * Volontairement SANS mesures (longueurs, surfaces, coordonnées) : ces données
 * sont payantes et ne doivent pas être exposées ici.
 */
const ExpertiseTargetMap: React.FC<ExpertiseTargetMapProps> = ({
  parcelVertices,
  buildings,
  mode,
  selectedRefs,
  drawnArea,
  onToggleBuilding,
  onDrawnAreaChange,
  height = 260,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);

  // Le tracé ne reste jamais actif après un changement de mode
  useEffect(() => {
    if (mode !== 'area') setDrawing(false);
  }, [mode]);

  const width = 320;

  const bounds = useMemo(() => {
    const all: MapVertex[] = [
      ...parcelVertices,
      ...buildings.flatMap((b) => b.vertices),
    ].filter((v) => Number.isFinite(v?.lat) && Number.isFinite(v?.lng));
    if (all.length === 0) return null;
    const lats = all.map((v) => v.lat);
    const lngs = all.map((v) => v.lng);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }, [parcelVertices, buildings]);

  const project = useCallback(
    (v: MapVertex): { x: number; y: number } => {
      if (!bounds) return { x: 0, y: 0 };
      const dLat = bounds.maxLat - bounds.minLat || 1e-9;
      const dLng = bounds.maxLng - bounds.minLng || 1e-9;
      const scale = Math.min((width - PAD * 2) / dLng, (height - PAD * 2) / dLat);
      const offX = (width - dLng * scale) / 2;
      const offY = (height - dLat * scale) / 2;
      return {
        x: offX + (v.lng - bounds.minLng) * scale,
        y: offY + (bounds.maxLat - v.lat) * scale,
      };
    },
    [bounds, height],
  );

  const unproject = useCallback(
    (x: number, y: number): MapVertex => {
      if (!bounds) return { lat: 0, lng: 0 };
      const dLat = bounds.maxLat - bounds.minLat || 1e-9;
      const dLng = bounds.maxLng - bounds.minLng || 1e-9;
      const scale = Math.min((width - PAD * 2) / dLng, (height - PAD * 2) / dLat);
      const offX = (width - dLng * scale) / 2;
      const offY = (height - dLat * scale) / 2;
      return {
        lng: bounds.minLng + (x - offX) / scale,
        lat: bounds.maxLat - (y - offY) / scale,
      };
    },
    [bounds, height],
  );

  const toPath = (verts: MapVertex[]) =>
    verts.map((v, i) => {
      const p = project(v);
      return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(' ') + ' Z';

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (mode !== 'area' || !drawing || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;
    onDrawnAreaChange([...(drawnArea || []), unproject(x, y)]);
  };

  if (!bounds || parcelVertices.length < 3) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        Le tracé de cette parcelle n'est pas encore disponible. Utilisez la liste ci-dessous pour désigner ce qui doit être expertisé.
      </div>
    );
  }

  const wholeSelected = mode === 'whole';

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className={cn('w-full h-auto', mode === 'area' && drawing && 'cursor-crosshair')}
          onClick={handleSvgClick}
          role="img"
          aria-label="Carte de la parcelle et de ses constructions"
        >
          <path
            d={toPath(parcelVertices)}
            className={cn(
              'transition-colors',
              wholeSelected ? 'fill-primary/20 stroke-primary' : 'fill-muted/40 stroke-muted-foreground/50',
            )}
            strokeWidth={2}
          />

          {buildings.map((b) => {
            if (b.vertices.length < 3) return null;
            const isSelected = mode === 'buildings' && selectedRefs.includes(b.ref);
            const isHover = hovered === b.ref;
            return (
              <path
                key={b.ref}
                d={toPath(b.vertices)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (mode === 'buildings') onToggleBuilding(b.ref);
                }}
                onMouseEnter={() => setHovered(b.ref)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  'transition-colors',
                  mode === 'buildings' && 'cursor-pointer',
                  isSelected
                    ? 'fill-primary/60 stroke-primary'
                    : isHover
                      ? 'fill-primary/30 stroke-primary/70'
                      : 'fill-foreground/20 stroke-foreground/50',
                )}
                strokeWidth={1.5}
              >
                <title>{b.label}</title>
              </path>
            );
          })}

          {drawnArea && drawnArea.length > 0 && (
            <>
              <path
                d={
                  drawnArea.length >= 3
                    ? toPath(drawnArea)
                    : drawnArea.map((v, i) => {
                        const p = project(v);
                        return `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`;
                      }).join(' ')
                }
                className="fill-amber-500/30 stroke-amber-500"
                strokeWidth={2}
                strokeDasharray="4 3"
              />
              {drawnArea.map((v, i) => {
                const p = project(v);
                return <circle key={i} cx={p.x} cy={p.y} r={3} className="fill-amber-500" />;
              })}
            </>
          )}
        </svg>
      </div>

      {mode === 'buildings' && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Square className="h-3 w-3" /> Touchez une construction sur la carte pour l'ajouter ou la retirer de l'expertise.
        </p>
      )}

      {mode === 'area' && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={drawing ? 'default' : 'outline'}
            className="h-7 text-xs rounded-full"
            onClick={() => setDrawing((d) => !d)}
          >
            <PencilLine className="h-3 w-3 mr-1" />
            {drawing ? 'Terminer le tracé' : 'Tracer la zone'}
          </Button>
          {drawnArea && drawnArea.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs rounded-full text-destructive"
              onClick={() => onDrawnAreaChange(null)}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Effacer
            </Button>
          )}
          <Badge variant="secondary" className="text-[10px] gap-1">
            <MapPin className="h-3 w-3" />
            {drawnArea?.length ? `${drawnArea.length} point(s)` : 'Aucun point'}
          </Badge>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Les mesures (longueurs, surfaces) ne sont pas affichées sur cet aperçu.
      </p>
    </div>
  );
};

export default ExpertiseTargetMap;

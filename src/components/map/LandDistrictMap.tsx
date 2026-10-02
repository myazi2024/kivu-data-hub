import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import MapZoomBackButton from '@/components/map/ui/MapZoomBackButton';
import { computeBBox, projectFeature, useAnimatedBbox } from '@/lib/mapProjection';
import { normalizeGeoName } from '@/lib/landDistrictMapping';
import { useLandDistrictFeatures } from '@/hooks/useLandDistrictFeatures';

interface Props {
  /** Limite l'affichage aux circonscriptions de cette province. */
  province?: string;
  selected?: string;
  onSelect: (district: string | undefined, province?: string) => void;
  /** Couleur par indicateur ; à défaut, couleur unique par circonscription. */
  getDistrictColor?: (district: string) => string | undefined;
  renderDetails: (district: string, province: string | undefined, color: string | undefined) => ReactNode;
}

const PADDING = 6;

/** Carte des circonscriptions foncières (territoires + communes), partagée avec l'Accueil. */
export default function LandDistrictMap({ province, selected, onSelect, getDistrictColor, renderDetails }: Props) {
  const { unmatchedAreas, districtFeatures, colors, features, loaded } = useLandDistrictFeatures();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 400, h: 400 });
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setDims({ w: width, h: height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const provKey = province ? normalizeGeoName(province) : null;
  const inScope = (p?: string) => !provKey || (p ? normalizeGeoName(p) === provKey : false);
  const visibleDistricts = useMemo(
    () => districtFeatures.filter((f) => inScope(f.province)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [districtFeatures, provKey],
  );
  const visibleUnmatched = useMemo(
    () => unmatchedAreas.filter((a) => inScope(a.province)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unmatchedAreas, provKey],
  );

  const selectedKey = selected ? normalizeGeoName(selected) : null;
  const selectedFeatures = selectedKey ? visibleDistricts.filter((f) => normalizeGeoName(f.district) === selectedKey) : [];
  const baseBbox = useMemo(() => {
    const scoped = provKey ? [...visibleDistricts.map((f) => f.feature), ...visibleUnmatched.map((a) => a.feature)] : features;
    return computeBBox(scoped.length ? scoped : features);
  }, [features, visibleDistricts, visibleUnmatched, provKey]);
  const targetBbox = useMemo(
    () => selectedFeatures.length ? computeBBox(selectedFeatures.map((f) => f.feature)) : baseBbox,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseBbox, selectedKey, visibleDistricts],
  );
  const bbox = useAnimatedBbox(targetBbox, 500);

  const displayed = selectedFeatures[0]?.district ?? active;
  const displayedFeature = displayed ? visibleDistricts.find((f) => f.district === displayed) : undefined;
  const colorOf = (d: string) => getDistrictColor?.(d) ?? colors.get(d);

  const activate = (district: string, prov?: string) => {
    setActive(district);
    if (selectedKey === normalizeGeoName(district)) onSelect(undefined);
    else onSelect(district, prov);
  };

  return (
    <div className="flex h-full w-full flex-col" aria-label="Circonscriptions foncières de la RDC">
      <div ref={containerRef} className="relative min-h-0 flex-1">
        {loaded ? (
          <svg
            viewBox={`0 0 ${dims.w} ${dims.h}`}
            className="absolute inset-0 h-full w-full"
            role="group"
            aria-label="Carte des circonscriptions foncières"
            onMouseLeave={() => setActive(null)}
          >
            <g aria-hidden="true">
              {visibleUnmatched.map(({ feature, area }, i) => (
                <path key={`u-${i}-${area}`} d={projectFeature(feature.geometry, bbox, dims.w, dims.h, PADDING)} className="fill-muted stroke-border" strokeWidth={0.5} />
              ))}
            </g>
            {visibleDistricts.map(({ feature, district, area, source, province: p }, i) => {
              const isActive = displayed === district;
              return (
                <path
                  key={`${source}-${i}-${area}`}
                  d={projectFeature(feature.geometry, bbox, dims.w, dims.h, PADDING)}
                  fill={colorOf(district)}
                  className="stroke-background cursor-pointer outline-none"
                  strokeWidth={isActive ? 2 : 0.7}
                  opacity={displayed && !isActive ? 0.45 : 1}
                  tabIndex={0}
                  role="button"
                  aria-label={district}
                  aria-pressed={selectedKey === normalizeGeoName(district)}
                  onMouseEnter={() => setActive(district)}
                  onFocus={() => setActive(district)}
                  onClick={() => activate(district, p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(district, p); }
                  }}
                />
              );
            })}
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Chargement de la carte…</div>
        )}
        {selected && (
          <>
            <MapZoomBackButton onBack={() => onSelect(undefined)} label="Retour aux circonscriptions" />
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center px-3" aria-live="polite">
              <span className="max-w-full break-words rounded-sm bg-primary px-2 py-1 text-center text-[11px] font-semibold text-primary-foreground shadow-sm">
                Circonscription foncière de {selectedFeatures[0]?.district ?? selected}
              </span>
            </div>
          </>
        )}
      </div>
      <div className="min-h-[40px] shrink-0 border-t border-border/40 px-2 py-1 text-[11px]" aria-live="polite">
        {displayedFeature ? (
          renderDetails(displayedFeature.district, displayedFeature.province, colorOf(displayedFeature.district))
        ) : selected && !selectedFeatures.length ? (
          <span className="text-muted-foreground">« {selected} » n'a pas encore de limite identifiée sur la carte.</span>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-muted-foreground">
            <span>Survolez ou sélectionnez une circonscription.</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-primary" aria-hidden="true" />Identifiées ({new Set(visibleDistricts.map((f) => f.district)).size})</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-muted border border-border" aria-hidden="true" />Découpage en cours</span>
          </div>
        )}
      </div>
    </div>
  );
}

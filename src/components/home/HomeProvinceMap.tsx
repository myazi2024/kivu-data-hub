import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import MapZoomBackButton from '@/components/map/ui/MapZoomBackButton';
import { computeBBox, projectFeature, useAnimatedBbox } from '@/lib/mapProjection';
import { normalizeGeoName } from '@/lib/landDistrictMapping';
import { useHomeBicCounts } from '@/hooks/useHomeBicCounts';
import { useLandDistrictFeatures } from '@/hooks/useLandDistrictFeatures';

const PADDING = 6;

/** Carte des circonscriptions foncières construite à partir des territoires et villes. */
export default function HomeProvinceMap() {
  const { features, areas, districtFeatures, colors } = useLandDistrictFeatures();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 400, h: 400 });
  const [active, setActive] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const { data: countsData } = useHomeBicCounts();

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setDims({ w: width, h: height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const counts = useMemo(() => {
    if (!countsData) return null;
    const normalizeCounts = (input?: Record<string, number>) => {
      if (!input) return null;
      const map: Record<string, number> = {};
      for (const [name, value] of Object.entries(input)) {
        const key = normalizeGeoName(name);
        map[key] = (map[key] ?? 0) + (Number(value) || 0);
      }
      return map;
    };
    return {
      parcels: normalizeCounts(countsData.parcels_by_district),
      services: normalizeCounts(countsData.services_by_district),
      disputes: normalizeCounts(countsData.disputes_by_district),
    };
  }, [countsData]);

  const nationalBbox = useMemo(() => computeBBox(features), [features]);
  const selectedFeature = selected ? districtFeatures.find((item) => item.district === selected) : undefined;
  const targetBbox = useMemo(
    () => selectedFeature ? computeBBox([selectedFeature.feature]) : nationalBbox,
    [nationalBbox, selectedFeature],
  );
  const bbox = useAnimatedBbox(targetBbox, 500);
  const displayedDistrict = selected ?? active;
  const activeArea = districtFeatures.find((item) => item.district === displayedDistrict);
  const identified = colors.size;

  const activateDistrict = (district: string) => {
    setActive(district);
    setSelected((current) => current === district ? null : district);
  };

  const resetZoom = () => {
    setSelected(null);
    setActive(null);
  };

  return (
    <div className="relative min-w-0 md:flex-1 md:flex md:flex-col md:min-h-[278px]" aria-label="Circonscriptions foncières de la RDC">
      <div ref={containerRef} className="relative h-[180px] sm:h-[260px] md:h-auto md:min-h-[215px] md:flex-1">
        {features.length ? (
          <svg
            viewBox={`0 0 ${dims.w} ${dims.h}`}
            className="absolute inset-0 h-full w-full"
            role="group"
            aria-label="Carte des circonscriptions foncières"
            onMouseLeave={() => { if (!selected) setActive(null); }}
          >
            <g aria-hidden="true">
            {areas.map(({ feature, district, area }, index) => {
              if (district) return null;
              const d = projectFeature(feature.geometry, bbox, dims.w, dims.h, PADDING);
              return <path key={`area-${index}-${area}`} d={d} className="fill-primary-foreground/25 stroke-primary/40" strokeWidth={0.5} aria-hidden="true" />;
            })}
            </g>
            {districtFeatures.map(({ feature, district, area, source }, index) => {
              const d = projectFeature(feature.geometry, bbox, dims.w, dims.h, PADDING);
              const isActive = displayedDistrict === district;
              return (
                <path
                  key={`${source}-${index}-${area}`}
                  d={d}
                  fill={colors.get(district)}
                  className="stroke-primary-foreground cursor-pointer outline-none transition-opacity focus-visible:opacity-100"
                  strokeWidth={isActive ? 2 : 0.7}
                  opacity={displayedDistrict && !isActive ? 0.45 : 1}
                  tabIndex={0}
                  role="button"
                  aria-label={`${district}, ${source === 'commune' ? 'limite communale' : 'limite territoriale'}`}
                  aria-pressed={selected === district}
                  onMouseEnter={() => { if (!selected) setActive(district); }}
                  onFocus={() => setActive(district)}
                  onClick={() => activateDistrict(district)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      activateDistrict(district);
                    }
                  }}
                />
              );
            })}
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-primary-foreground/80">Chargement de la carte…</div>
        )}
        {selected && (
          <>
            <MapZoomBackButton onBack={resetZoom} label="Retour à la carte de la RDC" />
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center px-3" aria-live="polite">
              <span className="max-w-full break-words rounded-sm bg-primary px-2 py-1 text-center text-xs font-semibold text-primary-foreground shadow-sm sm:text-sm">
                Circonscription foncière de {selected}
              </span>
            </div>
          </>
        )}
      </div>
      <div className="min-h-[52px] sm:min-h-[64px] lg:min-h-[54px] border-t border-primary-foreground/25 pt-2 text-primary-foreground" aria-live="polite">
        {activeArea?.district ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <span className="h-3 w-3 shrink-0 rounded-sm border border-primary-foreground/60" style={{ background: colors.get(activeArea.district) }} aria-hidden="true" />
              <div className="min-w-0">
                <strong className="block text-sm">{activeArea.district}</strong>
                {activeArea.province && <p className="text-xs text-primary-foreground/80">{activeArea.province}</p>}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-primary-foreground/90">
                  {([
                    ['parcels', 'Parcelles enregistrées'],
                    ['services', 'Services cadastraux et fonciers délivrés'],
                    ['disputes', 'Litiges fonciers répertoriés'],
                  ] as const).map(([key, label]) => (
                    <span key={key}>
                      {label} : {counts?.[key] ? (counts[key][normalizeGeoName(activeArea.district)] ?? 0).toLocaleString('fr-FR') : 'indisponible'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Button asChild size="sm" className="bg-background text-primary hover:bg-background/90">
              <Link to="/map">Données foncières <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-primary-foreground/85">
            <span>Survolez ou sélectionnez une circonscription pour voir ses données.</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm" style={{ background: `linear-gradient(90deg, ${[...colors.values()].slice(0, 5).join(', ') || 'transparent'})` }} aria-hidden="true" />Circonscriptions identifiées ({identified})</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary-foreground/25" aria-hidden="true" />Découpage en cours</span>
          </div>
        )}
      </div>
    </div>
  );
}

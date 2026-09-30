import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import MapZoomBackButton from '@/components/map/ui/MapZoomBackButton';
import { computeBBox, projectFeature, useAnimatedBbox, useGeoJsonData } from '@/lib/mapProjection';
import { buildDistrictColors, matchAreaToDistrict, matchCommuneToDistrict, normalizeGeoName } from '@/lib/landDistrictMapping';

interface AreaFeature {
  properties: { name: string };
  geometry: { type: string; coordinates: unknown[] };
}

interface CommuneFeature extends AreaFeature {
  properties: { name: string; is_in_admi: string };
}

const PADDING = 6;

/** Carte des circonscriptions foncières construite à partir des territoires et villes. */
export default function HomeProvinceMap() {
  const features = useGeoJsonData<AreaFeature>('/drc-territoires.geojson');
  const communeFeatures = useGeoJsonData<CommuneFeature>('/drc-communes.geojson');
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 400, h: 400 });
  const [active, setActive] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setDims({ w: width, h: height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!baseUrl || !publicKey) return () => controller.abort();
    fetch(`${baseUrl}/functions/v1/home-bic-counts`, { signal: controller.signal, headers: { apikey: publicKey } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('indisponible'))))
      .then((res: { parcels_by_district?: Record<string, number> }) => {
        const map: Record<string, number> = {};
        for (const [k, v] of Object.entries(res.parcels_by_district ?? {})) {
          const key = normalizeGeoName(k);
          map[key] = (map[key] ?? 0) + (Number(v) || 0);
        }
        setCounts(map);
      })
      .catch(() => { /* compteur indisponible : affiché comme tel */ });
    return () => controller.abort();
  }, []);

  const areas = useMemo(() => features.map((f) => ({ feature: f, ...matchAreaToDistrict(f.properties.name) })), [features]);
  const communes = useMemo(() => communeFeatures.map((f) => ({
    feature: f,
    ...matchCommuneToDistrict(f.properties.name, f.properties.is_in_admi),
  })), [communeFeatures]);
  const districtFeatures = useMemo(() => [
    ...areas.flatMap((item) => item.district ? [{ ...item, source: 'area' as const }] : []),
    ...communes.flatMap((item) => item.district ? [{ ...item, source: 'commune' as const }] : []),
  ], [areas, communes]);
  const colors = useMemo(() => buildDistrictColors(districtFeatures.map((item) => item.district)), [districtFeatures]);
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
            {areas.map(({ feature, district, area }) => {
              const d = projectFeature(feature.geometry, bbox, dims.w, dims.h, PADDING);
              if (district) return null;
              return <path key={area} d={d} className="fill-primary-foreground/25 stroke-primary/40" strokeWidth={0.5} aria-hidden="true" />;
            })}
            </g>
            {districtFeatures.map(({ feature, district, area, source }) => {
              const d = projectFeature(feature.geometry, bbox, dims.w, dims.h, PADDING);
              const isActive = displayedDistrict === district;
              return (
                <path
                  key={`${source}-${area}`}
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
        {selected && <MapZoomBackButton onBack={resetZoom} label="Retour à la carte de la RDC" />}
      </div>
      <div className="min-h-[52px] sm:min-h-[64px] lg:min-h-[54px] border-t border-primary-foreground/25 pt-2 text-primary-foreground" aria-live="polite">
        {activeArea?.district ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-sm border border-primary-foreground/60" style={{ background: colors.get(activeArea.district) }} aria-hidden="true" />
              <div className="min-w-0">
                <strong className="block truncate text-sm">{activeArea.district}</strong>
                <p className="text-xs text-primary-foreground/80">
                  {activeArea.province ? `${activeArea.province} · ` : ''}
                  {counts
                    ? `${(counts[normalizeGeoName(activeArea.district)] ?? 0).toLocaleString('fr-FR')} parcelle(s) enregistrée(s)`
                    : 'Nombre de parcelles indisponible'}
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="bg-background text-primary hover:bg-background/90">
              <Link to="/map">Explorer <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-primary-foreground/85">
            <span>Survolez ou sélectionnez une circonscription pour voir ses parcelles.</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-accent" aria-hidden="true" />{identified} identifiées</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary-foreground/25" aria-hidden="true" />Découpage en cours</span>
          </div>
        )}
      </div>
    </div>
  );
}

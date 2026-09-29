import { useEffect, useState, type KeyboardEvent, type MouseEvent } from 'react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { getLandDistrictsForProvince } from '@/lib/geographicData';
import { PROVINCE_META } from '@/components/map/meta/mapMeta';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

const provinceById = new Map(PROVINCE_META.map(({ id, name }) => [id, name]));

export default function HomeProvinceMap() {
  const [svg, setSvg] = useState('');
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/drc-provinces.svg', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Carte indisponible');
        return response.text();
      })
      .then((text) => {
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        const root = doc.querySelector('svg');
        if (!root || doc.querySelector('parsererror')) throw new Error('Carte illisible');
        root.querySelectorAll('g:not(#features)').forEach((group) => group.remove());
        root.setAttribute('viewBox', root.getAttribute('viewBox') || '0 0 1000 994');
        root.removeAttribute('width');
        root.removeAttribute('height');
        root.setAttribute('role', 'group');
        root.setAttribute('aria-label', 'Provinces de la République démocratique du Congo');
        root.querySelectorAll('path[id]').forEach((path) => {
          const name = provinceById.get(path.id);
          if (!name) return;
          path.setAttribute('tabindex', '0');
          path.setAttribute('role', 'button');
          path.setAttribute('aria-label', name);
          path.setAttribute('data-province', path.id);
          path.removeAttribute('fill');
        });
        setSvg(DOMPurify.sanitize(root.outerHTML, {
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_ATTR: ['viewBox', 'tabindex', 'role', 'aria-label', 'data-province'],
        }));
      })
      .catch((error: Error) => { if (error.name !== 'AbortError') setFailed(true); });
    return () => controller.abort();
  }, []);

  const selectFromTarget = (target: EventTarget | null) => {
    const path = target instanceof Element ? target.closest('path[data-province]') : null;
    const name = path ? provinceById.get(path.getAttribute('data-province') || '') : null;
    if (name) setSelected(name);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      if (event.target instanceof Element && event.target.matches('path[data-province]')) {
        event.preventDefault();
        selectFromTarget(event.target);
      }
    }
  };

  const districts = selected ? getLandDistrictsForProvince(selected) : [];

  return (
    <div className="relative min-w-0" aria-label="Explorer les circonscriptions par province">
      <div className="flex items-center justify-between gap-3 border-b border-primary-foreground/25 pb-3 mb-2 text-primary-foreground">
        <span className="text-xs font-semibold uppercase tracking-widest">Territoire · RDC</span>
        <span className="text-xs text-primary-foreground/80">26 provinces</span>
      </div>
      <div className="relative h-[220px] sm:h-[300px] lg:h-[420px] xl:h-[460px] flex items-center justify-center">
        {svg ? (
          <div
            className="home-province-map h-full w-full"
            onClick={(event: MouseEvent<HTMLDivElement>) => selectFromTarget(event.target)}
            onKeyDown={handleKeyDown}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="text-center text-sm text-primary-foreground/80">
            {failed ? 'Carte indisponible. Choisissez une province ci-dessous.' : 'Chargement de la carte…'}
          </div>
        )}
      </div>
      <div className="min-h-[76px] border-t border-primary-foreground/25 pt-3 text-primary-foreground">
        {selected ? (
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <strong className="text-sm">{selected}</strong>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-primary-foreground hover:text-primary hover:bg-background" title="Effacer la province" aria-label="Effacer la province" onClick={() => setSelected(null)}><RotateCcw className="h-3 w-3" /></Button>
              </div>
              <p className="text-xs text-primary-foreground/80">{districts.length} circonscriptions foncières</p>
              <div className="mt-2 max-h-24 overflow-y-auto text-xs leading-relaxed text-primary-foreground/90" aria-live="polite">{districts.join(' · ')}</div>
            </div>
            <Button asChild size="sm" className="bg-background text-primary hover:bg-background/90">
              <Link to="/map">Explorer <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-primary-foreground/80">Choisissez une province pour voir ses circonscriptions.</p>
            <span className="text-xs whitespace-nowrap">RDC ↗</span>
          </div>
        )}
      </div>
      <label className="sr-only" htmlFor="home-province-select">Choisir une province</label>
      <select id="home-province-select" value={selected || ''} onChange={(event) => setSelected(event.target.value || null)} className="mt-2 w-full rounded-md border border-primary-foreground/30 bg-primary/70 px-2 py-1.5 text-xs text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground">
        <option value="" className="text-foreground bg-background">Choisir une province</option>
        {[...PROVINCE_META].sort((a, b) => a.name.localeCompare(b.name, 'fr')).map(({ id, name }) => <option key={id} value={name} className="text-foreground bg-background">{name}</option>)}
      </select>
    </div>
  );
}
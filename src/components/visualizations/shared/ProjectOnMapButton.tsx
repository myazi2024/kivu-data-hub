/**
 * ProjectOnMapButton — bouton compact « Afficher sur la carte » placé dans
 * l'en-tête de chaque ChartCard. Toggle actif si le visuel courant pilote
 * déjà la projection.
 *
 * No-op silencieux si le contexte de projection n'est pas monté
 * (ex. dashboard admin) — utile pour réutiliser ChartCard hors carte RDC.
 */
import React from 'react';
import { Map as MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useMapProjection, type MapProjection } from '@/components/map/context/MapProjectionContext';
import { normalizeProvinceName } from '@/lib/provinceNameNormalize';
import { useBlockUnscopedRecords } from './BlockUnscopedRecordsContext';

interface Props {
  /** Identifiant stable du visuel (titre + bloc suffit en pratique) */
  projectionId: string;
  /** Libellé court (sera utilisé pour le bandeau et la légende) */
  label: string;
  /** Records bruts du visuel — chaque record doit exposer `province` (string) */
  rawRecords?: Array<Record<string, unknown>>;
  /** Optionnel : extracteur de valeur (par défaut, comptage = +1 par record) */
  valueAccessor?: (r: Record<string, unknown>) => number;
  /** Optionnel : unité affichée sous les paliers (ex: "USD", "lots") */
  unit?: string;
  /** Source de données (table SQL principale) */
  dataSource?: string;
  /** Onglet analytics propriétaire — auto-reset si l'onglet change */
  sourceTab: string;
  /** Si l'utilisateur a fourni un payload pré-agrégé, on l'utilise tel quel */
  precomputedByProvince?: Record<string, number>;
  /** Bascule mobile : passer la vue carte au déclenchement (déclenché en amont) */
  onActivate?: () => void;
}

const norm = (s: unknown): string => normalizeProvinceName(s);

/** Agrège un set de records par province (clés normalisées). */
function aggregateByProvince(
  records: Array<Record<string, unknown>>,
  valueAccessor?: (r: Record<string, unknown>) => number,
): Record<string, number> | null {
  const map: Record<string, number> = {};
  let any = false;
  records.forEach((r) => {
    const prov = norm(r.province);
    if (!prov) return;
    const v = valueAccessor ? Number(valueAccessor(r)) || 0 : 1;
    if (!Number.isFinite(v)) return;
    map[prov] = (map[prov] || 0) + v;
    any = true;
  });
  return any ? map : null;
}

export const ProjectOnMapButton: React.FC<Props> = ({
  projectionId,
  label,
  rawRecords,
  valueAccessor,
  unit,
  dataSource,
  sourceTab,
  precomputedByProvince,
  onActivate,
}) => {
  const { projection, setProjection, clearProjection } = useMapProjection();
  const unscopedRecords = useBlockUnscopedRecords();
  const isActive = projection?.id === projectionId;

  // Construire la map province → valeur (filtrée)
  const buildByProvince = (): Record<string, number> | null => {
    if (precomputedByProvince) {
      const out: Record<string, number> = {};
      Object.entries(precomputedByProvince).forEach(([k, v]) => {
        const nk = normalizeProvinceName(k);
        if (nk) out[nk] = (out[nk] || 0) + (Number(v) || 0);
      });
      return Object.keys(out).length > 0 ? out : null;
    }
    if (!rawRecords || rawRecords.length === 0) return null;
    return aggregateByProvince(rawRecords, valueAccessor);
  };

  // Si aucun moyen d'agréger par province, on n'affiche pas le bouton
  const canProject = !!precomputedByProvince || (!!rawRecords && rawRecords.some((r) => !!norm((r as { province?: unknown }).province)));
  if (!canProject) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive) {
      clearProjection();
      return;
    }
    const byProvince = buildByProvince();
    if (!byProvince) {
      toast.warning('Aucune donnée géolocalisée pour ce visuel');
      return;
    }
    // Dataset global (sans filtre géo) — uniquement si le bloc l'a fourni
    // ET si le set unscoped diffère réellement du set filtré (sinon inutile).
    let byProvinceGlobal: Record<string, number> | undefined;
    let hasGeoFilter = false;
    if (unscopedRecords && rawRecords && unscopedRecords.length > rawRecords.length) {
      const agg = aggregateByProvince(unscopedRecords, valueAccessor);
      if (agg && Object.keys(agg).length > Object.keys(byProvince).length) {
        byProvinceGlobal = agg;
        hasGeoFilter = true;
      }
    }
    const payload: MapProjection = {
      id: projectionId,
      sourceTab,
      label,
      unit,
      dataSource,
      byProvince,
      byProvinceGlobal,
      hasGeoFilter,
    };
    setProjection(payload);
    onActivate?.();
    toast.success(`Projection appliquée : ${label}`, { duration: 1800 });
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant={isActive ? 'default' : 'ghost'}
            onClick={handleClick}
            className="h-7 w-7 sm:h-5 sm:w-5 shrink-0"
            aria-label={isActive ? 'Retirer de la carte' : 'Afficher sur la carte'}
            aria-pressed={isActive}
          >
            <MapIcon className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px]">
          {isActive ? 'Retirer de la carte' : 'Afficher sur la carte'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

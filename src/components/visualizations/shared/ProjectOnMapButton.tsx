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
  const isActive = projection?.id === projectionId;

  // Construire la map province → valeur (clés normalisées via normalizeProvinceName)
  const buildByProvince = (): Record<string, number> | null => {
    if (precomputedByProvince) {
      // Re-normaliser les clés pour matcher la carte
      const out: Record<string, number> = {};
      Object.entries(precomputedByProvince).forEach(([k, v]) => {
        const nk = normalizeProvinceName(k);
        if (nk) out[nk] = (out[nk] || 0) + (Number(v) || 0);
      });
      return Object.keys(out).length > 0 ? out : null;
    }
    if (!rawRecords || rawRecords.length === 0) return null;
    const map: Record<string, number> = {};
    let any = false;
    rawRecords.forEach((r) => {
      const prov = norm(r.province);
      if (!prov) return;
      const v = valueAccessor ? Number(valueAccessor(r)) || 0 : 1;
      if (!Number.isFinite(v)) return;
      map[prov] = (map[prov] || 0) + v;
      any = true;
    });
    return any ? map : null;
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
    const payload: MapProjection = {
      id: projectionId,
      sourceTab,
      label,
      unit,
      dataSource,
      byProvince,
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

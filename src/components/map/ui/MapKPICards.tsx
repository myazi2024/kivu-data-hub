import React from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, X } from 'lucide-react';

interface ScopedStats {
  certEnregCount: number;
  contratLocCount: number;
  ficheParcCount: number;
  titleRequestsCount: number;
  disputesCount: number;
  activeMortgagesCount: number;
  pendingMutationsCount: number;
  pendingExpertisesCount: number;
  avgParcelSurfaceSqm: number;
  avgBuildingSurfaceSqm: number;
  avgBuildingHeightM: number;
}

interface MapKPICardsProps {
  scopeLabel: string;
  scopedStats: ScopedStats;
  isChartVisible: (key: string) => boolean;
  dt: (key: string, fallback: string) => string;
  formatNumber: (n: number) => string;
  onClose: () => void;
}

/** Scoped land-data indicator cards displayed below the map when a province is selected */
export const MapKPICards: React.FC<MapKPICardsProps> = ({
  scopeLabel,
  scopedStats,
  isChartVisible,
  dt,
  formatNumber,
  onClose,
}) => {
  const indicators = [
    {
      key: 'detail-cert-enreg',
      label: 'Certif. enregistrement',
      value: formatNumber(scopedStats.certEnregCount),
    },
    {
      key: 'detail-contrat-loc',
      label: 'Contrat location',
      value: formatNumber(scopedStats.contratLocCount),
    },
    {
      key: 'detail-fiche-parc',
      label: 'Fiche parcellaire',
      value: formatNumber(scopedStats.ficheParcCount),
    },
    {
      key: 'detail-title-req',
      label: 'Titres demandés',
      value: formatNumber(scopedStats.titleRequestsCount),
    },
    {
      key: 'detail-disputes',
      label: 'Litiges fonciers',
      value: formatNumber(scopedStats.disputesCount),
    },
    {
      key: 'detail-mortgages',
      label: 'Hypothèques actives',
      value: formatNumber(scopedStats.activeMortgagesCount),
    },
    {
      key: 'detail-mutations',
      label: 'Mutations en cours',
      value: formatNumber(scopedStats.pendingMutationsCount),
    },
    {
      key: 'detail-expertises',
      label: 'Expertises en cours',
      value: formatNumber(scopedStats.pendingExpertisesCount),
    },
    {
      key: 'detail-avg-surface',
      label: 'Sup. moy. parcelle',
      value: scopedStats.avgParcelSurfaceSqm > 0 ? `${formatNumber(scopedStats.avgParcelSurfaceSqm)} m²` : '—',
    },
    {
      key: 'detail-avg-building',
      label: 'Sup. moy. construction',
      value: scopedStats.avgBuildingSurfaceSqm > 0 ? `${formatNumber(scopedStats.avgBuildingSurfaceSqm)} m²` : '—',
    },
    {
      key: 'detail-avg-height',
      label: 'Haut. moy. construction',
      value: scopedStats.avgBuildingHeightM > 0 ? `${formatNumber(scopedStats.avgBuildingHeightM)} m` : '—',
    },
  ].filter(({ key }) => isChartVisible(key));

  return (
    <div className="px-2 py-1.5">
      <div className="sticky top-0 z-10 flex min-h-11 items-center justify-between gap-2 border-b border-border bg-card lg:min-h-8">
        <div className="flex items-center gap-1 min-w-0">
          <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
          <span className="text-[11px] sm:text-xs font-medium text-foreground truncate">{scopeLabel}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-11 w-11 shrink-0 text-muted-foreground lg:hidden"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <dl className="divide-y divide-border/60">
        {indicators.map(({ key, label, value }) => (
          <div key={key} className="grid min-h-7 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-1 text-[10px] sm:text-[11px]">
            <dt className="truncate text-muted-foreground">{dt(key, label)}</dt>
            <dd className="font-semibold tabular-nums text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

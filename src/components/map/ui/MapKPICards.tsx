import React from 'react';
import { Card } from '@/components/ui/card';
import { Database, MapPin } from 'lucide-react';

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
  return (
    <div className="p-2 space-y-2">
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1 min-w-0">
          <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
          <span className="text-[11px] sm:text-xs font-medium text-foreground truncate">{scopeLabel}</span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden flex-shrink-0 h-5 w-5 flex items-center justify-center rounded-full bg-muted hover:bg-destructive hover:text-destructive-foreground transition-colors text-muted-foreground"
          aria-label="Fermer"
        >
          <span className="text-xs font-medium leading-none">✕</span>
        </button>
      </div>

      <div className="space-y-1">
        <h5 className="text-[10px] font-medium text-foreground flex items-center gap-1">
          <Database className="h-3 w-3 text-primary" />
          Indicateurs fonciers
        </h5>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
          {isChartVisible('detail-cert-enreg') && (
            <Card className="analytics-card border-0 p-1">
              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-cert-enreg', 'Certif. enregistrement')}</div>
              <div className="text-[11px] font-bold text-primary">{formatNumber(scopedStats.certEnregCount)}</div>
            </Card>
          )}
          {isChartVisible('detail-contrat-loc') && (
            <Card className="analytics-card border-0 p-1">
              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-contrat-loc', 'Contrat location')}</div>
              <div className="text-[11px] font-bold text-blue-600">{formatNumber(scopedStats.contratLocCount)}</div>
            </Card>
          )}
          {isChartVisible('detail-fiche-parc') && (
            <Card className="analytics-card border-0 p-1">
              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-fiche-parc', 'Fiche parcellaire')}</div>
              <div className="text-[11px] font-bold text-emerald-600">{formatNumber(scopedStats.ficheParcCount)}</div>
            </Card>
          )}
          {isChartVisible('detail-title-req') && (
            <Card className="analytics-card border-0 p-1">
              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-title-req', 'Titres demandés')}</div>
              <div className="text-[11px] font-bold text-violet-600">{formatNumber(scopedStats.titleRequestsCount)}</div>
            </Card>
          )}
          {isChartVisible('detail-disputes') && (
            <Card className="analytics-card border-0 p-1">
              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-disputes', 'Litiges fonciers')}</div>
              <div className="text-[11px] font-bold text-orange-500">{formatNumber(scopedStats.disputesCount)}</div>
            </Card>
          )}
          {isChartVisible('detail-mortgages') && (
            <Card className="analytics-card border-0 p-1">
              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-mortgages', 'Hypothèques actives')}</div>
              <div className="text-[11px] font-bold text-red-600">{formatNumber(scopedStats.activeMortgagesCount)}</div>
            </Card>
          )}
          {isChartVisible('detail-mutations') && (
            <Card className="analytics-card border-0 p-1">
              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-mutations', 'Mutations en cours')}</div>
              <div className="text-[11px] font-bold text-violet-600">{formatNumber(scopedStats.pendingMutationsCount)}</div>
            </Card>
          )}
          {isChartVisible('detail-expertises') && (
            <Card className="analytics-card border-0 p-1">
              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-expertises', 'Expertises en cours')}</div>
              <div className="text-[11px] font-bold text-blue-600">{formatNumber(scopedStats.pendingExpertisesCount)}</div>
            </Card>
          )}
          {isChartVisible('detail-avg-surface') && (
            <Card className="analytics-card border-0 p-1">
              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-avg-surface', 'Sup. moy. parcelle')}</div>
              <div className="text-[11px] font-bold text-emerald-700">{scopedStats.avgParcelSurfaceSqm > 0 ? `${formatNumber(scopedStats.avgParcelSurfaceSqm)} m²` : '—'}</div>
            </Card>
          )}
          {isChartVisible('detail-avg-building') && (
            <Card className="analytics-card border-0 p-1">
              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-avg-building', 'Sup. moy. construction')}</div>
              <div className="text-[11px] font-bold text-emerald-600">{scopedStats.avgBuildingSurfaceSqm > 0 ? `${formatNumber(scopedStats.avgBuildingSurfaceSqm)} m²` : '—'}</div>
            </Card>
          )}
          {isChartVisible('detail-avg-height') && (
            <Card className="analytics-card border-0 p-1">
              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-avg-height', 'Haut. moy. construction')}</div>
              <div className="text-[11px] font-bold text-blue-600">{scopedStats.avgBuildingHeightM > 0 ? `${scopedStats.avgBuildingHeightM} m` : '—'}</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

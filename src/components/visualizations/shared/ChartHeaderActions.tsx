/**
 * ChartHeaderActions — bloc d'actions standardisé pour l'en-tête des cartes
 * analytiques (CrossPicker éventuel + ProjectOnMapButton + ShareButton).
 *
 * Mutualisé entre ChartCard, StackedBarCard, MultiAreaChartCard et ColorMappedPieCard
 * pour garantir une expérience uniforme du bouton « Afficher sur la carte ».
 */
import React from 'react';
import ShareButton from '@/components/shared/ShareButton';
import { ProjectOnMapButton } from './ProjectOnMapButton';
import { useProjectionTab } from './ProjectionTabContext';

interface Props {
  title: string;
  getBlob: () => Promise<Blob>;
  rawRecords?: any[];
  /** Identifiant stable (préfère la `key` du registre charts au titre) */
  projectionKey?: string;
  projectionTab?: string;
  projectionSource?: string;
  /** Slot facultatif (ex: CrossVariablePicker) rendu avant les actions standards */
  before?: React.ReactNode;
}

export const ChartHeaderActions: React.FC<Props> = ({
  title, getBlob, rawRecords, projectionKey, projectionTab, projectionSource, before,
}) => {
  const ctxTab = useProjectionTab();
  const effectiveTab = projectionTab || ctxTab;
  const stableId = projectionKey || title;

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {before}
      {rawRecords && effectiveTab && (
        <ProjectOnMapButton
          projectionId={`${effectiveTab}::${stableId}`}
          label={title}
          rawRecords={rawRecords}
          sourceTab={effectiveTab}
          dataSource={projectionSource}
        />
      )}
      <ShareButton getBlob={getBlob} title={title} variant="chart" />
    </div>
  );
};

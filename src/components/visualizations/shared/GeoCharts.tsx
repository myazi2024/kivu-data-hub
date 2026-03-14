import React, { useMemo } from 'react';
import { countBy, CHART_COLORS, getSectionType } from '@/utils/analyticsHelpers';
import { ChartCard } from './ChartCard';

interface Props {
  records: any[];
  /** Color indices for ville, commune, quartier, territoire, collectivite, groupement */
  colorIndices?: number[];
}

/**
 * Renders geographic breakdown charts (ville, commune, quartier for urban;
 * territoire, collectivite, groupement for rural) based on filtered records.
 * Properly separates urban/rural records using section_type/parcel_type.
 */
export const GeoCharts: React.FC<Props> = ({ records, colorIndices = [2, 6, 10, 7, 8, 11] }) => {
  const urbanRecords = useMemo(() => records.filter(r => {
    const st = getSectionType(r);
    return st === 'urbaine';
  }), [records]);

  const ruralRecords = useMemo(() => records.filter(r => {
    const st = getSectionType(r);
    return st === 'rurale';
  }), [records]);

  const byVille = useMemo(() => countBy(urbanRecords, 'ville'), [urbanRecords]);
  const byCommune = useMemo(() => countBy(urbanRecords, 'commune'), [urbanRecords]);
  const byQuartier = useMemo(() => countBy(urbanRecords, 'quartier'), [urbanRecords]);
  const byTerritoire = useMemo(() => countBy(ruralRecords, 'territoire'), [ruralRecords]);
  const byCollectivite = useMemo(() => countBy(ruralRecords, 'collectivite'), [ruralRecords]);
  const byGroupement = useMemo(() => countBy(ruralRecords, 'groupement'), [ruralRecords]);

  return (
    <>
      <ChartCard title="Par ville" data={byVille} type="bar-v" colorIndex={colorIndices[0]} hidden={byVille.length === 0} />
      <ChartCard title="Par commune" data={byCommune} type="bar-v" colorIndex={colorIndices[1]} hidden={byCommune.length === 0} />
      <ChartCard title="Par quartier" data={byQuartier} type="bar-v" colorIndex={colorIndices[2]} hidden={byQuartier.length === 0} />
      <ChartCard title="Par territoire" data={byTerritoire} type="bar-v" colorIndex={colorIndices[3]} hidden={byTerritoire.length === 0} />
      <ChartCard title="Par collectivité" data={byCollectivite} type="bar-v" colorIndex={colorIndices[4]} hidden={byCollectivite.length === 0} />
      <ChartCard title="Par groupement" data={byGroupement} type="bar-v" colorIndex={colorIndices[5]} hidden={byGroupement.length === 0} />
    </>
  );
};

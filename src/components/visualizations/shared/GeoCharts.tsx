import React, { useMemo } from 'react';
import { countBy, getSectionType } from '@/utils/analyticsHelpers';
import { ChartCard } from './ChartCard';

interface Props {
  records: any[];
  colorIndices?: number[];
}

/**
 * Renders geographic breakdown charts based on section type.
 * Urban: ville → commune → quartier → avenue
 * Rural: territoire → collectivité → groupement → village
 */
export const GeoCharts: React.FC<Props> = ({ records, colorIndices = [2, 6, 10, 7, 8, 11] }) => {
  // Single-pass classification
  const { urbanRecords, ruralRecords } = useMemo(() => {
    const urban: any[] = [];
    const rural: any[] = [];
    records.forEach(r => {
      const st = getSectionType(r);
      if (st === 'urbaine') urban.push(r);
      else if (st === 'rurale') rural.push(r);
    });
    return { urbanRecords: urban, ruralRecords: rural };
  }, [records]);

  const byVille = useMemo(() => countBy(urbanRecords, 'ville'), [urbanRecords]);
  const byCommune = useMemo(() => countBy(urbanRecords, 'commune'), [urbanRecords]);
  const byQuartier = useMemo(() => countBy(urbanRecords, 'quartier'), [urbanRecords]);
  const byAvenue = useMemo(() => countBy(urbanRecords, 'avenue'), [urbanRecords]);
  const byTerritoire = useMemo(() => countBy(ruralRecords, 'territoire'), [ruralRecords]);
  const byCollectivite = useMemo(() => countBy(ruralRecords, 'collectivite'), [ruralRecords]);
  const byGroupement = useMemo(() => countBy(ruralRecords, 'groupement'), [ruralRecords]);
  const byVillage = useMemo(() => countBy(ruralRecords, 'village'), [ruralRecords]);

  return (
    <>
      <ChartCard title="Par ville" data={byVille} type="bar-v" colorIndex={colorIndices[0]} hidden={byVille.length === 0} />
      <ChartCard title="Par commune" data={byCommune} type="bar-v" colorIndex={colorIndices[1]} hidden={byCommune.length === 0} />
      <ChartCard title="Par quartier" data={byQuartier} type="bar-v" colorIndex={colorIndices[2]} hidden={byQuartier.length === 0} />
      <ChartCard title="Par avenue" data={byAvenue} type="bar-v" colorIndex={colorIndices[0]} hidden={byAvenue.length === 0} />
      <ChartCard title="Par territoire" data={byTerritoire} type="bar-v" colorIndex={colorIndices[3]} hidden={byTerritoire.length === 0} />
      <ChartCard title="Par collectivité" data={byCollectivite} type="bar-v" colorIndex={colorIndices[4]} hidden={byCollectivite.length === 0} />
      <ChartCard title="Par groupement" data={byGroupement} type="bar-v" colorIndex={colorIndices[5]} hidden={byGroupement.length === 0} />
      <ChartCard title="Par village" data={byVillage} type="bar-v" colorIndex={colorIndices[3]} hidden={byVillage.length === 0} />
    </>
  );
};

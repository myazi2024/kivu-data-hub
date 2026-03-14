import React, { useMemo, memo } from 'react';
import { countBy, getSectionType } from '@/utils/analyticsHelpers';
import { ChartCard } from './ChartCard';

interface Props {
  records: any[];
  colorIndices?: number[];
}

/**
 * Renders geographic breakdown charts.
 * Always shows province, then conditionally:
 * Urban: ville → commune → quartier → avenue
 * Rural: territoire → collectivité → groupement → village
 * 
 * #1: Added province chart
 * #6: Wrapped with React.memo
 * #29: Conditional computation — only compute urban/rural breakdowns when records exist
 */
export const GeoCharts: React.FC<Props> = memo(({ records, colorIndices = [2, 6, 10, 7, 8, 11] }) => {
  // Province breakdown (always shown) — #1 & #15
  const byProvince = useMemo(() => countBy(records, 'province'), [records]);

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

  // #29: Only compute when records exist for that section
  const byVille = useMemo(() => urbanRecords.length > 0 ? countBy(urbanRecords, 'ville') : [], [urbanRecords]);
  const byCommune = useMemo(() => urbanRecords.length > 0 ? countBy(urbanRecords, 'commune') : [], [urbanRecords]);
  const byQuartier = useMemo(() => urbanRecords.length > 0 ? countBy(urbanRecords, 'quartier') : [], [urbanRecords]);
  const byAvenue = useMemo(() => urbanRecords.length > 0 ? countBy(urbanRecords, 'avenue') : [], [urbanRecords]);
  const byTerritoire = useMemo(() => ruralRecords.length > 0 ? countBy(ruralRecords, 'territoire') : [], [ruralRecords]);
  const byCollectivite = useMemo(() => ruralRecords.length > 0 ? countBy(ruralRecords, 'collectivite') : [], [ruralRecords]);
  const byGroupement = useMemo(() => ruralRecords.length > 0 ? countBy(ruralRecords, 'groupement') : [], [ruralRecords]);
  const byVillage = useMemo(() => ruralRecords.length > 0 ? countBy(ruralRecords, 'village') : [], [ruralRecords]);

  return (
    <>
      <ChartCard title="Par province" data={byProvince} type="bar-h" colorIndex={colorIndices[0]} labelWidth={100} hidden={byProvince.length === 0} />
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
});

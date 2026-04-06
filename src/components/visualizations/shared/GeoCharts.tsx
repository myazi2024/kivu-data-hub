import React, { useMemo, memo } from 'react';
import { countBy, getSectionType } from '@/utils/analyticsHelpers';
import { generateInsight } from '@/utils/chartInsights';
import { ChartCard } from './ChartCard';

interface Props {
  records: any[];
  colorIndices?: number[];
}

/**
 * Renders geographic breakdown charts aligned with CCC form hierarchy:
 * Province → Section (Urbaine/Rurale) → conditional sub-levels
 * Urban: ville → commune → quartier
 * Rural: territoire → collectivité → groupement → village
 */
export const GeoCharts: React.FC<Props> = memo(({ records, colorIndices = [2, 6, 10, 7, 8, 11] }) => {
  const byProvince = useMemo(() => countBy(records, 'province'), [records]);

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

  // Section breakdown (Urbaine vs Rurale)
  const bySection = useMemo(() => {
    const counts: { name: string; value: number }[] = [];
    if (urbanRecords.length > 0) counts.push({ name: 'Urbaine', value: urbanRecords.length });
    if (ruralRecords.length > 0) counts.push({ name: 'Rurale', value: ruralRecords.length });
    return counts;
  }, [urbanRecords, ruralRecords]);

  // Urban sub-levels
  const byVille = useMemo(() => urbanRecords.length > 0 ? countBy(urbanRecords, 'ville') : [], [urbanRecords]);
  const byCommune = useMemo(() => urbanRecords.length > 0 ? countBy(urbanRecords, 'commune') : [], [urbanRecords]);
  const byQuartier = useMemo(() => urbanRecords.length > 0 ? countBy(urbanRecords, 'quartier') : [], [urbanRecords]);

  // Rural sub-levels
  const byTerritoire = useMemo(() => ruralRecords.length > 0 ? countBy(ruralRecords, 'territoire') : [], [ruralRecords]);
  const byCollectivite = useMemo(() => ruralRecords.length > 0 ? countBy(ruralRecords, 'collectivite') : [], [ruralRecords]);
  const byGroupement = useMemo(() => ruralRecords.length > 0 ? countBy(ruralRecords, 'groupement') : [], [ruralRecords]);
  const byVillage = useMemo(() => ruralRecords.length > 0 ? countBy(ruralRecords, 'village') : [], [ruralRecords]);

  return (
    <>
      {/* 1. Province */}
      <ChartCard title="Par province" data={byProvince} type="bar-h" colorIndex={colorIndices[0]} labelWidth={100} hidden={byProvince.length === 0}
        insight={generateInsight(byProvince, 'bar-h', 'les provinces')} />

      {/* 2. Section (Urbaine / Rurale) */}
      <ChartCard title="Par section" data={bySection} type="donut" colorIndex={colorIndices[1]} hidden={bySection.length === 0}
        insight={generateInsight(bySection, 'donut', 'les sections')} />

      {/* 3. Urban sub-levels: Ville → Commune → Quartier */}
      {urbanRecords.length > 0 && (
        <>
          <ChartCard title="Par ville" data={byVille} type="bar-v" colorIndex={colorIndices[0]} hidden={byVille.length === 0}
            insight={generateInsight(byVille, 'bar-v', 'les villes')} />
          <ChartCard title="Par commune" data={byCommune} type="bar-v" colorIndex={colorIndices[1]} hidden={byCommune.length === 0}
            insight={generateInsight(byCommune, 'bar-v', 'les communes')} />
          <ChartCard title="Par quartier" data={byQuartier} type="bar-v" colorIndex={colorIndices[2]} hidden={byQuartier.length === 0}
            insight={generateInsight(byQuartier, 'bar-v', 'les quartiers')} />
        </>
      )}

      {/* 4. Rural sub-levels: Territoire → Collectivité → Groupement → Village */}
      {ruralRecords.length > 0 && (
        <>
          <ChartCard title="Par territoire" data={byTerritoire} type="bar-v" colorIndex={colorIndices[3]} hidden={byTerritoire.length === 0}
            insight={generateInsight(byTerritoire, 'bar-v', 'les territoires')} />
          <ChartCard title="Par collectivité" data={byCollectivite} type="bar-v" colorIndex={colorIndices[4]} hidden={byCollectivite.length === 0}
            insight={generateInsight(byCollectivite, 'bar-v', 'les collectivités')} />
          <ChartCard title="Par groupement" data={byGroupement} type="bar-v" colorIndex={colorIndices[5]} hidden={byGroupement.length === 0}
            insight={generateInsight(byGroupement, 'bar-v', 'les groupements')} />
          <ChartCard title="Par village" data={byVillage} type="bar-v" colorIndex={colorIndices[3]} hidden={byVillage.length === 0}
            insight={generateInsight(byVillage, 'bar-v', 'les villages')} />
        </>
      )}
    </>
  );
});
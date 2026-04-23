/**
 * AnalyticsFilters — orchestrator.
 *
 * Glue between map drilldown contexts, the geographic cascade hook
 * (`useAnalyticsCascade`) and the two presentational rows
 * (`AnalyticsTimeRow`, `AnalyticsLocationRow`). Handles auto-hide on idle.
 *
 * Refactored from a 542-line monolith into 4 focused modules. Behaviour
 * preserved 1:1 — same context bindings, same reset logic, same UX.
 */
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AnalyticsFilter, defaultFilter, extractUnique, getAvailableYears,
} from '@/utils/analyticsHelpers';
import {
  ProvinceFilterContext, MapProvinceContext,
  VilleChangeContext, CommuneChangeContext, QuartierChangeContext,
  TerritoireChangeContext, TerritoireFilterContext,
  SectionTypeChangeContext, SectionTypeContext,
} from './analyticsFilterContexts';
import { useAnalyticsCascade } from './useAnalyticsCascade';
import { AnalyticsTimeRow } from './AnalyticsTimeRow';
import { AnalyticsLocationRow } from './AnalyticsLocationRow';

// Re-export contexts for downstream imports (keeps existing public API).
export {
  ProvinceFilterContext, MapProvinceContext,
  VilleFilterContext, VilleChangeContext,
  CommuneFilterContext, CommuneChangeContext,
  QuartierFilterContext, QuartierChangeContext,
  TerritoireFilterContext, TerritoireChangeContext,
  SectionTypeContext, SectionTypeChangeContext,
} from './analyticsFilterContexts';

interface Props {
  data: any[];
  filter: AnalyticsFilter;
  onChange: (f: AnalyticsFilter) => void;
  onVilleChange?: (ville: string | undefined) => void;
  onCommuneChange?: (commune: string | undefined) => void;
  dateField?: string;
  statusField?: string;
  hideStatus?: boolean;
  hideTime?: boolean;
  hideLocation?: boolean;
  onExport?: () => void;
}

export const AnalyticsFilters: React.FC<Props> = ({
  data, filter, onChange, onVilleChange, onCommuneChange,
  dateField = 'created_at', statusField,
  hideStatus = false, hideTime = false, hideLocation = false,
}) => {
  // Map ↔ filters bidirectional bridges
  const provinceFilterCallback = useContext(ProvinceFilterContext);
  const mapProvince = useContext(MapProvinceContext);
  const villeChangeCtx = useContext(VilleChangeContext);
  const communeChangeCtx = useContext(CommuneChangeContext);
  const quartierChangeCtx = useContext(QuartierChangeContext);
  const territoireChangeCtx = useContext(TerritoireChangeContext);
  const mapTerritoire = useContext(TerritoireFilterContext);
  const sectionTypeChangeCtx = useContext(SectionTypeChangeContext);

  const handleVilleChange = onVilleChange || villeChangeCtx || (() => {});
  const handleCommuneChange = onCommuneChange || communeChangeCtx || (() => {});
  const handleQuartierChange = quartierChangeCtx || (() => {});
  const handleTerritoireChange = territoireChangeCtx || (() => {});
  const handleProvinceFilter = provinceFilterCallback || (() => {});

  // Sync filter when map-driven territoire/province change
  const prevMapTerritoire = useRef(mapTerritoire);
  useEffect(() => {
    if (mapTerritoire && mapTerritoire !== prevMapTerritoire.current && mapTerritoire !== filter.territoire) {
      onChange({
        ...filter,
        province: mapProvince || filter.province,
        sectionType: 'rurale',
        territoire: mapTerritoire,
        collectivite: undefined,
        groupement: undefined,
        villageFilter: undefined,
        ville: undefined,
        commune: undefined,
        quartier: undefined,
        avenue: undefined,
      });
    }
    prevMapTerritoire.current = mapTerritoire;
  }, [mapTerritoire, mapProvince]); // eslint-disable-line react-hooks/exhaustive-deps

  const years = useMemo(() => {
    const dataYears = getAvailableYears(data, dateField);
    const currentYear = new Date().getFullYear();
    if (!dataYears.includes(currentYear)) dataYears.unshift(currentYear);
    return dataYears.sort((a, b) => b - a);
  }, [data, dateField]);

  const cascade = useAnalyticsCascade({ data, filter });

  const detectedStatusField = statusField || (data.length > 0 && data[0]?.current_status !== undefined ? 'current_status' : 'status');
  const statusOptions = useMemo(
    () => (hideStatus ? [] : extractUnique(data, detectedStatusField)),
    [data, detectedStatusField, hideStatus],
  );

  const hasActiveFilters =
    filter.year !== defaultFilter.year ||
    !!filter.semester || !!filter.quarter || !!filter.month || !!filter.week ||
    filter.sectionType !== 'all' ||
    !!filter.province || !!filter.ville || !!filter.commune || !!filter.quartier || !!filter.avenue ||
    !!filter.territoire || !!filter.collectivite || !!filter.groupement || !!filter.villageFilter ||
    !!filter.status;

  const reset = useCallback(() => {
    onChange({ ...defaultFilter });
    handleVilleChange(undefined);
    handleCommuneChange(undefined);
    handleQuartierChange(undefined);
  }, [onChange, handleVilleChange, handleCommuneChange, handleQuartierChange]);

  // Auto-hide on mouse idle (3s)
  const [filtersVisible, setFiltersVisible] = useState(true);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const resetIdleTimer = useCallback(() => {
    setFiltersVisible(true);
    document.body.classList.remove('cursor-none');
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setFiltersVisible(false);
      document.body.classList.add('cursor-none');
    }, 3000);
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', resetIdleTimer);
    idleTimerRef.current = setTimeout(() => {
      setFiltersVisible(false);
      document.body.classList.add('cursor-none');
    }, 3000);
    return () => {
      document.removeEventListener('mousemove', resetIdleTimer);
      clearTimeout(idleTimerRef.current);
      document.body.classList.remove('cursor-none');
    };
  }, [resetIdleTimer]);

  return (
    <div
      className={`space-y-1 bg-background/95 backdrop-blur-sm rounded-md border border-border/30 shadow-sm sticky top-0 z-10 transition-all duration-300 ease-in-out ${
        filtersVisible ? 'opacity-100 max-h-40 p-1.5' : 'opacity-0 max-h-0 p-0 overflow-hidden'
      }`}
      onMouseEnter={resetIdleTimer}
    >
      {!hideTime && (
        <AnalyticsTimeRow
          filter={filter}
          onChange={onChange}
          years={years}
          hideStatus={hideStatus}
          statusOptions={statusOptions}
          hasActiveFilters={hasActiveFilters}
          onReset={reset}
        />
      )}

      {!hideLocation && (
        <AnalyticsLocationRow
          filter={filter}
          onChange={onChange}
          provinces={cascade.provinces}
          villes={cascade.villes}
          communesFinal={cascade.communesFinal}
          quartiersFinal={cascade.quartiersFinal}
          avenuesFinal={cascade.avenuesFinal}
          territoiresFinal={cascade.territoiresFinal}
          collectivitesFinal={cascade.collectivitesFinal}
          groupements={cascade.groupements}
          villages={cascade.villages}
          hasUrbanData={cascade.hasUrbanData}
          hasRuralData={cascade.hasRuralData}
          onProvinceFilter={handleProvinceFilter}
          onVilleChange={handleVilleChange}
          onCommuneChange={handleCommuneChange}
          onQuartierChange={handleQuartierChange}
          onTerritoireChange={handleTerritoireChange}
          onSectionTypeChange={sectionTypeChangeCtx ?? undefined}
        />
      )}
    </div>
  );
};

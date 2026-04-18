import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ProvinceData } from '@/types/province';
import { normalizeProvinceName } from '../meta/mapMeta';

/**
 * Manages the 4-level drilldown state (province → ville/territoire → commune → quartier),
 * synchronizes it with URL search params (bidirectional), and exposes setters + reset helpers.
 *
 * `getProvincesData` is a getter (called inside effects/callbacks) so the hook can be
 * invoked at the top of the component before `provincesData` is computed.
 */
export function useMapDrilldown(getProvincesData: () => ProvinceData[]) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedProvince, setSelectedProvince] = useState<ProvinceData | null>(null);
  const [externalProvinceId, setExternalProvinceId] = useState<string | null>(null);
  const [selectedVille, setSelectedVille] = useState<string | undefined>(() => searchParams.get('ville') || undefined);
  const [selectedCommune, setSelectedCommune] = useState<string | undefined>(() => searchParams.get('commune') || undefined);
  const [selectedQuartier, setSelectedQuartier] = useState<string | undefined>(() => searchParams.get('quartier') || undefined);
  const [selectedTerritoire, setSelectedTerritoire] = useState<string | undefined>(() => searchParams.get('territoire') || undefined);
  const [selectedSectionType, setSelectedSectionType] = useState<string>(() => searchParams.get('section') || 'all');
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<string>(() => searchParams.get('tab') || 'rdc-map');

  const urlInitRef = useRef(false);
  const getProvincesDataRef = useRef(getProvincesData);
  getProvincesDataRef.current = getProvincesData;

  // ── URL → State: initialize province from URL on first load ──
  useEffect(() => {
    if (urlInitRef.current) return;
    const provincesData = getProvincesDataRef.current();
    if (provincesData.length === 0) return;
    urlInitRef.current = true;
    const pName = searchParams.get('province');
    if (pName) {
      const province = provincesData.find(p => normalizeProvinceName(p.name) === normalizeProvinceName(pName));
      if (province) {
        setSelectedProvince(province);
        setExternalProvinceId(province.id);
      }
    }
  });

  // ── State → URL: sync filters to URL params ──
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedProvince) params.set('province', selectedProvince.name);
    if (selectedVille) params.set('ville', selectedVille);
    if (selectedCommune) params.set('commune', selectedCommune);
    if (selectedQuartier) params.set('quartier', selectedQuartier);
    if (selectedTerritoire) params.set('territoire', selectedTerritoire);
    if (selectedSectionType !== 'all') params.set('section', selectedSectionType);
    if (activeAnalyticsTab && activeAnalyticsTab !== 'rdc-map') params.set('tab', activeAnalyticsTab);
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvince, selectedVille, selectedCommune, selectedQuartier, selectedTerritoire, selectedSectionType, activeAnalyticsTab]);

  /** Handle province filter from Analytics → zoom map */
  const handleProvinceFilter = useCallback((provinceName: string | undefined) => {
    if (!provinceName) {
      setSelectedProvince(null);
      setExternalProvinceId(null);
      setSelectedVille(undefined);
      setSelectedCommune(undefined);
      setSelectedQuartier(undefined);
      setSelectedTerritoire(undefined);
      return;
    }
    const provincesData = getProvincesDataRef.current();
    const province = provincesData.find(p => normalizeProvinceName(p.name) === normalizeProvinceName(provinceName));
    if (province) {
      setSelectedProvince(province);
      setExternalProvinceId(province.id);
      setSelectedVille(undefined);
      setSelectedCommune(undefined);
      setSelectedQuartier(undefined);
      setSelectedTerritoire(undefined);
    }
  }, []);

  /** Reset all geographic selections (used by mobile "close" button) */
  const clearGeoSelection = useCallback(() => {
    setSelectedProvince(null);
    setSelectedVille(undefined);
    setSelectedCommune(undefined);
    setSelectedQuartier(undefined);
  }, []);

  return {
    selectedProvince,
    externalProvinceId,
    selectedVille,
    selectedCommune,
    selectedQuartier,
    selectedTerritoire,
    selectedSectionType,
    activeAnalyticsTab,
    setSelectedProvince,
    setExternalProvinceId,
    setSelectedVille,
    setSelectedCommune,
    setSelectedQuartier,
    setSelectedTerritoire,
    setSelectedSectionType,
    setActiveAnalyticsTab,
    handleProvinceFilter,
    clearGeoSelection,
  };
}

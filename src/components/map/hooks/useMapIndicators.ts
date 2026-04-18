import { useMemo } from 'react';
import { normalizeTitleType } from '@/utils/titleTypeNormalizer';
import type { ProvinceData } from '@/types/province';
import { PROVINCE_META, buildEmptyProvince, buildScopePredicate } from '../meta/mapMeta';
import type { MapTabProfile } from '@/config/mapTabProfiles';

/** Compute the 11 land-data indicators from filtered record sets */
export function computeIndicators(
  parcels: any[],
  titleRequests: any[],
  disputes: any[],
  mortgages: any[],
  mutationRequests: any[],
  expertiseRequests: any[],
  contributions: any[],
) {
  const certEnreg = parcels.filter(p => normalizeTitleType(p.property_title_type) === "Certificat d'enregistrement").length;
  const contratLoc = parcels.filter(p => normalizeTitleType(p.property_title_type) === "Contrat de location (Contrat d'occupation provisoire)").length;
  const ficheParc = parcels.filter(p => normalizeTitleType(p.property_title_type) === "Fiche parcellaire").length;

  const activeMortgages = mortgages.filter((m: any) => m.mortgage_status === 'active').length;
  const pendingMutations = mutationRequests.filter((m: any) => m.status === 'pending' || m.status === 'en_cours').length;
  const pendingExpertises = expertiseRequests.filter((e: any) => e.status === 'pending' || e.status === 'en_cours').length;

  const totalArea = parcels.reduce((s: number, p: any) => s + (p.area_sqm || 0), 0);
  const avgSurface = parcels.length > 0 ? totalArea / parcels.length : 0;

  let buildingSurfaceSum = 0, buildingSurfaceCount = 0;
  let buildingHeightSum = 0, buildingHeightCount = 0;
  contributions.forEach((c: any) => {
    const shapes = Array.isArray(c.building_shapes) ? c.building_shapes : [];
    shapes.forEach((s: any) => {
      const area = s.areaSqm || (s.width && s.height ? s.width * s.height : 0);
      if (area > 0) { buildingSurfaceSum += area; buildingSurfaceCount++; }
      if (s.heightM > 0) { buildingHeightSum += s.heightM; buildingHeightCount++; }
    });
  });

  return {
    certEnregCount: certEnreg,
    contratLocCount: contratLoc,
    ficheParcCount: ficheParc,
    titleRequestsCount: titleRequests.length,
    disputesCount: disputes.length,
    activeMortgagesCount: activeMortgages,
    pendingMutationsCount: pendingMutations,
    pendingExpertisesCount: pendingExpertises,
    avgParcelSurfaceSqm: Math.round(avgSurface * 10) / 10,
    avgBuildingSurfaceSqm: buildingSurfaceCount > 0 ? Math.round((buildingSurfaceSum / buildingSurfaceCount) * 10) / 10 : 0,
    avgBuildingHeightM: buildingHeightCount > 0 ? Math.round((buildingHeightSum / buildingHeightCount) * 10) / 10 : 0,
    parcelsCount: parcels.length,
  };
}

interface UseMapIndicatorsArgs {
  analytics: any;
  activeProfile: MapTabProfile | null;
  selectedProvince: ProvinceData | null;
  selectedVille?: string;
  selectedCommune?: string;
  selectedQuartier?: string;
  selectedTerritoire?: string;
}

/**
 * Memoized KPI derivations for the interactive map:
 *  - `provincesData`: per-province indicators for the 26 DRC provinces (with optional profile metric overlay)
 *  - `scopedStats`: indicators recomputed for the most specific geographic filter (province → quartier)
 */
export function useMapIndicators({
  analytics,
  activeProfile,
  selectedProvince,
  selectedVille,
  selectedCommune,
  selectedQuartier,
  selectedTerritoire,
}: UseMapIndicatorsArgs) {
  const provincesData: ProvinceData[] = useMemo(() => {
    if (!analytics) return PROVINCE_META.map(p => buildEmptyProvince(p));

    const { parcels, titleRequests, contributions, disputes, mutationRequests, expertiseRequests, mortgages } = analytics;

    return PROVINCE_META.map(meta => {
      const pFilter = (r: any) => r.province === meta.name;
      const indicators = computeIndicators(
        parcels.filter(pFilter),
        titleRequests.filter(pFilter),
        disputes.filter(pFilter),
        (mortgages || []).filter(pFilter),
        mutationRequests.filter(pFilter),
        expertiseRequests.filter(pFilter),
        contributions.filter(pFilter),
      );

      const base: ProvinceData = { id: meta.id, name: meta.name, ...indicators };

      if (activeProfile) {
        const ctx = { analytics, provinceName: meta.name };
        base.metricValue = activeProfile.metric(ctx);
        base.extraTooltipLines = activeProfile.tooltipLines(ctx);
        base.noData = activeProfile.hasData ? !activeProfile.hasData(ctx) : false;
      }
      return base;
    });
  }, [analytics, activeProfile]);

  const scopedStats = useMemo(() => {
    if (!analytics || !selectedProvince) return null;
    const predicate = buildScopePredicate(selectedProvince.name, selectedVille, selectedCommune, selectedQuartier, selectedTerritoire);
    const { parcels, titleRequests, contributions, disputes, mutationRequests, expertiseRequests, mortgages } = analytics;

    return computeIndicators(
      parcels.filter(predicate),
      titleRequests.filter(predicate),
      disputes.filter(predicate),
      (mortgages || []).filter(predicate),
      mutationRequests.filter(predicate),
      expertiseRequests.filter(predicate),
      contributions.filter(predicate),
    );
  }, [analytics, selectedProvince, selectedVille, selectedCommune, selectedQuartier, selectedTerritoire]);

  const totalParcels = useMemo(
    () => provincesData.reduce((s, p) => s + p.parcelsCount, 0),
    [provincesData],
  );

  return { provincesData, scopedStats, totalParcels };
}

/**
 * Geographic cascade derivations for AnalyticsFilters.
 *
 * Combines the static `geographicData` registries with the dynamic dataset:
 * when no admin-defined entries exist for a level, falls back to the unique
 * values present in the actual records (`extractUnique`). Returns the merged
 * "final" lists for every cascade level (urban + rural).
 */
import { useMemo } from 'react';
import {
  AnalyticsFilter,
  extractUnique,
  getSectionType,
  sameGeo,
} from '@/utils/analyticsHelpers';
import {
  getAllProvinces,
  getVillesForProvince,
  getCommunesForVille,
  getTerritoiresForProvince,
  getCollectivitesForTerritoire,
  getQuartiersForCommune,
  getAvenuesForQuartier,
  getLandDistrictsForProvince,
  landDistrictsData,
} from '@/lib/geographicData';

export interface CascadeOptions {
  data: any[];
  filter: AnalyticsFilter;
}

export const useAnalyticsCascade = ({ data, filter }: CascadeOptions) => {
  const provinces = useMemo(() => getAllProvinces(), []);

  const landDistricts = useMemo(() => {
    if (filter.province) return getLandDistrictsForProvince(filter.province);
    return Array.from(new Set(Object.values(landDistrictsData).flat())).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [filter.province]);

  const provinceScoped = useMemo(
    () => (filter.province ? data.filter((r) => sameGeo(r.province, filter.province)) : data),
    [data, filter.province],
  );

  // Données restreintes à la circonscription choisie (repli des listes)
  const districtScoped = useMemo(
    () => (filter.landDistrict ? provinceScoped.filter((r) => sameGeo(r.land_district, filter.landDistrict)) : provinceScoped),
    [provinceScoped, filter.landDistrict],
  );

  // Urban
  const villes = useMemo(() => {
    const fromCcc = filter.province ? getVillesForProvince(filter.province) : [];
    if (fromCcc.length > 0) return fromCcc;
    if (!filter.province) return [];
    return extractUnique(districtScoped.filter((r) => getSectionType(r) !== 'rurale'), 'ville');
  }, [filter.province, districtScoped]);

  const communes = useMemo(() => {
    if (filter.province && filter.ville) return getCommunesForVille(filter.province, filter.ville);
    return [];
  }, [filter.province, filter.ville]);

  const communesFinal = useMemo(() => {
    if (communes.length > 0) return communes;
    if (!filter.ville) return [];
    const scoped = provinceScoped.filter((r) => getSectionType(r) === 'urbaine' && sameGeo(r.ville, filter.ville));
    return extractUnique(scoped, 'commune');
  }, [communes, provinceScoped, filter.ville]);

  const quartiers = useMemo(() => {
    if (filter.province && filter.ville && filter.commune) {
      return getQuartiersForCommune(filter.province, filter.ville, filter.commune);
    }
    return [];
  }, [filter.province, filter.ville, filter.commune]);

  const quartiersFinal = useMemo(() => {
    if (quartiers.length > 0) return quartiers;
    if (!filter.commune) return [];
    const scoped = provinceScoped.filter(
      (r) => getSectionType(r) === 'urbaine' && sameGeo(r.commune, filter.commune),
    );
    return extractUnique(scoped, 'quartier');
  }, [quartiers, provinceScoped, filter.commune]);

  const avenues = useMemo(() => {
    if (filter.province && filter.ville && filter.commune && filter.quartier) {
      return getAvenuesForQuartier(filter.province, filter.ville, filter.commune, filter.quartier);
    }
    return [];
  }, [filter.province, filter.ville, filter.commune, filter.quartier]);

  const avenuesFinal = useMemo(() => {
    if (avenues.length > 0) return avenues;
    if (!filter.quartier) return [];
    const scoped = provinceScoped.filter(
      (r) =>
        getSectionType(r) === 'urbaine' &&
        sameGeo(r.commune, filter.commune) &&
        sameGeo(r.quartier, filter.quartier),
    );
    return extractUnique(scoped, 'avenue');
  }, [avenues, provinceScoped, filter.commune, filter.quartier]);

  // Rural
  const territoires = useMemo(
    () => (filter.province ? getTerritoiresForProvince(filter.province) : []),
    [filter.province],
  );

  const territoiresFinal = useMemo(() => {
    if (territoires.length > 0) return territoires;
    if (!filter.province) return [];
    const scoped = districtScoped.filter((r) => getSectionType(r) !== 'urbaine');
    return extractUnique(scoped, 'territoire');
  }, [territoires, districtScoped, filter.province]);

  const collectivites = useMemo(
    () =>
      filter.province && filter.territoire
        ? getCollectivitesForTerritoire(filter.province, filter.territoire)
        : [],
    [filter.province, filter.territoire],
  );

  const collectivitesFinal = useMemo(() => {
    if (collectivites.length > 0) return collectivites;
    if (!filter.territoire) return [];
    const scoped = provinceScoped.filter(
      (r) => getSectionType(r) === 'rurale' && sameGeo(r.territoire, filter.territoire),
    );
    return extractUnique(scoped, 'collectivite');
  }, [collectivites, provinceScoped, filter.territoire]);

  const sectionScoped = useMemo(() => {
    let scoped = provinceScoped;
    if (filter.landDistrict) {
      scoped = scoped.filter((r) => sameGeo(r.land_district, filter.landDistrict));
    } else if (filter.sectionType !== 'all') scoped = scoped.filter((r) => getSectionType(r) === filter.sectionType);
    if (filter.territoire) scoped = scoped.filter((r) => sameGeo(r.territoire, filter.territoire));
    if (filter.collectivite) scoped = scoped.filter((r) => sameGeo(r.collectivite, filter.collectivite));
    return scoped;
  }, [provinceScoped, filter.landDistrict, filter.sectionType, filter.territoire, filter.collectivite]);

  const groupements = useMemo(
    () => (filter.collectivite ? extractUnique(sectionScoped, 'groupement') : []),
    [sectionScoped, filter.collectivite],
  );

  const groupementScoped = useMemo(
    () => (filter.groupement ? sectionScoped.filter((r) => sameGeo(r.groupement, filter.groupement)) : sectionScoped),
    [sectionScoped, filter.groupement],
  );

  const villages = useMemo(
    () => (filter.groupement ? extractUnique(groupementScoped, 'village') : []),
    [groupementScoped, filter.groupement],
  );

  return {
    provinces,
    landDistricts,
    villes,
    communesFinal,
    quartiersFinal,
    avenuesFinal,
    territoiresFinal,
    collectivitesFinal,
    groupements,
    villages,
  };
};

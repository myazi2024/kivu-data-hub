import { geographicData, landDistrictsData } from '@/lib/geographicData';

/** Normalise un nom : sans accents, casse, apostrophes ni séparateurs. */
export const normalizeGeoName = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Corrections manuelles vérifiées : nom de zone (carte des territoires) -> circonscription,
 * uniquement lorsque la zone correspond à une seule circonscription malgré une orthographe différente.
 */
const ALIASES: Record<string, string> = {};

export interface DistrictMatch {
  /** Nom de la zone dans la carte des territoires. */
  area: string;
  province?: string;
  /** Circonscription foncière équivalente, ou null si la zone n'est pas identifiée. */
  district: string | null;
}

const provinceByArea = (() => {
  const map = new Map<string, string>();
  for (const [province, data] of Object.entries(geographicData)) {
    for (const name of [...Object.keys(data.territoires), ...Object.keys(data.villes)]) {
      const key = normalizeGeoName(name);
      if (!map.has(key)) map.set(key, province);
    }
  }
  return map;
})();

export function matchAreaToDistrict(area: string): DistrictMatch {
  const key = normalizeGeoName(area);
  const province = provinceByArea.get(key);
  const alias = ALIASES[key];
  if (alias) return { area, province, district: alias };
  const candidates = province
    ? landDistrictsData[province] ?? []
    : Object.values(landDistrictsData).flat();
  // Une ville dont plusieurs communes sont elles-mêmes des circonscriptions est découpée.
  if (province) {
    const communes = Object.entries(geographicData[province]?.villes ?? {})
      .find(([ville]) => normalizeGeoName(ville) === key)?.[1] ?? [];
    const districtKeys = new Set((landDistrictsData[province] ?? []).map(normalizeGeoName));
    if (communes.filter((c) => districtKeys.has(normalizeGeoName(c))).length >= 2) {
      return { area, province, district: null };
    }
  }
  const hits = candidates.filter((d) => normalizeGeoName(d) === key);
  if (hits.length !== 1) return { area, province, district: null };
  const resolvedProvince = province
    ?? Object.entries(landDistrictsData).find(([, list]) => list.includes(hits[0]))?.[0];
  return { area, province: resolvedProvince, district: hits[0] };
}

/** Couleur stable et distincte par circonscription (angle d'or sur la liste triée). */
export function buildDistrictColors(districts: string[]): Map<string, string> {
  const sorted = [...new Set(districts)].sort((a, b) => a.localeCompare(b, 'fr'));
  return new Map(sorted.map((d, i) => {
    const hue = Math.round((i * 137.508) % 360);
    const light = 48 + (i % 3) * 7;
    return [d, `hsl(${hue} 68% ${light}%)`];
  }));
}

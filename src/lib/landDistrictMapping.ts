import {
  geographicData,
  getLandDistrictAnchor,
  landDistrictsData,
  normalizeDistrictName,
} from '@/lib/geographicData';

/** Normalise un nom : sans accents, casse, apostrophes ni séparateurs. */
export const normalizeGeoName = (value: string): string =>
  normalizeDistrictName(value);

export interface DistrictMatch {
  /** Nom de la zone dans la carte des territoires. */
  area: string;
  province?: string;
  /** Circonscription foncière équivalente, ou null si la zone n'est pas identifiée. */
  district: string | null;
}

export interface CommuneDistrictMatch extends DistrictMatch {
  city: string;
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

const provinceByCity = (() => {
  const map = new Map<string, string>();
  for (const [province, data] of Object.entries(geographicData)) {
    for (const city of Object.keys(data.villes)) map.set(normalizeGeoName(city), province);
  }
  return map;
})();

/** Match a commune only when its normalized name equals one district in its province. */
export function matchCommuneToDistrict(commune: string, city: string): CommuneDistrictMatch {
  const province = provinceByCity.get(normalizeGeoName(city));
  const exact = (province ? landDistrictsData[province] ?? [] : []).filter((district) => {
    const anchor = getLandDistrictAnchor(province, district);
    return !anchor.partial
      && anchor.level === 'commune'
      && normalizeGeoName(anchor.ville ?? '') === normalizeGeoName(city)
      && normalizeGeoName(anchor.commune ?? '') === normalizeGeoName(commune);
  });

  return {
    area: commune,
    city,
    province,
    district: exact.length === 1 ? exact[0] : null,
  };
}

export function matchAreaToDistrict(area: string): DistrictMatch {
  const key = normalizeGeoName(area);
  const province = provinceByArea.get(key);
  const candidates = province ? landDistrictsData[province] ?? [] : [];
  const hits = candidates.filter((district) => {
    const anchor = getLandDistrictAnchor(province, district);
    if (anchor.partial) return false;
    // Certains fonds nomment explicitement la limite « <ville> Ville ».
    if (normalizeGeoName(district) === key) return true;
    if (anchor.level === 'territoire') return normalizeGeoName(anchor.territoire ?? '') === key;
    if (anchor.level === 'ville') return normalizeGeoName(anchor.ville ?? '') === key;
    return false;
  });
  if (hits.length !== 1) return { area, province, district: null };
  return { area, province, district: hits[0] };
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

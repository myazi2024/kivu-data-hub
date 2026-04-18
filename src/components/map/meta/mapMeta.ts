import type { ProvinceData } from '@/types/province';

/** Province IDs and names for the 26 provinces of DRC */
export const PROVINCE_META: { id: string; name: string }[] = [
  { id: 'CDKN', name: 'Kinshasa' },
  { id: 'CDNK', name: 'Nord-Kivu' },
  { id: 'CDSK', name: 'Sud-Kivu' },
  { id: 'CDBC', name: 'Kongo-Central' },
  { id: 'CDHK', name: 'Haut-Katanga' },
  { id: 'CDLU', name: 'Lualaba' },
  { id: 'CDKC', name: 'Kasaï-Central' },
  { id: 'CDKS', name: 'Kasaï' },
  { id: 'CDKE', name: 'Kasaï-Oriental' },
  { id: 'CDSA', name: 'Sankuru' },
  { id: 'CDLO', name: 'Lomami' },
  { id: 'CDMA', name: 'Maniema' },
  { id: 'CDTO', name: 'Tshopo' },
  { id: 'CDIT', name: 'Ituri' },
  { id: 'CDHU', name: 'Haut-Uele' },
  { id: 'CDBU', name: 'Bas-Uele' },
  { id: 'CDMO', name: 'Mongala' },
  { id: 'CDSU', name: 'Sud-Ubangi' },
  { id: 'CDNU', name: 'Nord-Ubangi' },
  { id: 'CDTU', name: 'Tshuapa' },
  { id: 'CDMN', name: 'Mai-Ndombe' },
  { id: 'CDKL', name: 'Kwilu' },
  { id: 'CDKG', name: 'Kwango' },
  { id: 'CDTA', name: 'Tanganyika' },
  { id: 'CDHL', name: 'Haut-Lomami' },
  { id: 'CDEQ', name: 'Équateur' },
];

/** Default choropleth tiers (parcels density) — used when no analytics profile is active */
export const DEFAULT_DENSITY_TIERS = [
  { label: 'Faible', min: 0, max: 30, color: '#bec8d1' },
  { label: 'Modéré', min: 31, max: 100, color: '#f0b90b' },
  { label: 'Élevé', min: 101, max: 500, color: '#e87422' },
  { label: 'Très élevé', min: 501, max: Infinity, color: '#b31942' },
];

export const DENSITY_TIER_KEYS = ['map-tier-1', 'map-tier-2', 'map-tier-3', 'map-tier-4'];

/** Tooltip line config keys exposed to admin */
export const TOOLTIP_LINE_KEYS = [
  'tooltip-cert-enreg', 'tooltip-contrat-loc', 'tooltip-fiche-parc', 'tooltip-title-req',
  'tooltip-disputes', 'tooltip-mortgages', 'tooltip-mutations', 'tooltip-expertises',
  'tooltip-avg-surface', 'tooltip-avg-building', 'tooltip-avg-height',
];

/** Normalize string for comparison (trim + lowercase) */
export const norm = (s?: string | null) => (s || '').trim().toLowerCase();

/** Normalize province name for URL matching (lowercase, no spaces/dashes) */
export const normalizeProvinceName = (s: string) => s.toLowerCase().replace(/[-\s]/g, '');

/** Build an empty province for loading state */
export function buildEmptyProvince(meta: { id: string; name: string }): ProvinceData {
  return {
    id: meta.id,
    name: meta.name,
    certEnregCount: 0,
    contratLocCount: 0,
    ficheParcCount: 0,
    titleRequestsCount: 0,
    disputesCount: 0,
    activeMortgagesCount: 0,
    pendingMutationsCount: 0,
    pendingExpertisesCount: 0,
    avgParcelSurfaceSqm: 0,
    avgBuildingSurfaceSqm: 0,
    avgBuildingHeightM: 0,
    parcelsCount: 0,
  };
}

/** Build a filter predicate based on the most specific geo scope */
export function buildScopePredicate(
  province?: string,
  ville?: string,
  commune?: string,
  quartier?: string,
  territoire?: string,
): (record: any) => boolean {
  if (quartier) return (r) => norm(r.quartier) === norm(quartier) && norm(r.commune) === norm(commune) && norm(r.ville) === norm(ville) && norm(r.province) === norm(province);
  if (commune) return (r) => norm(r.commune) === norm(commune) && norm(r.ville) === norm(ville) && norm(r.province) === norm(province);
  if (ville) return (r) => norm(r.ville) === norm(ville) && norm(r.province) === norm(province);
  if (territoire && province) return (r) => norm(r.territoire) === norm(territoire) && norm(r.province) === norm(province);
  if (territoire) return (r) => norm(r.territoire) === norm(territoire);
  if (province) return (r) => norm(r.province) === norm(province);
  return () => false;
}

export const HOME_BIC_INDICATORS = [
  { key: 'hero_parcels_count', countKey: 'parcels_count', label: 'Parcelles enregistrées', defaultValue: 9200 },
  { key: 'hero_services_count', countKey: 'services_count', label: 'Services délivrés', defaultValue: 7400 },
  { key: 'hero_disputes_count', countKey: 'disputes_count', label: 'Litiges fonciers répertoriés', defaultValue: 2800 },
] as const;

export type HomeBicCounts = Record<(typeof HOME_BIC_INDICATORS)[number]['countKey'], number>;

export function validCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function displayHomeCount(real: unknown, configured: unknown, fallback: number): number {
  const actual = validCount(real);
  return actual !== null && actual > 10_000 ? actual : (validCount(configured) ?? fallback);
}
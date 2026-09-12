/**
 * Usage réel du bien (ce que l'occupant en fait réellement), distinct de
 * l'usage prévu (`declaredUsage`). La liste proposée est volontairement
 * indépendante de la catégorie de bien : un local d'habitation peut être
 * réellement exploité comme commerce si le bailleur l'autorise.
 */

import { CCC_STATIC_PICKLIST_REGISTRY } from '@/hooks/useCCCFormPicklists';

export const ACTUAL_USAGE_OTHER = 'Autre';

/** Usages considérés comme résidentiels : le nombre d'habitants a du sens. */
const RESIDENTIAL_USAGES = new Set(['Habitation', 'Usage mixte']);

/**
 * Toutes les valeurs d'usage prévu, toutes catégories confondues, dédupliquées,
 * suivies de « Autre ». Les surcharges Admin (DB) priment sur les valeurs par défaut.
 */
export function buildActualUsageOptions(
  getPicklistDependentOptions?: (key: string) => Record<string, string[]>,
): string[] {
  const fallback = CCC_STATIC_PICKLIST_REGISTRY.picklist_declared_usage.fallback as Record<string, string[]>;
  const fromDb = getPicklistDependentOptions?.('picklist_declared_usage');
  const map = fromDb && Object.keys(fromDb).length > 0 ? fromDb : fallback;

  const seen = new Set<string>();
  const options: string[] = [];
  for (const list of Object.values(map)) {
    for (const usage of list || []) {
      const value = (usage || '').trim();
      if (!value || value === 'Location' || value === ACTUAL_USAGE_OTHER) continue;
      if (seen.has(value)) continue;
      seen.add(value);
      options.push(value);
    }
  }
  options.push(ACTUAL_USAGE_OTHER);
  return options;
}

/** Le nombre de personnes vivant sur place n'a de sens que pour un usage résidentiel. */
export function isResidentialActualUsage(actualUsage?: string | null): boolean {
  return !!actualUsage && RESIDENTIAL_USAGES.has(actualUsage);
}

export interface OperationalCapacityField {
  label: string;
  unit: string;
  placeholder: string;
}

/** Libellé et unité de la capacité d'exploitation adaptée à l'usage réel. */
export function resolveOperationalCapacityField(actualUsage?: string | null): OperationalCapacityField {
  switch (actualUsage) {
    case 'Commerce':
    case 'Bureau':
      return { label: 'Nombre de postes de travail', unit: 'postes', placeholder: 'Ex: 8' };
    case 'Entrepôt':
    case "Espace d'entreposage":
    case 'Industrie':
      return { label: 'Capacité de stockage (m³)', unit: 'm³', placeholder: 'Ex: 250' };
    case 'Parking':
      return { label: 'Nombre de places', unit: 'places', placeholder: 'Ex: 12' };
    default:
      return { label: "Capacité d'exploitation", unit: '', placeholder: 'Ex: 10' };
  }
}

/**
 * Évaluateur dynamique de disponibilité des données pour un service du catalogue.
 *
 * Format attendu de `required_data_fields` (JSONB stocké en BD) :
 * {
 *   "mode": "any" | "all",
 *   "rules": [
 *     { "type": "always_true" } |
 *     { "type": "truthy", "field": "parcel.province", "companion"?: "parcel.ville" } |
 *     { "type": "non_empty_array", "field": "ownership_history" }
 *   ]
 * }
 *
 * Si `required_data_fields` est null, vide ou invalide => disponibilité = true (fallback ouvert).
 */

type Rule =
  | { type: 'always_true' }
  | { type: 'truthy'; field: string; companion?: string }
  | { type: 'non_empty_array'; field: string };

interface Spec {
  mode: 'any' | 'all';
  rules: Rule[];
}

const getPath = (obj: unknown, path: string): unknown => {
  return path.split('.').reduce<any>((acc, key) => (acc == null ? acc : acc[key]), obj);
};

const evalRule = (rule: Rule, ctx: unknown): boolean => {
  if (rule.type === 'always_true') return true;
  if (rule.type === 'truthy') {
    const v = getPath(ctx, rule.field);
    if (!v) return false;
    if (rule.companion) return Boolean(getPath(ctx, rule.companion));
    return true;
  }
  if (rule.type === 'non_empty_array') {
    const v = getPath(ctx, rule.field);
    return Array.isArray(v) && v.length > 0;
  }
  return false;
};

export const evaluateServiceAvailability = (
  requiredDataFields: unknown,
  context: unknown
): boolean => {
  if (!requiredDataFields || typeof requiredDataFields !== 'object') return true;
  const spec = requiredDataFields as Partial<Spec>;
  const rules = Array.isArray(spec.rules) ? spec.rules : [];
  if (rules.length === 0) return true;
  const mode = spec.mode === 'all' ? 'all' : 'any';
  return mode === 'all'
    ? rules.every(r => evalRule(r, context))
    : rules.some(r => evalRule(r, context));
};

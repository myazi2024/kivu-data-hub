/**
 * Validation du JSON `required_data_fields` des services cadastraux.
 * Synchronisée avec `evaluateServiceAvailability` dans `src/lib/serviceAvailability.ts`.
 */
export const RULE_MODES = ['any', 'all'] as const;
export const RULE_TYPES = ['always_true', 'truthy', 'non_empty_array'] as const;

export type RuleMode = (typeof RULE_MODES)[number];
export type RuleType = (typeof RULE_TYPES)[number];

export interface RequiredDataFieldsSpec {
  mode: RuleMode;
  rules: Array<{
    type: RuleType;
    field?: string;
    companion?: string;
  }>;
}

export interface RuleValidationResult {
  valid: boolean;
  error?: string;
  parsed?: RequiredDataFieldsSpec | null;
}

/** Valide une chaîne JSON représentant un spec `required_data_fields`. */
export const validateRequiredDataFieldsJson = (raw: string): RuleValidationResult => {
  const trimmed = raw.trim();
  if (!trimmed) return { valid: true, parsed: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (e: any) {
    return { valid: false, error: `JSON invalide : ${e.message}` };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, error: 'Le spec doit être un objet { mode, rules }.' };
  }

  const spec = parsed as Partial<RequiredDataFieldsSpec>;
  if (!spec.mode || !(RULE_MODES as readonly string[]).includes(spec.mode)) {
    return {
      valid: false,
      error: `Champ "mode" requis et égal à ${RULE_MODES.map((m) => `"${m}"`).join(' ou ')}.`,
    };
  }
  if (!Array.isArray(spec.rules) || spec.rules.length === 0) {
    return { valid: false, error: 'Champ "rules" doit être un tableau non vide.' };
  }

  for (let i = 0; i < spec.rules.length; i++) {
    const rule = spec.rules[i] as any;
    if (!rule || typeof rule !== 'object') {
      return { valid: false, error: `rules[${i}] : doit être un objet.` };
    }
    if (!(RULE_TYPES as readonly string[]).includes(rule.type)) {
      return {
        valid: false,
        error: `rules[${i}].type doit être ${RULE_TYPES.map((t) => `"${t}"`).join(' / ')}.`,
      };
    }
    if (rule.type !== 'always_true' && (!rule.field || typeof rule.field !== 'string')) {
      return { valid: false, error: `rules[${i}].field requis pour type "${rule.type}".` };
    }
  }

  return { valid: true, parsed: spec as RequiredDataFieldsSpec };
};

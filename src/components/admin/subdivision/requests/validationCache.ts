import type { ValidationResult } from '@/hooks/useZoningRules';

/**
 * Cache TTL pour les résultats de validation conformité (zonage).
 * Évite de relancer validateSubdivisionAgainstRules à chaque pagination/scroll.
 * TTL: 5 minutes — purge automatique sur miss.
 */
const TTL_MS = 5 * 60 * 1000;
const KEY_PREFIX = 'subdiv_validation_';

interface CachedEntry {
  result: ValidationResult;
  ts: number;
}

export const getCachedValidation = (requestId: string): ValidationResult | null => {
  try {
    const raw = sessionStorage.getItem(KEY_PREFIX + requestId);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedEntry;
    if (Date.now() - entry.ts > TTL_MS) {
      sessionStorage.removeItem(KEY_PREFIX + requestId);
      return null;
    }
    return entry.result;
  } catch {
    return null;
  }
};

export const setCachedValidation = (requestId: string, result: ValidationResult): void => {
  try {
    const entry: CachedEntry = { result, ts: Date.now() };
    sessionStorage.setItem(KEY_PREFIX + requestId, JSON.stringify(entry));
  } catch {
    /* quota exceeded — silently ignore */
  }
};

export const invalidateValidation = (requestId: string): void => {
  try {
    sessionStorage.removeItem(KEY_PREFIX + requestId);
  } catch { /* noop */ }
};

export const clearValidationCache = (): void => {
  try {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(KEY_PREFIX))
      .forEach(k => sessionStorage.removeItem(k));
  } catch { /* noop */ }
};

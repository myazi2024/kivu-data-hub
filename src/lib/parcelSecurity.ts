export type SecurityLevel = 'low' | 'medium' | 'good' | 'high';

export function getSecurityLevel(score: number): { level: SecurityLevel; label: string; colorVar: string } {
  const s = Math.max(0, Math.min(100, Math.round(score || 0)));
  if (s >= 80) return { level: 'high', label: 'Excellent', colorVar: '--security-high' };
  if (s >= 60) return { level: 'good', label: 'Bon', colorVar: '--security-good' };
  if (s >= 40) return { level: 'medium', label: 'Moyen', colorVar: '--security-medium' };
  return { level: 'low', label: 'Faible', colorVar: '--security-low' };
}

export interface ScoreCriterion { weight: number; applicable: boolean; done: boolean }

/** Mirror of the server score (display only): non-applicable criteria are excluded and the rest rescaled to 100. */
export function computeSecurityScore(criteria: ScoreCriterion[]): number {
  const app = criteria.filter((c) => c.applicable);
  const total = app.reduce((a, c) => a + c.weight, 0);
  if (!total) return 0;
  return Math.round((100 * app.filter((c) => c.done).reduce((a, c) => a + c.weight, 0)) / total);
}

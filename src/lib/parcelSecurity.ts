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

export interface CriterionLike { key: string; label: string; applicable: boolean; done: boolean }
export type QuickAction = { label: string; kind: 'map' | 'edit' };

/** Where the owner goes to complete a missing criterion. Services start from the parcel on the cadastral map; declared data is fixed through a correction request. */
const QUICK_ACTIONS: Record<string, QuickAction> = {
  title_info: { label: 'Demander un titre foncier', kind: 'map' },
  title_doc: { label: 'Ajouter la copie du titre', kind: 'edit' },
  no_dispute: { label: 'Suivre le litige', kind: 'map' },
  no_mortgage: { label: 'Demander la radiation', kind: 'map' },
  ownership_history: { label: 'Compléter l’historique', kind: 'edit' },
  boundaries: { label: 'Ajouter les limites', kind: 'edit' },
  area: { label: 'Indiquer la superficie', kind: 'edit' },
  permit: { label: 'Demander une autorisation de bâtir', kind: 'map' },
  tax_current: { label: 'Déclarer l’impôt foncier', kind: 'map' },
  no_arrears: { label: 'Régulariser les arriérés', kind: 'map' },
  expertise: { label: 'Demander une expertise', kind: 'map' },
};
export function getQuickAction(key: string): QuickAction | null { return QUICK_ACTIONS[key] ?? null; }

export type AlertSeverity = 'critical' | 'warning';
const ALERTS: Record<string, { severity: AlertSeverity; message: string }> = {
  no_dispute: { severity: 'critical', message: 'Litige foncier en cours' },
  no_mortgage: { severity: 'warning', message: 'Hypothèque active' },
  no_arrears: { severity: 'critical', message: 'Arriérés d’impôt foncier' },
  tax_current: { severity: 'warning', message: 'Impôt foncier de l’année non déclaré' },
  expertise: { severity: 'warning', message: 'Pas d’expertise valide' },
};
/** Alerts use the same server criteria as the score, so both always agree. Critical first. */
export function getParcelAlerts(criteria: CriterionLike[]) {
  return criteria
    .filter((c) => c.applicable && !c.done && ALERTS[c.key])
    .map((c) => ({ key: c.key, ...ALERTS[c.key] }))
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1));
}

export type ParcelSort = 'score_asc' | 'score_desc' | 'alerts' | 'recent' | 'number';
export interface SortableParcel { parcel_number: string; security_score: number | null; owner_linked_at: string | null; alerts: number }
export function sortParcels<T extends SortableParcel>(list: T[], sort: ParcelSort, onlyAlerts = false): T[] {
  const l = onlyAlerts ? list.filter((p) => p.alerts > 0) : [...list];
  const s = (p: T) => p.security_score ?? 0;
  const cmp: Record<ParcelSort, (a: T, b: T) => number> = {
    score_asc: (a, b) => s(a) - s(b),
    score_desc: (a, b) => s(b) - s(a),
    alerts: (a, b) => b.alerts - a.alerts || s(a) - s(b),
    recent: (a, b) => (b.owner_linked_at ?? '').localeCompare(a.owner_linked_at ?? ''),
    number: (a, b) => a.parcel_number.localeCompare(b.parcel_number, 'fr', { numeric: true }),
  };
  return l.sort(cmp[sort]);
}

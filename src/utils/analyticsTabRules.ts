/**
 * Règles de calcul partagées par les onglets Analytics (Données foncières)
 * et les indicateurs de la Carte RDC, pour que les deux affichent les mêmes chiffres.
 */
import { isRentExemptUnit } from '@/utils/rentalStatus';

/* ───────── Litiges fonciers ───────── */

/** Statuts de litige considérés comme clos (valeurs historiques FR et EN). */
export const RESOLVED_DISPUTE_STATUSES = ['resolu', 'leve', 'resolved', 'closed', 'lifted', 'clos'];

export function isDisputeResolved(status: string | null | undefined): boolean {
  return RESOLVED_DISPUTE_STATUSES.includes((status || '').trim().toLowerCase());
}

/** Ancienneté moyenne (jours) des litiges encore en cours ; 0 si aucun. */
export function openDisputeAvgAgeDays(
  records: { current_status?: string | null; dispute_start_date?: string | null }[],
  now: number = Date.now(),
): number {
  const ages = records
    .filter(d => !isDisputeResolved(d.current_status) && d.dispute_start_date)
    .map(d => (now - new Date(d.dispute_start_date as string).getTime()) / 86_400_000)
    .filter(n => Number.isFinite(n) && n >= 0);
  return ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
}

/* ───────── Taxes foncières ───────── */

/** 'paid' ou 'unpaid' (en attente + en retard), sinon null. */
export function taxStatusGroup(status: string | null | undefined): 'paid' | 'unpaid' | null {
  const v = (status || '').trim().toLowerCase();
  if (['paid', 'payé', 'payée', 'paye', 'payee'].includes(v)) return 'paid';
  if (['pending', 'overdue', 'unpaid', 'en_attente', 'en attente', 'impayé', 'impaye', 'en_retard'].includes(v)) return 'unpaid';
  return null;
}

/* ───────── Hypothèques ───────── */

export function mortgageStatusGroup(status: string | null | undefined): 'active' | 'paid' | null {
  const v = (status || '').trim().toLowerCase();
  if (['active', 'actif', 'active ', 'en_cours', 'en cours', 'renegotiated', 'renégociée', 'renegociee'].includes(v)) return 'active';
  if (['paid', 'soldée', 'soldee', 'closed', 'remboursée', 'remboursee'].includes(v)) return 'paid';
  return null;
}

/* ───────── Lotissement ───────── */

const SUBDIVISION_IN_PROGRESS = ['pending', 'in_review', 'awaiting_payment', 'returned'];
export function isSubdivisionInProgress(status: string | null | undefined): boolean {
  return SUBDIVISION_IN_PROGRESS.includes((status || '').trim().toLowerCase());
}

/* ───────── Outils ───────── */

/** Répartit des valeurs dans des tranches [min, max) sans trou entre tranches ; valeurs ≤ 0 ignorées. */
export function bucketHalfOpen(
  values: number[],
  buckets: { name: string; min: number; max: number }[],
): { name: string; value: number }[] {
  const counts = buckets.map(() => 0);
  values.forEach(n => {
    if (!Number.isFinite(n) || n <= 0) return;
    const i = buckets.findIndex(b => n >= b.min && n < b.max);
    if (i >= 0) counts[i]++;
  });
  return buckets.map((b, i) => ({ name: b.name, value: counts[i] })).filter(b => b.value > 0);
}

/** Moyenne des seules valeurs renseignées (> 0), arrondie ; 0 si aucune. */
export function meanPositive(values: (number | null | undefined)[]): number {
  const v = values.map(n => Number(n)).filter(n => Number.isFinite(n) && n > 0);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
}

/** Remet des libellés dans l'ordre d'une liste de référence (inconnus à la fin). */
export function orderByLabels<T extends { name: string }>(rows: T[], order: string[]): T[] {
  const idx = (n: string) => { const i = order.indexOf(n); return i < 0 ? order.length : i; };
  return [...rows].sort((a, b) => idx(a.name) - idx(b.name));
}

/* ───────── Titre foncier ───────── */

/**
 * Une contribution CCC par parcelle : la plus récente approuvée.
 * Évite de compter plusieurs fois les propriétaires d'une parcelle
 * (contributions en attente, rejetées ou successives).
 */
export function latestApprovedContributionByParcel<T extends { parcel_number?: string | null; status?: string | null; reviewed_at?: string | null; created_at?: string | null }>(
  contribs: T[],
): Map<string, T> {
  const out = new Map<string, T>();
  const ts = (c: T) => new Date(c.reviewed_at || c.created_at || 0).getTime() || 0;
  contribs.forEach(c => {
    if (!c.parcel_number || c.status !== 'approved') return;
    const cur = out.get(c.parcel_number);
    if (!cur || ts(c) > ts(cur)) out.set(c.parcel_number, c);
  });
  return out;
}

/* ───────── Location ───────── */

/** Loyer mensuel USD d'un local ; 0 pour un local vacant ou occupé par le propriétaire. */
export function unitRentUsd(u: any): number {
  if (!u || typeof u !== 'object' || isRentExemptUnit(u)) return 0;
  const n = Number(u.monthly_rent_usd ?? u.monthlyRentUsd ?? u.rent_usd ?? u.monthly_rent ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/* ───────── Bornage ───────── */

export function boundaryEntryDate(b: any): string | null {
  return b?.survey_date || b?.surveyDate || b?.bornage_date || b?.date || null;
}

/** Entrée de bornage réellement renseignée (au moins une information). */
export function isFilledBoundaryEntry(b: any): boolean {
  if (!b || typeof b !== 'object') return false;
  return !!(b.pv_reference_number || b.pvReferenceNumber || b.boundary_purpose || b.boundaryPurpose
    || b.purpose || b.surveyor_name || b.surveyorName || b.surveyor || boundaryEntryDate(b));
}

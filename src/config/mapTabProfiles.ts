/**
 * Map tab profiles — controls how the DRC choropleth map is colored,
 * tooltip-ed and legended depending on the active Analytics tab.
 *
 * Colors use semantic HSL tokens to remain theme-aware (light/dark).
 */

import type { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { normalizeTitleType } from '@/utils/titleTypeNormalizer';

export interface MapTier {
  label: string;
  min: number;
  max: number;
  color: string; // HSL/CSS color value
}

export interface MapTooltipLine {
  label: string;
  value: string;
  /** Tailwind text color class */
  color?: string;
}

export interface MapLegendStat {
  label: string;
  value: string;
  color?: string;
}

/** All inputs needed to compute per-province context for a given profile */
export interface ProfileContext {
  analytics: LandAnalyticsData;
  provinceName: string;
}

export interface MapTabProfile {
  tabKey: string;
  label: string;            // Header label, ex. "Litiges fonciers — RDC"
  legendTitle: string;      // Mini-legend title
  tiers: MapTier[];         // Choropleth tiers
  /** Compute the choropleth metric value for a given province */
  metric: (ctx: ProfileContext) => number;
  /** Tooltip lines (1–4) for hover */
  tooltipLines: (ctx: ProfileContext) => MapTooltipLine[];
  /** Mini KPI block shown bottom-left of map for the active scope */
  legendStats?: (ctx: ProfileContext) => MapLegendStat[];
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

const norm = (s?: string | null) => (s || '').trim().toLowerCase();
const filterProv = <T extends { province?: string | null }>(arr: T[], prov: string): T[] =>
  arr.filter(r => norm(r.province) === norm(prov));

const fmtN = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));
const fmtPct = (n: number) => `${Math.round(n)}%`;
const fmtUsd = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)} k$` : `${Math.round(n)} $`;

/** Pick the dominant value of a string field across a record set */
function topValue<T>(rows: T[], field: (r: T) => string | null | undefined): string {
  const counts = new Map<string, number>();
  rows.forEach(r => {
    const v = field(r);
    if (!v) return;
    counts.set(v, (counts.get(v) || 0) + 1);
  });
  let best = '—', bestN = 0;
  counts.forEach((n, v) => { if (n > bestN) { bestN = n; best = v; } });
  return best;
}

/** Color used for "no data available" provinces — neutral, theme-aware */
export const NO_DATA_COLOR = 'hsl(var(--muted))';

/** Build 4 tiers with min/max thresholds and a color palette */
function makeTiers(thresholds: [number, number, number], colors: [string, string, string, string], unit = ''): MapTier[] {
  const [t1, t2, t3] = thresholds;
  const u = unit ? ` ${unit}` : '';
  return [
    { label: `0–${t1}${u}`,         min: 0,       max: t1,       color: colors[0] },
    { label: `${t1 + 1}–${t2}${u}`, min: t1 + 1,  max: t2,       color: colors[1] },
    { label: `${t2 + 1}–${t3}${u}`, min: t2 + 1,  max: t3,       color: colors[2] },
    { label: `${t3 + 1}+${u}`,      min: t3 + 1,  max: Infinity, color: colors[3] },
  ];
}

/** Compute a quartile of a sorted ascending numeric array (linear interpolation) */
function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  return next !== undefined ? sorted[base] + rest * (next - sorted[base]) : sorted[base];
}

/**
 * Compute adaptive tiers based on the actual distribution of values.
 * Uses Q1/Q2/Q3 quartiles. Falls back to the static `fallback` tiers if all
 * values are zero (avoids meaningless "0-0" buckets).
 */
export function computeAdaptiveTiers(
  values: number[],
  palette: [string, string, string, string],
  fallback: MapTier[],
  unit = '',
): MapTier[] {
  const positives = values.filter(v => v > 0).sort((a, b) => a - b);
  if (positives.length < 2) return fallback;
  const q1 = Math.max(1, Math.round(quantile(positives, 0.25)));
  const q2 = Math.max(q1 + 1, Math.round(quantile(positives, 0.5)));
  const q3 = Math.max(q2 + 1, Math.round(quantile(positives, 0.75)));
  return makeTiers([q1, q2, q3], palette, unit);
}

// Semantic palettes — using HSL color values (theme-resilient enough on choropleth).
const PALETTES = {
  blue:     ['hsl(213 30% 85%)', 'hsl(213 60% 65%)', 'hsl(213 75% 50%)', 'hsl(213 85% 35%)'] as [string, string, string, string],
  violet:   ['hsl(265 30% 85%)', 'hsl(265 55% 65%)', 'hsl(265 70% 50%)', 'hsl(265 80% 35%)'] as [string, string, string, string],
  indigo:   ['hsl(235 30% 85%)', 'hsl(235 55% 65%)', 'hsl(235 70% 50%)', 'hsl(235 80% 35%)'] as [string, string, string, string],
  cyan:     ['hsl(190 30% 85%)', 'hsl(190 55% 60%)', 'hsl(190 70% 45%)', 'hsl(190 85% 30%)'] as [string, string, string, string],
  amber:    ['hsl(40 40% 88%)',  'hsl(40 75% 65%)',  'hsl(35 90% 50%)',  'hsl(30 95% 38%)']  as [string, string, string, string],
  green:    ['hsl(140 25% 85%)', 'hsl(140 45% 60%)', 'hsl(140 60% 42%)', 'hsl(140 75% 28%)'] as [string, string, string, string],
  teal:     ['hsl(170 25% 85%)', 'hsl(170 45% 60%)', 'hsl(170 65% 40%)', 'hsl(170 80% 28%)'] as [string, string, string, string],
  red:      ['hsl(0 30% 88%)',   'hsl(0 60% 65%)',   'hsl(0 75% 48%)',   'hsl(0 85% 35%)']   as [string, string, string, string],
  rose:     ['hsl(340 30% 88%)', 'hsl(340 60% 65%)', 'hsl(340 75% 50%)', 'hsl(340 85% 35%)'] as [string, string, string, string],
  emerald:  ['hsl(155 25% 85%)', 'hsl(155 45% 55%)', 'hsl(155 65% 38%)', 'hsl(155 80% 25%)'] as [string, string, string, string],
  slate:    ['hsl(215 15% 88%)', 'hsl(215 20% 70%)', 'hsl(215 25% 50%)', 'hsl(215 30% 32%)'] as [string, string, string, string],
  orange:   ['hsl(28 40% 88%)',  'hsl(28 75% 65%)',  'hsl(20 85% 52%)',  'hsl(18 90% 40%)']  as [string, string, string, string],
  yellow:   ['hsl(48 60% 88%)',  'hsl(48 80% 65%)',  'hsl(45 90% 52%)',  'hsl(40 95% 40%)']  as [string, string, string, string],
};

// ───────────────────────────────────────────────────────────────────────────
// Profiles
// ───────────────────────────────────────────────────────────────────────────

const titleRequestsProfile: MapTabProfile = {
  tabKey: 'title-requests',
  label: 'Titres fonciers',
  legendTitle: 'Densité de parcelles titrées',
  tiers: makeTiers([20, 80, 300], PALETTES.blue),
  metric: ({ analytics, provinceName }) => {
    const parcels = filterProv(analytics.parcels, provinceName);
    return parcels.filter(p => !!p.property_title_type).length;
  },
  tooltipLines: ({ analytics, provinceName }) => {
    const parcels = filterProv(analytics.parcels, provinceName);
    const cert = parcels.filter(p => normalizeTitleType(p.property_title_type) === "Certificat d'enregistrement").length;
    const loc = parcels.filter(p => normalizeTitleType(p.property_title_type) === "Contrat de location (Contrat d'occupation provisoire)").length;
    const fp = parcels.filter(p => normalizeTitleType(p.property_title_type) === 'Fiche parcellaire').length;
    const titled = parcels.filter(p => !!p.property_title_type).length;
    const pct = parcels.length ? (titled / parcels.length) * 100 : 0;
    return [
      { label: 'Cert. enreg.',    value: fmtN(cert), color: 'text-primary' },
      { label: 'Contrats loc.',   value: fmtN(loc),  color: 'text-blue-600' },
      { label: 'Fiches parc.',    value: fmtN(fp),   color: 'text-emerald-600' },
      { label: '% titrées',       value: fmtPct(pct),color: 'text-violet-600' },
    ];
  },
  legendStats: ({ analytics, provinceName }) => {
    const parcels = filterProv(analytics.parcels, provinceName);
    const titled = parcels.filter(p => !!p.property_title_type).length;
    const pct = parcels.length ? (titled / parcels.length) * 100 : 0;
    return [
      { label: 'Parcelles titrées', value: fmtN(titled) },
      { label: 'Total parcelles',   value: fmtN(parcels.length) },
      { label: 'Taux',              value: fmtPct(pct) },
    ];
  },
};

const parcelsTitledProfile: MapTabProfile = {
  tabKey: 'parcels-titled',
  label: 'Constructions',
  legendTitle: 'Constructions déclarées',
  tiers: makeTiers([10, 50, 200], PALETTES.violet),
  metric: ({ analytics, provinceName }) => {
    const contribs = filterProv(analytics.contributions, provinceName);
    let n = 0;
    contribs.forEach(c => {
      const shapes = Array.isArray(c.building_shapes) ? c.building_shapes : [];
      n += shapes.length;
    });
    return n;
  },
  tooltipLines: ({ analytics, provinceName }) => {
    const contribs = filterProv(analytics.contributions, provinceName);
    let total = 0, totalH = 0, hCount = 0, multi = 0, occupied = 0;
    contribs.forEach(c => {
      const shapes = Array.isArray(c.building_shapes) ? c.building_shapes : [];
      total += shapes.length;
      if (shapes.length > 1) multi++;
      shapes.forEach((s: any) => { if (s.heightM > 0) { totalH += s.heightM; hCount++; } });
      if (c.is_occupied) occupied++;
    });
    const pctOcc = contribs.length ? (occupied / contribs.length) * 100 : 0;
    return [
      { label: 'Constructions',   value: fmtN(total),   color: 'text-violet-600' },
      { label: '% habitées',      value: fmtPct(pctOcc), color: 'text-emerald-600' },
      { label: 'Multi-constr.',   value: fmtN(multi),   color: 'text-blue-600' },
      { label: 'Hauteur moy.',    value: hCount ? `${(totalH / hCount).toFixed(1)} m` : '—', color: 'text-primary' },
    ];
  },
};

const contributionsProfile: MapTabProfile = {
  tabKey: 'contributions',
  label: 'Contributions',
  legendTitle: 'Contributions soumises',
  tiers: makeTiers([10, 50, 200], PALETTES.indigo),
  metric: ({ analytics, provinceName }) => filterProv(analytics.contributions, provinceName).length,
  tooltipLines: ({ analytics, provinceName }) => {
    const c = filterProv(analytics.contributions, provinceName);
    return [
      { label: 'Soumises',   value: fmtN(c.length), color: 'text-primary' },
      { label: 'Approuvées', value: fmtN(c.filter(x => x.status === 'approved').length), color: 'text-emerald-600' },
      { label: 'Suspectes',  value: fmtN(c.filter(x => x.is_suspicious).length), color: 'text-orange-500' },
      { label: 'En appel',   value: fmtN(c.filter(x => x.appeal_submitted).length), color: 'text-blue-600' },
    ];
  },
};

const expertiseProfile: MapTabProfile = {
  tabKey: 'expertise',
  label: 'Expertises',
  legendTitle: 'Demandes d\'expertise',
  tiers: makeTiers([5, 25, 100], PALETTES.cyan),
  metric: ({ analytics, provinceName }) => filterProv(analytics.expertiseRequests, provinceName).length,
  tooltipLines: ({ analytics, provinceName }) => {
    const e = filterProv(analytics.expertiseRequests, provinceName);
    const completed = e.filter(x => x.status === 'completed' || x.status === 'terminé').length;
    const pending = e.filter(x => x.status === 'pending' || x.status === 'en_cours').length;
    const avgVal = e.reduce((s, x) => s + (x.market_value_usd || 0), 0) / Math.max(1, e.filter(x => x.market_value_usd).length);
    return [
      { label: 'Total',     value: fmtN(e.length), color: 'text-primary' },
      { label: 'En cours',  value: fmtN(pending),  color: 'text-amber-600' },
      { label: 'Terminées', value: fmtN(completed),color: 'text-emerald-600' },
      { label: 'Valeur moy.', value: e.length ? fmtUsd(avgVal) : '—', color: 'text-blue-600' },
    ];
  },
};

const mutationsProfile: MapTabProfile = {
  tabKey: 'mutations',
  label: 'Mutations',
  legendTitle: 'Mutations en cours',
  tiers: makeTiers([5, 20, 80], PALETTES.amber),
  metric: ({ analytics, provinceName }) => {
    const m = filterProv(analytics.mutationRequests, provinceName);
    return m.filter(x => x.status === 'pending' || x.status === 'en_cours').length;
  },
  tooltipLines: ({ analytics, provinceName }) => {
    const m = filterProv(analytics.mutationRequests, provinceName);
    const pending = m.filter(x => x.status === 'pending' || x.status === 'en_cours').length;
    const done = m.filter(x => x.status === 'approved' || x.status === 'completed').length;
    const main = topValue(m, x => x.mutation_type);
    return [
      { label: 'Total',       value: fmtN(m.length), color: 'text-primary' },
      { label: 'En cours',    value: fmtN(pending),  color: 'text-amber-600' },
      { label: 'Finalisées',  value: fmtN(done),     color: 'text-emerald-600' },
      { label: 'Type princ.', value: main,           color: 'text-blue-600' },
    ];
  },
};

const mortgagesProfile: MapTabProfile = {
  tabKey: 'mortgages',
  label: 'Hypothèques',
  legendTitle: 'Hypothèques actives',
  tiers: makeTiers([5, 25, 100], PALETTES.green),
  metric: ({ analytics, provinceName }) => {
    const m = filterProv(analytics.mortgages || [], provinceName);
    return m.filter(x => x.mortgage_status === 'active').length;
  },
  tooltipLines: ({ analytics, provinceName }) => {
    const m = filterProv(analytics.mortgages || [], provinceName);
    const active = m.filter(x => x.mortgage_status === 'active').length;
    const closed = m.filter(x => x.mortgage_status === 'paid' || x.mortgage_status === 'closed').length;
    const banks = m.filter(x => norm(x.creditor_type).includes('banque') || norm(x.creditor_type).includes('bank')).length;
    const pctBank = m.length ? (banks / m.length) * 100 : 0;
    return [
      { label: 'Inscriptions', value: fmtN(m.length), color: 'text-primary' },
      { label: 'Actives',      value: fmtN(active),   color: 'text-emerald-600' },
      { label: 'Soldées',      value: fmtN(closed),   color: 'text-blue-600' },
      { label: '% bancaires',  value: fmtPct(pctBank),color: 'text-violet-600' },
    ];
  },
};

const subdivisionProfile: MapTabProfile = {
  tabKey: 'subdivision',
  label: 'Lotissements',
  legendTitle: 'Demandes de lotissement',
  tiers: makeTiers([3, 10, 30], PALETTES.teal),
  metric: ({ analytics, provinceName }) => filterProv(analytics.subdivisionRequests, provinceName).length,
  tooltipLines: ({ analytics, provinceName }) => {
    const s = filterProv(analytics.subdivisionRequests, provinceName);
    const inProgress = s.filter(x => x.status === 'pending' || x.status === 'en_cours').length;
    const approved = s.filter(x => x.status === 'approved').length;
    const lots = s.reduce((acc, x) => acc + (x.number_of_lots || 0), 0);
    return [
      { label: 'Total',     value: fmtN(s.length),   color: 'text-primary' },
      { label: 'En cours',  value: fmtN(inProgress), color: 'text-amber-600' },
      { label: 'Validés',   value: fmtN(approved),   color: 'text-emerald-600' },
      { label: 'Lots créés',value: fmtN(lots),       color: 'text-blue-600' },
    ];
  },
};

const disputesProfile: MapTabProfile = {
  tabKey: 'disputes',
  label: 'Litiges fonciers',
  legendTitle: 'Densité de litiges',
  tiers: makeTiers([3, 15, 50], PALETTES.red),
  metric: ({ analytics, provinceName }) => filterProv(analytics.disputes, provinceName).length,
  tooltipLines: ({ analytics, provinceName }) => {
    const d = filterProv(analytics.disputes, provinceName);
    const open = d.filter(x => x.current_status !== 'resolved' && x.current_status !== 'closed').length;
    const resolved = d.filter(x => x.current_status === 'resolved' || x.current_status === 'closed').length;
    const main = topValue(d, x => x.dispute_nature);
    return [
      { label: 'Total',       value: fmtN(d.length), color: 'text-red-600' },
      { label: 'Ouverts',     value: fmtN(open),     color: 'text-orange-500' },
      { label: 'Résolus',     value: fmtN(resolved), color: 'text-emerald-600' },
      { label: 'Nature dom.', value: main,           color: 'text-primary' },
    ];
  },
};

const ownershipProfile: MapTabProfile = {
  tabKey: 'ownership',
  label: 'Historique propriété',
  legendTitle: 'Transferts de propriété',
  tiers: makeTiers([5, 25, 100], PALETTES.rose),
  metric: ({ analytics, provinceName }) => filterProv(analytics.ownershipHistory, provinceName).length,
  tooltipLines: ({ analytics, provinceName }) => {
    const h = filterProv(analytics.ownershipHistory, provinceName);
    const closed = h.filter(x => x.ownership_end_date).length;
    const parcels = filterProv(analytics.parcels, provinceName);
    const mismatch = parcels.filter(p => p.is_title_in_current_owner_name === false).length;
    const pctMismatch = parcels.length ? (mismatch / parcels.length) * 100 : 0;
    return [
      { label: 'Transferts',   value: fmtN(h.length), color: 'text-primary' },
      { label: 'Anciens prop.',value: fmtN(closed),   color: 'text-blue-600' },
      { label: '% discordants',value: fmtPct(pctMismatch), color: 'text-orange-500' },
    ];
  },
};

const certificatesProfile: MapTabProfile = {
  tabKey: 'certificates',
  label: 'Certificats',
  legendTitle: 'Certificats émis',
  tiers: makeTiers([5, 20, 80], PALETTES.emerald),
  metric: ({ analytics, provinceName }) => filterProv(analytics.certificates, provinceName).length,
  tooltipLines: ({ analytics, provinceName }) => {
    const c = filterProv(analytics.certificates, provinceName);
    const main = topValue(c, x => x.certificate_type);
    return [
      { label: 'Total',         value: fmtN(c.length), color: 'text-primary' },
      { label: 'Type principal',value: main,           color: 'text-emerald-600' },
    ];
  },
};

const invoicesProfile: MapTabProfile = {
  tabKey: 'invoices',
  label: 'Factures',
  legendTitle: 'Factures émises',
  tiers: makeTiers([10, 50, 200], PALETTES.slate),
  metric: ({ analytics, provinceName }) => filterProv(analytics.invoices, provinceName).length,
  tooltipLines: ({ analytics, provinceName }) => {
    const inv = filterProv(analytics.invoices, provinceName);
    const paid = inv.filter(x => x.status === 'paid').length;
    const unpaid = inv.length - paid;
    const avg = inv.length ? inv.reduce((s, x) => s + (x.total_amount_usd || 0), 0) / inv.length : 0;
    return [
      { label: 'Total',      value: fmtN(inv.length), color: 'text-primary' },
      { label: 'Payées',     value: fmtN(paid),       color: 'text-emerald-600' },
      { label: 'Impayées',   value: fmtN(unpaid),     color: 'text-orange-500' },
      { label: 'Montant moy.', value: inv.length ? fmtUsd(avg) : '—', color: 'text-blue-600' },
    ];
  },
};

const buildingPermitsProfile: MapTabProfile = {
  tabKey: 'building-permits',
  label: 'Autorisations',
  legendTitle: 'Autorisations délivrées',
  tiers: makeTiers([5, 25, 100], PALETTES.orange),
  metric: ({ analytics, provinceName }) => filterProv(analytics.buildingPermits, provinceName).length,
  tooltipLines: ({ analytics, provinceName }) => {
    const p = filterProv(analytics.buildingPermits, provinceName);
    const approved = p.filter(x => x.administrative_status === 'approved' || x.administrative_status === 'valid').length;
    const rejected = p.filter(x => x.administrative_status === 'rejected').length;
    const pending = p.filter(x => x.administrative_status === 'pending').length;
    return [
      { label: 'Total',     value: fmtN(p.length),  color: 'text-primary' },
      { label: 'Approuvées',value: fmtN(approved),  color: 'text-emerald-600' },
      { label: 'Rejetées',  value: fmtN(rejected),  color: 'text-red-600' },
      { label: 'En cours',  value: fmtN(pending),   color: 'text-amber-600' },
    ];
  },
};

const taxesProfile: MapTabProfile = {
  tabKey: 'taxes',
  label: 'Taxes foncières',
  legendTitle: 'Taxes déclarées',
  tiers: makeTiers([10, 50, 200], PALETTES.yellow),
  metric: ({ analytics, provinceName }) => filterProv(analytics.taxHistory, provinceName).length,
  tooltipLines: ({ analytics, provinceName }) => {
    const t = filterProv(analytics.taxHistory, provinceName);
    const paid = t.filter(x => x.payment_status === 'paid').length;
    const unpaid = t.length - paid;
    const avg = t.length ? t.reduce((s, x) => s + (x.amount_usd || 0), 0) / t.length : 0;
    return [
      { label: 'Total',     value: fmtN(t.length), color: 'text-primary' },
      { label: 'Payées',    value: fmtN(paid),     color: 'text-emerald-600' },
      { label: 'En retard', value: fmtN(unpaid),   color: 'text-red-600' },
      { label: 'Montant moy.', value: t.length ? fmtUsd(avg) : '—', color: 'text-blue-600' },
    ];
  },
};

/**
 * Public registry: keyed by Analytics tab key.
 * No 'rdc-map' entry → falls back to the existing default map behavior.
 */
export const MAP_TAB_PROFILES: Record<string, MapTabProfile> = {
  'title-requests': titleRequestsProfile,
  'parcels-titled': parcelsTitledProfile,
  'contributions': contributionsProfile,
  'expertise': expertiseProfile,
  'mutations': mutationsProfile,
  'mortgages': mortgagesProfile,
  'subdivision': subdivisionProfile,
  'disputes': disputesProfile,
  'ownership': ownershipProfile,
  'certificates': certificatesProfile,
  'invoices': invoicesProfile,
  'building-permits': buildingPermitsProfile,
  'taxes': taxesProfile,
};

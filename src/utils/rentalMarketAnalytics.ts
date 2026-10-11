/**
 * Calculs purs de l'onglet Analytics « Location et valeur ».
 * Prix de vente = prix de revente déclaré (USD) ; loyer = même règle que le CCC
 * (locaux vacants ou occupés par le propriétaire exclus). Aucune valeur inventée.
 */
import { unitRentUsd } from './analyticsTabRules';

export interface NV { name: string; value: number }

const num = (v: any): number => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };
const arr = (v: any): any[] => (Array.isArray(v) ? v : Array.isArray(v?.units) ? v.units : v && typeof v === 'object' ? [v] : []);
const round = (n: number) => Math.round(n);

export function median(values: number[]): number {
  const s = values.filter(n => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
export function mean(values: number[]): number {
  const s = values.filter(n => Number.isFinite(n) && n > 0);
  return s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0;
}

/** Prix de vente déclaré (USD) ou null. */
export const salePrice = (r: any): number | null => num(r?.resale_price_usd) || null;

/** Loyer mensuel total (USD) d'un bien en location, ou null. */
export function monthlyRent(r: any): number | null {
  if (r?.is_rented !== true) return null;
  const units = arr(r.rental_units);
  const total = units.length ? units.reduce((s: number, u: any) => s + unitRentUsd(u), 0) : num(r.monthly_rent_usd);
  return total > 0 ? total : null;
}

/** Rendement locatif brut annuel (%) — seulement si prix et loyer existent. */
export function rentalYield(r: any): number | null {
  const p = salePrice(r); const m = monthlyRent(r);
  return p && m ? (m * 12 / p) * 100 : null;
}

export const parcelArea = (r: any): number | null => num(r?.area_sqm) || null;

/** Surface bâtie = somme des surfaces des constructions tracées au croquis. */
export function builtArea(r: any): number | null {
  const shapes = Array.isArray(r?.building_shapes) ? r.building_shapes : [];
  const total = shapes.reduce((s: number, x: any) => s + num(x?.areaSqm ?? x?.area_sqm), 0);
  return total > 0 ? total : null;
}

export function hasBuildingPermit(r: any): boolean {
  const permits = Array.isArray(r?.building_permits) ? r.building_permits : [];
  return permits.some((p: any) => (p?.permitType ?? p?.permit_type) === 'construction');
}
export const isBuilt = (r: any) => !!r?.property_category && r.property_category !== 'Terrain nu';

export const locationOf = (r: any): string =>
  (r?.commune || r?.ville || r?.territoire || r?.province || '').toString().trim();


export const AREA_CLASSES = ['< 100 m²', '100-250 m²', '250-500 m²', '500-1 000 m²', '≥ 1 000 m²'];
export function areaClass(r: any): number | null {
  const a = parcelArea(r); if (!a) return null;
  return a < 100 ? 0 : a < 250 ? 1 : a < 500 ? 2 : a < 1000 ? 3 : 4;
}
export const HEIGHT_CLASSES = ['Rez-de-chaussée', 'R+1', 'R+2', 'R+3', 'R+4 et plus'];
export function heightClass(r: any): number | null {
  if (!isBuilt(r)) return null;
  const raw = r?.floor_number;
  if (raw === null || raw === undefined || raw === '') return null;
  const m = String(raw).match(/\d+/);
  const f = m ? parseInt(m[0], 10) : /rdc|rez/i.test(String(raw)) ? 0 : NaN;
  if (!Number.isFinite(f) || f < 0) return null;
  return Math.min(f, 4);
}
export const CAPACITY_CLASSES = ['1-2 personnes', '3-5 personnes', '6-10 personnes', '11 personnes et +'];
export function capacityClass(r: any): number | null {
  const c = num(r?.hosting_capacity); if (!c) return null;
  return c <= 2 ? 0 : c <= 5 ? 1 : c <= 10 ? 2 : 3;
}
export const AGE_CLASSES = ['0-5 ans', '6-10 ans', '11-20 ans', 'Plus de 20 ans'];
export function ageClass(r: any, year = new Date().getFullYear()): number | null {
  const y = num(r?.construction_year); if (!y || y > year) return null;
  const age = year - y;
  return age <= 5 ? 0 : age <= 10 ? 1 : age <= 20 ? 2 : 3;
}

/** Prix de vente et loyer moyens par classe (toutes les classes, dans l'ordre). */
export function saleRentByClass(records: any[], labels: string[], cls: (r: any) => number | null) {
  const sale = labels.map(() => [] as number[]); const rent = labels.map(() => [] as number[]);
  records.forEach(r => {
    const i = cls(r); if (i === null) return;
    const p = salePrice(r); const m = monthlyRent(r);
    if (p) sale[i].push(p); if (m) rent[i].push(m);
  });
  return labels.map((name, i) => ({ name, vente: round(mean(sale[i])), location: round(mean(rent[i])) }))
    .filter(d => d.vente > 0 || d.location > 0);
}

/** Moyenne d'une valeur par groupe, triée décroissante, top N. */
export function avgByGroup(records: any[], key: (r: any) => string, val: (r: any) => number | null, topN = 10): NV[] {
  const m = new Map<string, number[]>();
  records.forEach(r => { const k = key(r); const v = val(r); if (!k || !v) return; (m.get(k) ?? m.set(k, []).get(k)!).push(v); });
  return Array.from(m, ([name, vs]) => ({ name, value: Math.round(mean(vs) * 100) / 100 }))
    .sort((a, b) => b.value - a.value).slice(0, topN);
}

/** Localité : prix moyen + rendement moyen (graphique combiné). */
export function priceAndYieldByLocation(records: any[], topN = 10) {
  const m = new Map<string, { p: number[]; y: number[] }>();
  records.forEach(r => {
    const k = locationOf(r); if (!k) return;
    const e = m.get(k) ?? { p: [], y: [] }; m.set(k, e);
    const p = salePrice(r); const y = rentalYield(r);
    if (p) e.p.push(p); if (y) e.y.push(y);
  });
  return Array.from(m, ([name, e]) => ({ name, prix: round(mean(e.p)), rendement: Math.round(mean(e.y) * 10) / 10 }))
    .filter(d => d.prix > 0).sort((a, b) => b.prix - a.prix).slice(0, topN);
}

/** Valeur totale (somme des prix de vente) et nombre de biens par catégorie. */
export function marketValueByCategory(records: any[]): NV[] {
  const m = new Map<string, number>();
  records.forEach(r => { const p = salePrice(r); if (p && r.property_category) m.set(r.property_category, (m.get(r.property_category) || 0) + p); });
  return Array.from(m, ([name, value]) => ({ name, value: round(value) })).sort((a, b) => b.value - a.value);
}
export function countByCategory(records: any[]): NV[] {
  const m = new Map<string, number>();
  records.forEach(r => { if (isBuilt(r)) m.set(r.property_category, (m.get(r.property_category) || 0) + 1); });
  return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function saleRentByKey(records: any[], key: (r: any) => string | null) {
  const labels: string[] = [];
  records.forEach(r => { const k = key(r); if (k && !labels.includes(k)) labels.push(k); });
  return saleRentByClass(records, labels, r => { const k = key(r); return k ? labels.indexOf(k) : null; });
}

/** Points d'un nuage x/y (z optionnel). */
export function scatterPoints(records: any[], x: (r: any) => number | null, y: (r: any) => number | null, z?: (r: any) => number | null) {
  const out: { x: number; y: number; z?: number; name: string }[] = [];
  records.forEach(r => {
    const xv = x(r); const yv = y(r); if (!xv || !yv) return;
    const zv = z ? z(r) : undefined; if (z && !zv) return;
    out.push({ x: Math.round(xv), y: Math.round(yv), ...(z ? { z: zv! } : {}), name: r.parcel_number || '' });
  });
  return out;
}

/** Prix moyen par année de construction (ordonnée). */
export function avgByYear(records: any[], val: (r: any) => number | null): NV[] {
  const m = new Map<number, number[]>();
  const now = new Date().getFullYear();
  records.forEach(r => { const y = num(r.construction_year); const v = val(r); if (!y || y > now || !v) return; (m.get(y) ?? m.set(y, []).get(y)!).push(v); });
  return Array.from(m).sort((a, b) => a[0] - b[0]).map(([y, vs]) => ({ name: String(y), value: round(mean(vs)) }));
}

export function countByClass(records: any[], labels: string[], cls: (r: any) => number | null): NV[] {
  const c = labels.map(() => 0);
  records.forEach(r => { const i = cls(r); if (i !== null) c[i]++; });
  return labels.map((name, i) => ({ name, value: c[i] })).filter(d => d.value > 0);
}

/** Top 10 investissements par localité + catégorie (rendement décroissant). */
export function topInvestments(records: any[], topN = 10) {
  const m = new Map<string, { loc: string; cat: string; p: number[]; m: number[]; y: number[] }>();
  records.forEach(r => {
    const y = rentalYield(r); const loc = locationOf(r); const cat = r.property_category;
    if (!y || !loc || !cat) return;
    const k = `${loc}::${cat}`;
    const e = m.get(k) ?? { loc, cat, p: [], m: [], y: [] }; m.set(k, e);
    e.p.push(salePrice(r)!); e.m.push(monthlyRent(r)!); e.y.push(y);
  });
  return Array.from(m.values()).map(e => ({
    localisation: e.loc, categorie: e.cat, prix: round(mean(e.p)), loyer: round(mean(e.m)), rendement: Math.round(mean(e.y) * 10) / 10,
  })).sort((a, b) => b.rendement - a.rendement).slice(0, topN);
}

/** Top N biens par une valeur (parcelle + localité, aucun nom). */
export function topProperties(records: any[], val: (r: any) => number | null, topN = 10): NV[] {
  return records.map(r => ({ r, v: val(r) })).filter(x => x.v)
    .sort((a, b) => b.v! - a.v!).slice(0, topN)
    .map(({ r, v }) => ({ name: [r.parcel_number, locationOf(r)].filter(Boolean).join(' · ') || '—', value: round(v!) }));
}

/** Biens sur/sous-évalués : prix au m² vs médiane de la même catégorie et localité (≥ 3 comparables, ±30 %). */
export function valuationStatus(records: any[], threshold = 0.3, minPeers = 3): NV[] {
  const groups = new Map<string, { r: any; ppm: number }[]>();
  records.forEach(r => {
    const p = salePrice(r); const a = parcelArea(r); const loc = locationOf(r);
    if (!p || !a || !loc || !r.property_category) return;
    const k = `${loc}::${r.property_category}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push({ r, ppm: p / a });
  });
  let over = 0, under = 0, fair = 0;
  groups.forEach(list => {
    if (list.length < minPeers) return;
    const med = median(list.map(x => x.ppm));
    list.forEach(({ ppm }) => { if (ppm > med * (1 + threshold)) over++; else if (ppm < med * (1 - threshold)) under++; else fair++; });
  });
  return [{ name: 'Surévalués', value: over }, { name: 'Prix cohérent', value: fair }, { name: 'Sous-évalués', value: under }].filter(d => d.value > 0);
}

export function permitSplit(records: any[]): NV[] {
  const built = records.filter(isBuilt);
  const w = built.filter(hasBuildingPermit).length;
  return [{ name: 'Avec autorisation de bâtir', value: w }, { name: 'Sans autorisation de bâtir', value: built.length - w }].filter(d => d.value > 0);
}

export const CONSTRUCTION_STATUS_LABEL: Record<string, string> = { completed: 'Construction achevée', in_progress: 'Construction en cours' };
export const RES_COM_LABEL: Record<string, string> = { 'Résidentielle': 'Résidentiel', 'Commerciale': 'Commercial' };

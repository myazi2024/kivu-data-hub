/**
 * Agrégations Analytics pour l'onglet Construction : aplatit la construction
 * principale et les constructions supplémentaires déclarées dans le CCC, et
 * agrège les limites et entrées (parcel_sides / road_sides).
 */
import { normalizeDeclaredUsage } from '@/utils/declaredUsageNormalizer';
import { isOwnerOccupiedUnit, isVacantUnit } from '@/utils/rentalStatus';
import { sideBoundaryKind, sideHasRoad, boundaryKindLabel } from '@/components/cadastral/ParcelSidesDimensionsPanel';
import { PROPERTY_CATEGORY_OPTIONS } from '@/lib/ccc/propertyCategories';

export interface FlatConstruction {
  category: string | null;
  declaredUsage: string | null;
  status: 'completed' | 'in_progress' | null;
  isRented: boolean | null;
  rentalConfiguration: 'single' | 'multi' | null;
  rentalUnitsCount: number | null;
  rentalUnits: any[];
  actualUsage: string | null;
  operationalCapacity: number | null;
  operationalCapacityUnit: string | null;
}

export interface NamedValue { name: string; value: number }

/**
 * Une ligne par catégorie déclarée, en conservant les champs de la parcelle
 * parente pour les filtres et variables croisées Analytics.
 */
export function flattenPropertyCategoryRecords(records: any[]): any[] {
  const allowed = new Set<string>(PROPERTY_CATEGORY_OPTIONS);
  const out: any[] = [];
  for (const record of records || []) {
    const mainCategory = record?.property_category;
    if (allowed.has(mainCategory)) out.push(record);

    const extra = Array.isArray(record?.additional_constructions) ? record.additional_constructions : [];
    for (const construction of extra) {
      const category = pick(construction, 'propertyCategory', 'property_category');
      if (allowed.has(category) && category !== 'Terrain nu') {
        out.push({ ...record, ...construction, property_category: category });
      }
    }
  }
  return out;
}

/** Toutes les catégories du CCC, dans l'ordre du formulaire, y compris les valeurs à zéro. */
export function propertyCategoryData(records: any[]): NamedValue[] {
  const counts = new Map<string, number>(PROPERTY_CATEGORY_OPTIONS.map(category => [category, 0]));
  flattenPropertyCategoryRecords(records).forEach(record => {
    const category = String(record.property_category);
    counts.set(category, (counts.get(category) || 0) + 1);
  });
  return PROPERTY_CATEGORY_OPTIONS.map(name => ({ name, value: counts.get(name) || 0 }));
}

const pick = (o: any, camel: string, snake: string) => (o?.[camel] ?? o?.[snake] ?? null);
const toNum = (x: any): number | null => { const n = Number(x); return Number.isFinite(n) && n > 0 ? n : null; };
const toStatus = (s: any): FlatConstruction['status'] => (s === 'in_progress' ? 'in_progress' : s === 'completed' ? 'completed' : null);
const toConfig = (s: any): FlatConstruction['rentalConfiguration'] => (s === 'multi' ? 'multi' : s === 'single' ? 'single' : null);

function fromObject(o: any): FlatConstruction {
  const actual = pick(o, 'actualUsage', 'actual_usage');
  const other = pick(o, 'actualUsageOther', 'actual_usage_other');
  const units = pick(o, 'rentalUnits', 'rental_units');
  const rented = pick(o, 'isRented', 'is_rented');
  return {
    category: pick(o, 'propertyCategory', 'property_category'),
    declaredUsage: pick(o, 'declaredUsage', 'declared_usage') ? normalizeDeclaredUsage(pick(o, 'declaredUsage', 'declared_usage')) : null,
    status: toStatus(pick(o, 'constructionStatus', 'construction_status')),
    isRented: typeof rented === 'boolean' ? rented : null,
    rentalConfiguration: toConfig(pick(o, 'rentalConfiguration', 'rental_configuration')),
    rentalUnitsCount: toNum(pick(o, 'rentalUnitsCount', 'rental_units_count')),
    rentalUnits: Array.isArray(units) ? units : [],
    actualUsage: actual === 'Autre' && other ? String(other) : actual ? String(actual) : null,
    operationalCapacity: toNum(pick(o, 'operationalCapacity', 'operational_capacity')),
    operationalCapacityUnit: pick(o, 'operationalCapacityUnit', 'operational_capacity_unit'),
  };
}

/** Construction principale + constructions supplémentaires (hors terrain nu). */
export function flattenConstructions(records: any[]): FlatConstruction[] {
  const out: FlatConstruction[] = [];
  for (const r of records || []) {
    if (r?.property_category && r.property_category !== 'Terrain nu') out.push(fromObject(r));
    const extra = Array.isArray(r?.additional_constructions) ? r.additional_constructions : [];
    for (const c of extra) if (c && typeof c === 'object') out.push(fromObject(c));
  }
  return out;
}

const toList = (m: Map<string, number>): NamedValue[] =>
  Array.from(m.entries()).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
const inc = (m: Map<string, number>, k: string, n = 1) => m.set(k, (m.get(k) || 0) + n);

export function constructionStatusData(list: FlatConstruction[]): NamedValue[] {
  const m = new Map<string, number>();
  list.forEach(c => { if (c.status) inc(m, c.status === 'in_progress' ? 'En cours' : 'Achevée'); });
  return toList(m);
}

export function rentedData(list: FlatConstruction[]): NamedValue[] {
  const m = new Map<string, number>();
  list.forEach(c => { if (c.isRented !== null) inc(m, c.isRented ? 'Mise en location' : 'Non louée'); });
  return toList(m);
}

export function rentalConfigurationData(list: FlatConstruction[]): NamedValue[] {
  const m = new Map<string, number>();
  list.forEach(c => { if (c.isRented && c.rentalConfiguration) inc(m, c.rentalConfiguration === 'multi' ? 'Plusieurs locaux' : 'Un seul local'); });
  return toList(m);
}

export function rentalUnitsCountData(list: FlatConstruction[]): NamedValue[] {
  const order = ['1 local', '2–3 locaux', '4–6 locaux', '7+ locaux'];
  const m = new Map<string, number>();
  list.forEach(c => {
    if (!c.isRented) return;
    const n = c.rentalConfiguration === 'single' ? 1 : (c.rentalUnitsCount ?? (c.rentalUnits.length || null));
    if (!n) return;
    inc(m, n <= 1 ? order[0] : n <= 3 ? order[1] : n <= 6 ? order[2] : order[3]);
  });
  return order.filter(k => m.get(k)).map(k => ({ name: k, value: m.get(k)! }));
}

/** Locaux des biens loués en plusieurs locaux : locataire / propriétaire / vacant. */
export function rentalUnitsOccupancyData(list: FlatConstruction[]): NamedValue[] {
  const m = new Map<string, number>();
  list.forEach(c => {
    if (!c.isRented || c.rentalConfiguration !== 'multi') return;
    c.rentalUnits.forEach(u => {
      if (isVacantUnit(u)) inc(m, 'Vacant');
      else if (isOwnerOccupiedUnit(u)) inc(m, 'Occupé par le propriétaire');
      else if ((u?.isOccupied ?? u?.is_occupied) === true) inc(m, 'Occupé par un locataire');
    });
  });
  return toList(m);
}

export function vacantUnitsCount(list: FlatConstruction[]): number {
  return rentalUnitsOccupancyData(list).find(d => d.name === 'Vacant')?.value || 0;
}

/** Usage réel vs usage déclaré : nombre de constructions par usage réel, conforme ou différent. */
export function actualVsDeclaredData(list: FlatConstruction[]): NamedValue[] {
  const m = new Map<string, number>();
  list.forEach(c => {
    if (!c.actualUsage) return;
    const same = c.declaredUsage && normalizeDeclaredUsage(c.actualUsage) === c.declaredUsage;
    inc(m, `${c.actualUsage}${same ? '' : ' (≠ déclaré)'}`);
  });
  return toList(m);
}

/** Capacité d'exploitation totale par unité (jamais d'addition d'unités différentes). */
export function operationalCapacityData(list: FlatConstruction[]): NamedValue[] {
  const m = new Map<string, number>();
  list.forEach(c => { if (c.operationalCapacity) inc(m, c.operationalCapacityUnit || 'Sans unité', c.operationalCapacity); });
  return toList(m);
}

const sidesOf = (r: any): any[] => (Array.isArray(r?.road_sides) ? r.road_sides : []);

export function boundaryKindData(records: any[]): NamedValue[] {
  const m = new Map<string, number>();
  records.forEach(r => sidesOf(r).forEach(s => { const k = sideBoundaryKind(s); if (k) inc(m, boundaryKindLabel(k)); }));
  return toList(m);
}

export function roadAccessData(records: any[]): NamedValue[] {
  const order = ['Aucune route', '1 côté sur route', '2 côtés sur route', '3+ côtés sur route'];
  const m = new Map<string, number>();
  records.forEach(r => {
    const sides = sidesOf(r);
    if (sides.length === 0) return;
    const n = sides.filter(s => sideHasRoad(s)).length;
    inc(m, order[Math.min(n, 3)]);
  });
  return order.filter(k => m.get(k)).map(k => ({ name: k, value: m.get(k)! }));
}

export function roadSurfaceData(records: any[]): NamedValue[] {
  const m = new Map<string, number>();
  records.forEach(r => sidesOf(r).forEach(s => { if (sideHasRoad(s) && s.roadSurface) inc(m, String(s.roadSurface)); }));
  return toList(m);
}

export function entrancesData(records: any[]): NamedValue[] {
  const order = ['Aucune entrée', '1 entrée', '2 entrées', '3+ entrées'];
  const m = new Map<string, number>();
  records.forEach(r => {
    const sides = sidesOf(r);
    if (sides.length === 0) return;
    inc(m, order[Math.min(sides.filter(s => s?.hasEntrance).length, 3)]);
  });
  return order.filter(k => m.get(k)).map(k => ({ name: k, value: m.get(k)! }));
}

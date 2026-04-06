export const CHART_COLORS = [
  '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#3b82f6',
  '#84cc16', '#e879f9',
];

export interface AnalyticsFilter {
  sectionType: 'all' | 'urbaine' | 'rurale';
  year: number | null; // null = all years
  semester?: number;   // 1 | 2
  quarter?: number;    // 1..4
  month?: number;      // 1..12
  week?: number;       // 1..5 (week within month)
  province?: string;
  ville?: string;
  commune?: string;
  quartier?: string;
  avenue?: string;
  territoire?: string;
  collectivite?: string;
  groupement?: string;
  villageFilter?: string;
  status?: string;
}

export const defaultFilter: AnalyticsFilter = { sectionType: 'all', year: null };

export function getSectionType(record: any): 'urbaine' | 'rurale' | null {
  if (record.section_type === 'urbaine' || record.parcel_type === 'SU') return 'urbaine';
  if (record.section_type === 'rurale' || record.parcel_type === 'SR') return 'rurale';
  return null;
}

export function matchesPeriod(dateStr: string | null | undefined, filter: AnalyticsFilter): boolean {
  if (!dateStr) return true;
  if (filter.year === null) return true; // all years
  const d = new Date(dateStr);
  if (d.getFullYear() !== filter.year) return false;
  if (filter.semester) {
    const sem = d.getMonth() < 6 ? 1 : 2;
    if (sem !== filter.semester) return false;
  }
  if (filter.quarter) {
    const q = Math.ceil((d.getMonth() + 1) / 3);
    if (q !== filter.quarter) return false;
  }
  if (filter.month) {
    if (d.getMonth() + 1 !== filter.month) return false;
  }
  if (filter.week) {
    const weekOfMonth = Math.ceil(d.getDate() / 7);
    if (weekOfMonth !== filter.week) return false;
  }
  return true;
}

const _norm = (s?: string | null) => (s || '').trim().toLowerCase();

export function matchesLocation(r: any, f: AnalyticsFilter): boolean {
  if (f.sectionType !== 'all') {
    const st = getSectionType(r);
    if (st && st !== f.sectionType) return false;
  }
  if (f.province && _norm(r.province) !== _norm(f.province)) return false;
  if (f.ville && _norm(r.ville) !== _norm(f.ville)) return false;
  if (f.commune && _norm(r.commune) !== _norm(f.commune)) return false;
  if (f.quartier && _norm(r.quartier) !== _norm(f.quartier)) return false;
  if (f.avenue && _norm(r.avenue) !== _norm(f.avenue)) return false;
  if (f.territoire && _norm(r.territoire) !== _norm(f.territoire)) return false;
  if (f.collectivite && _norm(r.collectivite) !== _norm(f.collectivite)) return false;
  if (f.groupement && _norm(r.groupement) !== _norm(f.groupement)) return false;
  if (f.villageFilter && _norm(r.village) !== _norm(f.villageFilter)) return false;
  return true;
}

function matchesStatus(r: any, f: AnalyticsFilter): boolean {
  if (!f.status) return true;
  const recordStatus = r.status || r.current_status;
  return recordStatus === f.status;
}


export function applyFilters(records: any[], filter: AnalyticsFilter, dateField = 'created_at'): any[] {
  return records.filter(r =>
    matchesPeriod(r[dateField], filter) &&
    matchesLocation(r, filter) &&
    matchesStatus(r, filter)
  );
}

export function countBy(records: any[], field: string): { name: string; value: number }[] {
  const map = new Map<string, number>();
  records.forEach(r => {
    const raw = r[field];
    const val = (raw === null || raw === undefined || raw === '') ? '(Non renseigné)' : String(raw);
    map.set(val, (map.get(val) || 0) + 1);
  });
  return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function countBoolean(records: any[], field: string, trueLabel = 'Oui', falseLabel = 'Non'): { name: string; value: number }[] {
  let t = 0, f = 0, na = 0;
  records.forEach(r => {
    if (r[field] === true) t++;
    else if (r[field] === false) f++;
    else na++;
  });
  const result: { name: string; value: number }[] = [];
  if (t > 0) result.push({ name: trueLabel, value: t });
  if (f > 0) result.push({ name: falseLabel, value: f });
  if (na > 0) result.push({ name: '(Non renseigné)', value: na });
  return result;
}

export function crossCount(records: any[], field1: string, field2: string): { name: string; [key: string]: string | number }[] {
  const outer = new Map<string, Map<string, number>>();
  const allInner = new Set<string>();
  records.forEach(r => {
    const k1 = r[field1] || '(Non renseigné)';
    const k2 = r[field2] || '(Non renseigné)';
    allInner.add(k2);
    if (!outer.has(k1)) outer.set(k1, new Map());
    const inner = outer.get(k1)!;
    inner.set(k2, (inner.get(k2) || 0) + 1);
  });
  return Array.from(outer.entries()).map(([name, inner]) => {
    const row: any = { name };
    allInner.forEach(k => { row[k] = inner.get(k) || 0; });
    return row;
  });
}

export function extractUnique(records: any[], field: string): string[] {
  const set = new Set<string>();
  records.forEach(r => { if (r[field]) set.add(r[field]); });
  return Array.from(set).sort();
}

export function getAvailableYears(records: any[], dateField = 'created_at'): number[] {
  const set = new Set<number>();
  records.forEach(r => { if (r[dateField]) set.add(new Date(r[dateField]).getFullYear()); });
  return Array.from(set).sort((a, b) => b - a);
}

export function trendByMonth(records: any[], dateField = 'created_at'): { name: string; value: number; sortKey: string }[] {
  const map = new Map<string, number>();
  records.forEach(r => {
    if (r[dateField]) {
      const d = new Date(r[dateField]);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sortKey, value]) => {
      const [y, m] = sortKey.split('-');
      const name = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('fr-FR', { year: '2-digit', month: 'short' });
      return { name, value, sortKey };
    });
}

export function surfaceDistribution(records: any[]): { name: string; value: number }[] {
  const buckets = [
    { name: '< 100 m²', max: 100 },
    { name: '100-500 m²', max: 500 },
    { name: '500-1000 m²', max: 1000 },
    { name: '1000-5000 m²', max: 5000 },
    { name: '> 5000 m²', max: Infinity },
  ];
  const counts = new Array(buckets.length).fill(0);
  records.forEach(r => {
    const area = r.area_sqm;
    if (area == null || area <= 0) return;
    for (let i = 0; i < buckets.length; i++) {
      if (area <= buckets[i].max) { counts[i]++; break; }
    }
  });
  return buckets.map((b, i) => ({ name: b.name, value: counts[i] })).filter(b => b.value > 0);
}

export function avgProcessingDays(records: any[], startField = 'created_at', endField = 'reviewed_at'): number {
  const valid = records.filter(r => r[startField] && r[endField]);
  if (valid.length === 0) return 0;
  const total = valid.reduce((s, r) => {
    const diff = new Date(r[endField]).getTime() - new Date(r[startField]).getTime();
    return s + diff / (1000 * 60 * 60 * 24);
  }, 0);
  return Math.round(total / valid.length);
}

export function numericDistribution(records: any[], field: string, buckets: { name: string; min: number; max: number }[]): { name: string; value: number }[] {
  const counts = new Array(buckets.length).fill(0);
  records.forEach(r => {
    const v = r[field];
    if (v == null || v <= 0) return;
    for (let i = 0; i < buckets.length; i++) {
      if (v >= buckets[i].min && v <= buckets[i].max) { counts[i]++; break; }
    }
  });
  return buckets.map((b, i) => ({ name: b.name, value: counts[i] })).filter(b => b.value > 0);
}

/** Distribution by decade for construction_year */
export function yearDecadeDistribution(records: any[], field = 'construction_year'): { name: string; value: number }[] {
  const map = new Map<string, number>();
  records.forEach(r => {
    const y = r[field];
    if (!y || y <= 0) return;
    const decade = `${Math.floor(y / 10) * 10}s`;
    map.set(decade, (map.get(decade) || 0) + 1);
  });
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name, value }));
}

/** Compute average of a numeric field */
export function avgField(records: any[], field: string): number {
  const valid = records.filter(r => r[field] != null && r[field] > 0);
  if (valid.length === 0) return 0;
  return Math.round(valid.reduce((s, r) => s + r[field], 0) / valid.length);
}

export const VALID_LIFTING_STATUSES = ['pending', 'demande_levee', 'approved', 'rejected', 'in_review'];

const MONTH_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

/** Aggregate a numeric field by month — reusable for revenue trends */
export function sumByMonth(records: any[], amountField = 'total_amount_usd', dateField = 'created_at'): { name: string; value: number }[] {
  const map = new Map<string, number>();
  records.forEach(r => {
    if (r[dateField] && r[amountField] > 0) {
      const d = new Date(r[dateField]);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + r[amountField]);
    }
  });
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([k, value]) => {
    const [y, m] = k.split('-');
    const name = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('fr-FR', { year: '2-digit', month: 'short' });
    return { name, value: Math.round(value) };
  });
}

/** Build a human-readable label from active filters (time + location) */
export function buildFilterLabel(filter: AnalyticsFilter): string {
  const parts: string[] = [];
  // Time — cascading
  let t = filter.year === null ? 'Toutes les années' : String(filter.year);
  if (filter.semester) t += ` S${filter.semester}`;
  if (filter.quarter) t += ` T${filter.quarter}`;
  if (filter.month) t += ` ${MONTH_LABELS[filter.month - 1]}`;
  if (filter.week) t += ` Sem.${filter.week}`;
  parts.push(t);
  // Location — always show at least the country
  const loc: string[] = ['Rép. Dém. du Congo'];
  if (filter.province) loc.push(filter.province);
  if (filter.sectionType !== 'all') loc.push(filter.sectionType === 'urbaine' ? 'Urbaine' : 'Rurale');
  if (filter.ville) loc.push(filter.ville);
  if (filter.commune) loc.push(filter.commune);
  if (filter.quartier) loc.push(filter.quartier);
  if (filter.avenue) loc.push(filter.avenue);
  if (filter.territoire) loc.push(filter.territoire);
  if (filter.collectivite) loc.push(filter.collectivite);
  if (filter.groupement) loc.push(filter.groupement);
  if (filter.villageFilter) loc.push(filter.villageFilter);
  parts.push(loc.join(' › '));
  return parts.join(' · ');
}

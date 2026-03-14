export const CHART_COLORS = [
  '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#3b82f6',
  '#84cc16', '#e879f9',
];

export interface AnalyticsFilter {
  sectionType: 'all' | 'urbaine' | 'rurale';
  periodType: 'all' | 'year' | 'semester' | 'quarter' | 'month';
  year?: number;
  subPeriod?: number;
  province?: string;
  ville?: string;
  commune?: string;
  quartier?: string;
  avenue?: string;
  territoire?: string;
  collectivite?: string;
  groupement?: string;
  villageFilter?: string;
}

export const defaultFilter: AnalyticsFilter = { sectionType: 'all', periodType: 'all' };

export function getSectionType(record: any): 'urbaine' | 'rurale' | null {
  if (record.section_type === 'urbaine' || record.parcel_type === 'SU') return 'urbaine';
  if (record.section_type === 'rurale' || record.parcel_type === 'SR') return 'rurale';
  return null;
}

export function matchesPeriod(dateStr: string | null | undefined, filter: AnalyticsFilter): boolean {
  if (!dateStr || filter.periodType === 'all') return true;
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  if (filter.year && year !== filter.year) return false;
  if (filter.periodType === 'year') return true;
  if (filter.periodType === 'semester' && filter.subPeriod) return (month <= 6 ? 1 : 2) === filter.subPeriod;
  if (filter.periodType === 'quarter' && filter.subPeriod) return Math.ceil(month / 3) === filter.subPeriod;
  if (filter.periodType === 'month' && filter.subPeriod) return month === filter.subPeriod;
  return true;
}

export function matchesLocation(r: any, f: AnalyticsFilter): boolean {
  if (f.sectionType !== 'all') {
    const st = getSectionType(r);
    if (st && st !== f.sectionType) return false;
  }
  if (f.province && r.province !== f.province) return false;
  if (f.ville && r.ville !== f.ville) return false;
  if (f.commune && r.commune !== f.commune) return false;
  if (f.quartier && r.quartier !== f.quartier) return false;
  if (f.avenue && r.avenue !== f.avenue) return false;
  if (f.territoire && r.territoire !== f.territoire) return false;
  if (f.collectivite && r.collectivite !== f.collectivite) return false;
  if (f.groupement && r.groupement !== f.groupement) return false;
  if (f.villageFilter && r.village !== f.villageFilter) return false;
  return true;
}

export function applyFilters(records: any[], filter: AnalyticsFilter, dateField = 'created_at'): any[] {
  return records.filter(r => matchesPeriod(r[dateField], filter) && matchesLocation(r, filter));
}

/** #10 fix: Distinguish null/undefined from actual 'Non spécifié' values */
export function countBy(records: any[], field: string): { name: string; value: number }[] {
  const map = new Map<string, number>();
  records.forEach(r => {
    const raw = r[field];
    const val = (raw === null || raw === undefined || raw === '') ? '(Non renseigné)' : String(raw);
    map.set(val, (map.get(val) || 0) + 1);
  });
  return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
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

/** Distribution of area_sqm into buckets */
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

/** #19: Compute average processing days between two date fields */
export function avgProcessingDays(records: any[], startField = 'created_at', endField = 'reviewed_at'): number {
  const valid = records.filter(r => r[startField] && r[endField]);
  if (valid.length === 0) return 0;
  const total = valid.reduce((s, r) => {
    const diff = new Date(r[endField]).getTime() - new Date(r[startField]).getTime();
    return s + diff / (1000 * 60 * 60 * 24);
  }, 0);
  return Math.round(total / valid.length);
}

/** Valid lifting statuses for explicit filtering (#7) */
export const VALID_LIFTING_STATUSES = ['pending', 'demande_levee', 'approved', 'rejected', 'in_review'];

import React, { useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { countBy, getSectionType } from '@/utils/analyticsHelpers';
import { normalizeTitleType } from '@/utils/titleTypeNormalizer';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { FileText, Users, Globe, Clock, KeyRound, UserCheck, Scale, ArrowRightLeft } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, ColorMappedPieCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { generateInsight } from '@/utils/chartInsights';
import { useBlockFilter } from '@/hooks/useBlockFilter';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'title-requests';

const GENDER_COLORS: Record<string, string> = {
  'Masculin': '#3b82f6', 'Féminin': '#ec4899', 'M': '#3b82f6', 'F': '#ec4899',
  'Autre': '#8b5cf6', '(Non renseigné)': '#9ca3af',
};

/** Extract flattened owner records from contributions' current_owners_details JSONB */
function extractOwners(contributions: any[]): any[] {
  const owners: any[] = [];
  contributions.forEach(c => {
    const details = c.current_owners_details;
    if (!details) return;
    const list = Array.isArray(details) ? details : [details];
    list.forEach((o: any) => {
      owners.push({
        ...o,
        // carry geo from contribution
        province: c.province,
        ville: c.ville,
        commune: c.commune,
        quartier: c.quartier,
        parcel_type: c.parcel_type,
        section_type: c.section_type,
      });
    });
  });
  return owners;
}

function durationBucket(years: number): string {
  if (years < 1) return '< 1 an';
  if (years < 3) return '1-2 ans';
  if (years < 6) return '3-5 ans';
  if (years < 11) return '6-10 ans';
  if (years < 21) return '11-20 ans';
  return '20+ ans';
}

function leaseBucket(years: number | null | undefined): string {
  if (!years) return '(Non renseigné)';
  if (years <= 5) return '1-5 ans';
  if (years <= 10) return '6-10 ans';
  if (years <= 25) return '11-25 ans';
  return '25+ ans';
}

export const TitleRequestsBlock: React.FC<Props> = memo(({ data }) => {
  // Primary filter on parcels
  const { filter, setFilter, filterLabel, filtered, filterConfig, v, ct, cx, ty, ord } = useBlockFilter(TAB_KEY, data.parcels);

  // Extract parcel IDs from filtered set for joining
  const filteredParcelIds = useMemo(() => new Set(filtered.map(p => p.id)), [filtered]);
  const filteredParcelNums = useMemo(() => new Set(filtered.map(p => p.parcel_number)), [filtered]);

  // Filtered contributions linked to filtered parcels
  const linkedContribs = useMemo(() =>
    data.contributions.filter(c =>
      (c.parcel_number && filteredParcelNums.has(c.parcel_number)) ||
      (c.original_parcel_id && filteredParcelIds.has(c.original_parcel_id))
    ), [data.contributions, filteredParcelNums, filteredParcelIds]);

  // Filtered ownership history
  const linkedOwnership = useMemo(() =>
    data.ownershipHistory.filter(o => filteredParcelIds.has(o.parcel_id)),
    [data.ownershipHistory, filteredParcelIds]);

  // Denormalized owners from contributions
  const owners = useMemo(() => extractOwners(linkedContribs), [linkedContribs]);

  // ── Title type charts ──
  const byTitleType = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(p => {
      const n = normalizeTitleType(p.property_title_type);
      map.set(n, (map.get(n) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const byLeaseType = useMemo(() => countBy(filtered, 'lease_type'), [filtered]);

  const byLeaseDuration = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(p => {
      const bucket = leaseBucket(p.lease_years);
      map.set(bucket, (map.get(bucket) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const byIssueYear = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(p => {
      const d = p.title_issue_date || p.created_at;
      if (!d) return;
      const y = new Date(d).getFullYear().toString();
      map.set(y, (map.get(y) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  const issueTrend = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(p => {
      const d = p.title_issue_date || p.created_at;
      if (!d) return;
      const dt = new Date(d);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  // ── Owner charts (from contributions JSONB) ──
  const byLegalStatus = useMemo(() => countBy(owners, 'legalStatus'), [owners]);

  const genderData = useMemo(() => {
    const physique = owners.filter(o => o.legalStatus === 'Personne physique');
    const map = new Map<string, number>();
    physique.forEach(o => {
      const g = o.gender || '(Non renseigné)';
      map.set(g, (map.get(g) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [owners]);

  const byNationality = useMemo(() => countBy(owners, 'nationality'), [owners]);

  const byEntityType = useMemo(() => {
    const morale = owners.filter(o => o.legalStatus === 'Personne morale');
    return countBy(morale, 'entityType');
  }, [owners]);

  const byRightType = useMemo(() => {
    const etat = owners.filter(o => o.legalStatus === 'État');
    return countBy(etat, 'rightType');
  }, [owners]);

  const ownerDuration = useMemo(() => {
    const now = Date.now();
    const map = new Map<string, number>();
    owners.forEach(o => {
      if (!o.since) return;
      const years = (now - new Date(o.since).getTime()) / (365.25 * 24 * 3600 * 1000);
      const bucket = durationBucket(years);
      map.set(bucket, (map.get(bucket) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [owners]);

  // ── Ownership history charts ──
  const byMutationType = useMemo(() => countBy(linkedOwnership, 'mutation_type'), [linkedOwnership]);
  const byHistLegalStatus = useMemo(() => countBy(linkedOwnership, 'legal_status'), [linkedOwnership]);

  const histDuration = useMemo(() => {
    const map = new Map<string, number>();
    linkedOwnership.forEach(o => {
      if (!o.ownership_start_date || !o.ownership_end_date) return;
      const years = (new Date(o.ownership_end_date).getTime() - new Date(o.ownership_start_date).getTime()) / (365.25 * 24 * 3600 * 1000);
      const bucket = durationBucket(Math.max(0, years));
      map.set(bucket, (map.get(bucket) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [linkedOwnership]);

  const transfersPerParcel = useMemo(() => {
    const countMap = new Map<string, number>();
    linkedOwnership.forEach(o => {
      countMap.set(o.parcel_id, (countMap.get(o.parcel_id) || 0) + 1);
    });
    const dist = new Map<string, number>();
    countMap.forEach(count => {
      const label = count >= 5 ? '5+' : `${count}`;
      dist.set(label, (dist.get(label) || 0) + 1);
    });
    return Array.from(dist.entries()).map(([name, value]) => ({ name: `${name} transfert${name === '1' ? '' : 's'}`, value })).sort((a, b) => a.name.localeCompare(b.name));
  }, [linkedOwnership]);

  // ── KPIs ──
  const stats = useMemo(() => {
    const urbanCount = filtered.filter(r => getSectionType(r) === 'urbaine').length;
    const ruralCount = filtered.filter(r => getSectionType(r) === 'rurale').length;
    const congolais = owners.filter(o => o.nationality === 'Congolais (RD)').length;
    const pctCongolais = owners.length > 0 ? Math.round((congolais / owners.length) * 100) : 0;
    const now = Date.now();
    const durations = owners.filter(o => o.since).map(o => (now - new Date(o.since).getTime()) / (365.25 * 24 * 3600 * 1000));
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    return { urbanCount, ruralCount, pctCongolais, avgDuration };
  }, [filtered, owners]);

  const kpiItems = useMemo(() => {
    const all = [
      { key: 'kpi-total', label: ct('kpi-total', 'Parcelles titrées'), value: filtered.length, cls: 'text-primary' },
      { key: 'kpi-urbaine', label: ct('kpi-urbaine', 'Urbaine'), value: stats.urbanCount, cls: 'text-emerald-600', tooltip: pct(stats.urbanCount, filtered.length) },
      { key: 'kpi-rurale', label: ct('kpi-rurale', 'Rurale'), value: stats.ruralCount, cls: 'text-amber-600', tooltip: pct(stats.ruralCount, filtered.length) },
      { key: 'kpi-congolais', label: ct('kpi-congolais', '% Congolais'), value: `${stats.pctCongolais}%`, cls: 'text-blue-600', tooltip: `${owners.filter(o => o.nationality === 'Congolais (RD)').length} sur ${owners.length}` },
      { key: 'kpi-anciennete', label: ct('kpi-anciennete', 'Ancienneté moy.'), value: stats.avgDuration > 0 ? `${stats.avgDuration} ans` : 'N/A', cls: 'text-violet-600' },
      { key: 'kpi-mutations', label: ct('kpi-mutations', 'Mutations'), value: linkedOwnership.length, cls: 'text-rose-600' },
    ];
    return all.filter(k => v(k.key));
  }, [filtered, stats, owners, linkedOwnership, v, ct]);

  // ── Chart definitions ──
  const chartDefs = useMemo(() => [
    // Title type block
    { key: 'title-type', el: () => <ChartCard title={ct('title-type', 'Type de titre')} icon={FileText} data={byTitleType} type={ty('title-type', 'bar-h')} colorIndex={0} labelWidth={120}
      insight={generateInsight(byTitleType, 'bar-h', 'les types de titre')} crossVariables={cx('title-type')} rawRecords={filtered} groupField="property_title_type" /> },
    { key: 'lease-type', el: () => <ChartCard title={ct('lease-type', 'Type de bail')} icon={KeyRound} data={byLeaseType} type={ty('lease-type', 'pie')} colorIndex={13} hidden={byLeaseType.length === 0}
      insight={generateInsight(byLeaseType, 'pie', 'les types de bail')} crossVariables={cx('lease-type')} rawRecords={filtered} groupField="lease_type" /> },
    { key: 'lease-duration', el: () => <ChartCard title={ct('lease-duration', 'Durée de bail')} data={byLeaseDuration} type={ty('lease-duration', 'bar-v')} colorIndex={5} hidden={byLeaseDuration.length === 0}
      insight={generateInsight(byLeaseDuration, 'bar-v', 'les durées de bail')} /> },
    { key: 'issue-year', el: () => <ChartCard title={ct('issue-year', 'Année de délivrance')} data={byIssueYear} type={ty('issue-year', 'bar-v')} colorIndex={2} hidden={byIssueYear.length === 0}
      insight={generateInsight(byIssueYear, 'bar-v', 'les années de délivrance')} /> },
    { key: 'issue-trend', el: () => <ChartCard title={ct('issue-trend', 'Évolution des titres')} data={issueTrend} type={ty('issue-trend', 'area')} colorIndex={0} colSpan={2} hidden={issueTrend.length < 2}
      insight={generateInsight(issueTrend, 'area', 'l\'évolution des titres')} /> },

    // Owner block
    { key: 'legal-status', el: () => <ChartCard title={ct('legal-status', 'Statut juridique')} icon={Scale} data={byLegalStatus} type={ty('legal-status', 'donut')} colorIndex={4} hidden={byLegalStatus.length === 0}
      insight={generateInsight(byLegalStatus, 'donut', 'les statuts juridiques')} /> },
    { key: 'gender', el: () => <ColorMappedPieCard title={ct('gender', 'Genre (pers. physique)')} icon={Users} iconColor="text-pink-500" data={genderData} colorMap={GENDER_COLORS} hidden={genderData.length === 0}
      insight={generateInsight(genderData, 'pie', 'le genre des propriétaires')} /> },
    { key: 'nationality', el: () => <ChartCard title={ct('nationality', 'Nationalité')} icon={Globe} data={byNationality} type={ty('nationality', 'pie')} colorIndex={9} hidden={byNationality.length === 0}
      insight={generateInsight(byNationality, 'pie', 'les nationalités')} /> },
    { key: 'entity-type', el: () => <ChartCard title={ct('entity-type', 'Type d\'entité (pers. morale)')} data={byEntityType} type={ty('entity-type', 'bar-h')} colorIndex={7} labelWidth={100} hidden={byEntityType.length === 0}
      insight={generateInsight(byEntityType, 'bar-h', 'les types d\'entité')} /> },
    { key: 'right-type', el: () => <ChartCard title={ct('right-type', 'Droit de l\'État')} data={byRightType} type={ty('right-type', 'pie')} colorIndex={11} hidden={byRightType.length === 0}
      insight={generateInsight(byRightType, 'pie', 'les droits étatiques')} /> },
    { key: 'owner-duration', el: () => <ChartCard title={ct('owner-duration', 'Ancienneté de détention')} icon={Clock} data={ownerDuration} type={ty('owner-duration', 'bar-v')} colorIndex={3} hidden={ownerDuration.length === 0}
      insight={generateInsight(ownerDuration, 'bar-v', 'l\'ancienneté de détention')} /> },

    // Ownership history block
    { key: 'mutation-type', el: () => <ChartCard title={ct('mutation-type', 'Type de mutation')} icon={ArrowRightLeft} data={byMutationType} type={ty('mutation-type', 'bar-h')} colorIndex={1} labelWidth={100} hidden={byMutationType.length === 0}
      insight={generateInsight(byMutationType, 'bar-h', 'les types de mutation')} /> },
    { key: 'hist-legal-status', el: () => <ChartCard title={ct('hist-legal-status', 'Statut juridique (anciens)')} data={byHistLegalStatus} type={ty('hist-legal-status', 'donut')} colorIndex={8} hidden={byHistLegalStatus.length === 0}
      insight={generateInsight(byHistLegalStatus, 'donut', 'les statuts juridiques historiques')} /> },
    { key: 'hist-duration', el: () => <ChartCard title={ct('hist-duration', 'Durée détention (anciens)')} data={histDuration} type={ty('hist-duration', 'bar-v')} colorIndex={6} hidden={histDuration.length === 0}
      insight={generateInsight(histDuration, 'bar-v', 'la durée de détention historique')} /> },
    { key: 'transfers-per-parcel', el: () => <ChartCard title={ct('transfers-per-parcel', 'Transferts par parcelle')} icon={UserCheck} data={transfersPerParcel} type={ty('transfers-per-parcel', 'bar-v')} colorIndex={10} hidden={transfersPerParcel.length === 0}
      insight={generateInsight(transfersPerParcel, 'bar-v', 'les transferts par parcelle')} /> },

    // Geo
    { key: 'geo', el: () => <GeoCharts records={filtered} /> },
  ].filter(d => v(d.key)).sort((a, b) => ord(a.key) - ord(b.key)),
  [filtered, byTitleType, byLeaseType, byLeaseDuration, byIssueYear, issueTrend, byLegalStatus, genderData, byNationality, byEntityType, byRightType, ownerDuration, byMutationType, byHistLegalStatus, histDuration, transfersPerParcel, v, ct, cx, ty, ord]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.parcels} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {chartDefs.map(d => <React.Fragment key={d.key}>{d.el()}</React.Fragment>)}
      </div>
    </div>
    </FilterLabelContext.Provider>
  );
});

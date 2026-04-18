import React, { useMemo, memo } from 'react';
import { AnalyticsFilters } from '../filters/AnalyticsFilters';
import { countBy, trendByMonth, avgProcessingDays, surfaceDistribution, yearDecadeDistribution } from '@/utils/analyticsHelpers';
import { pct } from '@/utils/analyticsConstants';
import { LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { FileText, TrendingUp, AlertTriangle, ShieldAlert, Users, Gavel, Home, KeyRound, Maximize, Clock, Layers, UserCheck, CalendarClock, Building2, BadgeCheck, Stamp } from 'lucide-react';
import { KpiGrid } from '../shared/KpiGrid';
import { ChartCard, FilterLabelContext } from '../shared/ChartCard';
import { GeoCharts } from '../shared/GeoCharts';
import { generateInsight } from '@/utils/chartInsights';
import { normalizeTitleType } from '@/utils/titleTypeNormalizer';
import { normalizeConstructionType } from '@/utils/constructionTypeNormalizer';
import { normalizeDeclaredUsage } from '@/utils/declaredUsageNormalizer';
import { useBlockFilter } from '@/hooks/useBlockFilter';

interface Props { data: LandAnalyticsData; }

const TAB_KEY = 'contributions';

export const ContributionsBlock: React.FC<Props> = memo(({ data }) => {
  const { filter, setFilter, filterLabel, filtered, filterConfig, v, ct, cx, ty, ord, exportCSV } = useBlockFilter(TAB_KEY, data.contributions);

  const byContributionType = useMemo(() => countBy(filtered, 'contribution_type'), [filtered]);
  const byStatus = useMemo(() => countBy(filtered, 'status'), [filtered]);
  const normalized = useMemo(() => filtered.map(r => ({
    ...r,
    property_title_type: normalizeTitleType(r.property_title_type),
    construction_type: normalizeConstructionType(r.construction_type),
    declared_usage: normalizeDeclaredUsage(r.declared_usage),
  })), [filtered]);
  const byPropertyTitleType = useMemo(() => countBy(normalized, 'property_title_type'), [normalized]);
  const byLegalStatus = useMemo(() => countBy(filtered, 'current_owner_legal_status'), [filtered]);
  const byDeclaredUsage = useMemo(() => countBy(normalized, 'declared_usage'), [normalized]);
  const byConstructionType = useMemo(() => countBy(normalized, 'construction_type'), [normalized]);
  const byPropertyCategory = useMemo(() => countBy(filtered, 'property_category').filter(d => d.name !== 'Terrain nu'), [filtered]);
  const byLeaseType = useMemo(() => countBy(filtered, 'lease_type'), [filtered]);
  const byConstructionMaterials = useMemo(() => countBy(filtered, 'construction_materials'), [filtered]);
  const byStanding = useMemo(() => countBy(filtered, 'standing'), [filtered]);
  const byAreaDist = useMemo(() => surfaceDistribution(filtered), [filtered]);
  const byConstructionDecade = useMemo(() => yearDecadeDistribution(filtered, 'construction_year'), [filtered]);
  const byTitleIssueDecade = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(r => {
      if (!r.title_issue_date) return;
      const y = new Date(r.title_issue_date).getFullYear();
      if (!y || isNaN(y)) return;
      const decade = `${Math.floor(y / 10) * 10}s`;
      map.set(decade, (map.get(decade) || 0) + 1);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const occupationData = useMemo(() => {
    const occupied = filtered.filter(r => r.is_occupied === true).length;
    const vacant = filtered.filter(r => r.is_occupied === false).length;
    return [
      ...(occupied > 0 ? [{ name: 'Habité', value: occupied }] : []),
      ...(vacant > 0 ? [{ name: 'Non habité', value: vacant }] : []),
    ];
  }, [filtered]);
  const trend = useMemo(() => trendByMonth(filtered), [filtered]);

  const floorDistData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(r => {
      const f = r.floor_number;
      if (f != null && f !== '') {
        const label = f === '0' || String(f).toLowerCase() === 'rdc' ? 'RDC' : `${f} étage${parseInt(String(f)) > 1 ? 's' : ''}`;
        map.set(label, (map.get(label) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Co-owners analytics from current_owners_details (jsonb array)
  const coOwnersData = useMemo(() => {
    const countBuckets = new Map<string, number>();
    const genderMap = new Map<string, number>();
    const nationalityMap = new Map<string, number>();
    let multiOwnerCount = 0;
    filtered.forEach(r => {
      const owners = r.current_owners_details;
      if (!Array.isArray(owners) || owners.length === 0) return;
      const n = owners.length;
      if (n > 1) multiOwnerCount++;
      const bucket = n === 1 ? '1' : n === 2 ? '2' : n === 3 ? '3' : n <= 5 ? '4-5' : '6+';
      countBuckets.set(bucket, (countBuckets.get(bucket) || 0) + 1);
      owners.forEach((o: any) => {
        const g = o?.gender || o?.sexe;
        if (g) {
          const lbl = g === 'M' || g === 'male' || g === 'Homme' ? 'Homme' : g === 'F' || g === 'female' || g === 'Femme' ? 'Femme' : String(g);
          genderMap.set(lbl, (genderMap.get(lbl) || 0) + 1);
        }
        const nat = o?.nationality || o?.nationalite;
        if (nat) nationalityMap.set(String(nat), (nationalityMap.get(String(nat)) || 0) + 1);
      });
    });
    const order = ['1', '2', '3', '4-5', '6+'];
    const byCount = order.filter(k => countBuckets.has(k)).map(k => ({ name: k, value: countBuckets.get(k)! }));
    const byGender = Array.from(genderMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const byNationality = Array.from(nationalityMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    return { byCount, byGender, byNationality, multiOwnerCount };
  }, [filtered]);

  // Ownership tenure (years since current_owner_since)
  const ownershipTenureData = useMemo(() => {
    const buckets = [
      { name: '< 1 an', min: 0, max: 1 },
      { name: '1-3 ans', min: 1, max: 3 },
      { name: '3-5 ans', min: 3, max: 5 },
      { name: '5-10 ans', min: 5, max: 10 },
      { name: '10-20 ans', min: 10, max: 20 },
      { name: '> 20 ans', min: 20, max: Infinity },
    ];
    const counts = new Array(buckets.length).fill(0);
    const now = Date.now();
    filtered.forEach(r => {
      if (!r.current_owner_since) return;
      const t = new Date(r.current_owner_since).getTime();
      if (isNaN(t)) return;
      const years = (now - t) / (1000 * 60 * 60 * 24 * 365.25);
      if (years < 0) return;
      for (let i = 0; i < buckets.length; i++) {
        if (years >= buckets[i].min && years < buckets[i].max) { counts[i]++; break; }
      }
    });
    return buckets.map((b, i) => ({ name: b.name, value: counts[i] })).filter(b => b.value > 0);
  }, [filtered]);

  // Title in current owner name (boolean)
  const titleInNameData = useMemo(() => {
    let yes = 0, no = 0;
    filtered.forEach(r => {
      if (r.is_title_in_current_owner_name === true) yes++;
      else if (r.is_title_in_current_owner_name === false) no++;
    });
    return [
      ...(yes > 0 ? [{ name: 'Au nom du propriétaire', value: yes }] : []),
      ...(no > 0 ? [{ name: 'Autre nom', value: no }] : []),
    ];
  }, [filtered]);

  // Occupant density (occupants per 100 m²)
  const occupantDensityData = useMemo(() => {
    const buckets = [
      { name: '< 1 / 100m²', max: 1 },
      { name: '1-3 / 100m²', max: 3 },
      { name: '3-5 / 100m²', max: 5 },
      { name: '5-10 / 100m²', max: 10 },
      { name: '> 10 / 100m²', max: Infinity },
    ];
    const counts = new Array(buckets.length).fill(0);
    filtered.forEach(r => {
      if (!r.occupant_count || !r.area_sqm || r.area_sqm <= 0) return;
      const density = (r.occupant_count / r.area_sqm) * 100;
      for (let i = 0; i < buckets.length; i++) {
        if (density <= buckets[i].max) { counts[i]++; break; }
      }
    });
    return buckets.map((b, i) => ({ name: b.name, value: counts[i] })).filter(b => b.value > 0);
  }, [filtered]);

  // Lease years distribution
  const leaseYearsData = useMemo(() => {
    const buckets = [
      { name: '< 5 ans', min: 0, max: 5 },
      { name: '5-10 ans', min: 5, max: 10 },
      { name: '10-25 ans', min: 10, max: 25 },
      { name: '25-50 ans', min: 25, max: 50 },
      { name: '> 50 ans', min: 50, max: Infinity },
    ];
    const counts = new Array(buckets.length).fill(0);
    filtered.forEach(r => {
      const y = r.lease_years;
      if (y == null || y <= 0) return;
      for (let i = 0; i < buckets.length; i++) {
        if (y >= buckets[i].min && y < buckets[i].max) { counts[i]++; break; }
      }
    });
    return buckets.map((b, i) => ({ name: b.name, value: counts[i] })).filter(b => b.value > 0);
  }, [filtered]);

  // Rental trend (rental_start_date by month)
  const rentalTrend = useMemo(() => trendByMonth(filtered.filter(r => r.rental_start_date), 'rental_start_date'), [filtered]);

  // Additional constructions count distribution
  const additionalConstructionsData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(r => {
      const arr = r.additional_constructions;
      if (!Array.isArray(arr)) return;
      const n = arr.length;
      if (n === 0) return;
      const bucket = n === 1 ? '1' : n === 2 ? '2' : n === 3 ? '3' : n <= 5 ? '4-5' : '6+';
      map.set(bucket, (map.get(bucket) || 0) + 1);
    });
    const order = ['1', '2', '3', '4-5', '6+'];
    return order.filter(k => map.has(k)).map(k => ({ name: k, value: map.get(k)! }));
  }, [filtered]);

  // Buildings per parcel from building_shapes
  const buildingsPerParcelData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(r => {
      const shapes = r.building_shapes;
      if (!Array.isArray(shapes) || shapes.length === 0) return;
      const n = shapes.length;
      const bucket = n === 1 ? '1' : n === 2 ? '2' : n === 3 ? '3' : n <= 5 ? '4-5' : '6+';
      map.set(bucket, (map.get(bucket) || 0) + 1);
    });
    const order = ['1', '2', '3', '4-5', '6+'];
    return order.filter(k => map.has(k)).map(k => ({ name: k, value: map.get(k)! }));
  }, [filtered]);

  const fraudData = useMemo(() => {
    const suspicious = filtered.filter(r => r.is_suspicious === true).length;
    const safe = filtered.length - suspicious;
    const distribution = [
      ...(suspicious > 0 ? [{ name: 'Suspectes', value: suspicious }] : []),
      { name: 'Normales', value: safe },
    ];
    const scoreRecords = filtered.filter(r => r.fraud_score != null && r.fraud_score > 0);
    const byScore = [
      { name: '< 30 (Faible)', value: scoreRecords.filter(r => r.fraud_score < 30).length },
      { name: '30-60 (Moyen)', value: scoreRecords.filter(r => r.fraud_score >= 30 && r.fraud_score < 60).length },
      { name: '60-80 (Élevé)', value: scoreRecords.filter(r => r.fraud_score >= 60 && r.fraud_score < 80).length },
      { name: '≥ 80 (Critique)', value: scoreRecords.filter(r => r.fraud_score >= 80).length },
    ].filter(d => d.value > 0);
    const byFraudReason = countBy(filtered.filter(r => r.fraud_reason), 'fraud_reason');
    return { distribution, byScore, suspicious, byFraudReason };
  }, [filtered]);

  const appealData = useMemo(() => {
    const submitted = filtered.filter(r => r.appeal_submitted === true).length;
    const byAppealStatus = countBy(filtered.filter(r => r.appeal_status), 'appeal_status');
    return { submitted, byAppealStatus };
  }, [filtered]);

  const stats = useMemo(() => {
    const approved = filtered.filter(r => r.status === 'approved').length;
    const pending = filtered.filter(r => r.status === 'pending').length;
    const rejected = filtered.filter(r => r.status === 'rejected').length;
    const avgDays = avgProcessingDays(filtered, 'created_at', 'reviewed_at');
    return { approved, pending, rejected, avgDays };
  }, [filtered]);

  const withLease = useMemo(() => filtered.filter(r => r.lease_type).length, [filtered]);
  const totalHostingCapacity = useMemo(() => filtered.reduce((s, r) => s + (r.hosting_capacity || 0), 0), [filtered]);
  const multiConstructionCount = useMemo(() =>
    filtered.filter(r => Array.isArray(r.additional_constructions) && r.additional_constructions.length > 0).length,
    [filtered]);

  const kpiItems = useMemo(() => [
    { key: 'kpi-total', label: ct('kpi-total', 'Total'), value: filtered.length, cls: 'text-primary' },
    { key: 'kpi-approved', label: ct('kpi-approved', 'Approuvées'), value: stats.approved, cls: 'text-emerald-600', tooltip: pct(stats.approved, filtered.length) },
    { key: 'kpi-pending', label: ct('kpi-pending', 'En attente'), value: stats.pending, cls: 'text-amber-600', tooltip: pct(stats.pending, filtered.length) },
    { key: 'kpi-suspicious', label: ct('kpi-suspicious', 'Suspectes'), value: fraudData.suspicious, cls: 'text-red-600', tooltip: pct(fraudData.suspicious, filtered.length) },
    { key: 'kpi-appeals', label: ct('kpi-appeals', 'Appels'), value: appealData.submitted, cls: 'text-blue-600', tooltip: pct(appealData.submitted, filtered.length) },
    { key: 'kpi-with-lease', label: ct('kpi-with-lease', 'Avec bail'), value: withLease, cls: 'text-teal-600', tooltip: pct(withLease, filtered.length) },
    { key: 'kpi-delay', label: ct('kpi-delay', 'Délai moy.'), value: stats.avgDays > 0 ? `${stats.avgDays}j` : 'N/A', cls: 'text-violet-600', tooltip: 'Délai moyen de traitement' },
    { key: 'kpi-hosting', label: ct('kpi-hosting', 'Cap. accueil'), value: totalHostingCapacity > 0 ? totalHostingCapacity.toLocaleString() : 'N/A', cls: 'text-indigo-600', tooltip: "Capacité d'accueil totale déclarée" },
    { key: 'kpi-multi-owner', label: ct('kpi-multi-owner', 'Multi-prop.'), value: coOwnersData.multiOwnerCount, cls: 'text-pink-600', tooltip: pct(coOwnersData.multiOwnerCount, filtered.length) },
    { key: 'kpi-multi-constr', label: ct('kpi-multi-constr', 'Multi-constr.'), value: multiConstructionCount, cls: 'text-orange-600', tooltip: pct(multiConstructionCount, filtered.length) },
  ].filter(k => v(k.key)), [filtered, stats, fraudData, appealData, withLease, totalHostingCapacity, coOwnersData.multiOwnerCount, multiConstructionCount, v, ct]);

  const chartDefs = useMemo(() => [
    { key: 'contribution-type', el: () => <ChartCard title={ct('contribution-type', 'Type contribution')} icon={FileText} data={byContributionType} type={ty('contribution-type', 'bar-h')} colorIndex={0} labelWidth={100}
      insight={generateInsight(byContributionType, 'bar-h', 'les types de contribution')} crossVariables={cx('contribution-type')} rawRecords={filtered} groupField="contribution_type" /> },
    { key: 'status', el: () => <ChartCard title={ct('status', 'Statut')} data={byStatus} type={ty('status', 'pie')} colorIndex={1}
      insight={generateInsight(byStatus, 'pie', 'les statuts')} crossVariables={cx('status')} rawRecords={filtered} groupField="status" /> },
    { key: 'title-type', el: () => <ChartCard title={ct('title-type', 'Type titre')} data={byPropertyTitleType} type={ty('title-type', 'bar-h')} colorIndex={3} labelWidth={100} hidden={byPropertyTitleType.length === 0}
      insight={generateInsight(byPropertyTitleType, 'bar-h', 'les types de titre')} crossVariables={cx('title-type')} rawRecords={normalized} groupField="property_title_type" /> },
    { key: 'legal-status', el: () => <ChartCard title={ct('legal-status', 'Statut juridique')} icon={Users} data={byLegalStatus} type={ty('legal-status', 'donut')} colorIndex={4}
      insight={generateInsight(byLegalStatus, 'donut', 'les statuts juridiques')} crossVariables={cx('legal-status')} rawRecords={filtered} groupField="current_owner_legal_status" /> },
    { key: 'usage', el: () => <ChartCard title={ct('usage', 'Usage déclaré')} data={byDeclaredUsage} type={ty('usage', 'bar-h')} colorIndex={5} hidden={byDeclaredUsage.length === 0}
      insight={generateInsight(byDeclaredUsage, 'bar-h', 'les usages déclarés')} crossVariables={cx('usage')} rawRecords={normalized} groupField="declared_usage" /> },
    { key: 'construction-type', el: () => <ChartCard title={ct('construction-type', 'Type construction')} data={byConstructionType} type={ty('construction-type', 'bar-h')} colorIndex={7} hidden={byConstructionType.length === 0}
      insight={generateInsight(byConstructionType, 'bar-h', 'les types de construction')} crossVariables={cx('construction-type')} rawRecords={normalized} groupField="construction_type" /> },
    { key: 'property-category', el: () => <ChartCard title={ct('property-category', 'Catégorie de bien')} data={byPropertyCategory} type={ty('property-category', 'bar-h')} colorIndex={2} hidden={byPropertyCategory.length === 0}
      insight={generateInsight(byPropertyCategory, 'bar-h', 'les catégories de bien')} crossVariables={cx('property-category')} rawRecords={filtered} groupField="property_category" /> },
    { key: 'fraud-detection', el: () => <ChartCard title={ct('fraud-detection', 'Détection fraude')} icon={ShieldAlert} data={fraudData.distribution} type={ty('fraud-detection', 'pie')} colorIndex={4}
      insight={fraudData.suspicious > 0 ? `${fraudData.suspicious} contribution${fraudData.suspicious > 1 ? 's' : ''} signalée${fraudData.suspicious > 1 ? 's' : ''} comme suspecte${fraudData.suspicious > 1 ? 's' : ''}.` : 'Aucune contribution suspecte détectée.'}
      crossVariables={cx('fraud-detection')} rawRecords={filtered} groupField="is_suspicious" /> },
    { key: 'fraud-score', el: () => <ChartCard title={ct('fraud-score', 'Score fraude')} icon={AlertTriangle} data={fraudData.byScore} type={ty('fraud-score', 'bar-v')} colorIndex={4} hidden={fraudData.byScore.length === 0}
      insight={generateInsight(fraudData.byScore, 'bar-v', 'les niveaux de risque')} crossVariables={cx('fraud-score')} rawRecords={filtered} groupField="fraud_score" /> },
    { key: 'fraud-reason', el: () => <ChartCard title={ct('fraud-reason', 'Motif fraude')} data={fraudData.byFraudReason} type={ty('fraud-reason', 'bar-h')} colorIndex={4} labelWidth={120} hidden={fraudData.byFraudReason.length === 0}
      insight={generateInsight(fraudData.byFraudReason, 'bar-h', 'les motifs de fraude')} crossVariables={cx('fraud-reason')} rawRecords={filtered} groupField="fraud_reason" /> },
    { key: 'appeal-status', el: () => <ChartCard title={ct('appeal-status', 'Statut appel')} icon={Gavel} data={appealData.byAppealStatus} type={ty('appeal-status', 'donut')} colorIndex={9} hidden={appealData.byAppealStatus.length === 0}
      insight={generateInsight(appealData.byAppealStatus, 'donut', 'les appels')} crossVariables={cx('appeal-status')} rawRecords={filtered} groupField="appeal_status" /> },
    { key: 'occupation', el: () => <ChartCard title={ct('occupation', 'Occupation')} icon={Home} data={occupationData} type={ty('occupation', 'pie')} colorIndex={12} hidden={occupationData.length === 0}
      insight={generateInsight(occupationData, 'pie', "l'occupation des biens")} crossVariables={cx('occupation')} rawRecords={filtered} groupField="is_occupied" /> },
    { key: 'lease-type', el: () => <ChartCard title={ct('lease-type', 'Type de bail')} icon={KeyRound} data={byLeaseType} type={ty('lease-type', 'donut')} colorIndex={13} hidden={byLeaseType.length === 0}
      insight={generateInsight(byLeaseType, 'donut', 'les types de bail')} crossVariables={cx('lease-type')} rawRecords={filtered} groupField="lease_type" /> },
    { key: 'area-distribution', el: () => <ChartCard title={ct('area-distribution', 'Distribution surface')} icon={Maximize} data={byAreaDist} type={ty('area-distribution', 'bar-v')} colorIndex={2} hidden={byAreaDist.length === 0}
      insight={generateInsight(byAreaDist, 'bar-v', 'les surfaces déclarées')} crossVariables={cx('area-distribution')} rawRecords={filtered} groupField="area_sqm" /> },
    { key: 'construction-decade', el: () => <ChartCard title={ct('construction-decade', 'Année construction')} icon={Clock} data={byConstructionDecade} type={ty('construction-decade', 'bar-v')} colorIndex={0} hidden={byConstructionDecade.length === 0}
      insight={generateInsight(byConstructionDecade, 'bar-v', 'les décennies de construction')} crossVariables={cx('construction-decade')} rawRecords={filtered} groupField="construction_year" /> },
    { key: 'construction-materials', el: () => <ChartCard title={ct('construction-materials', 'Matériaux')} data={byConstructionMaterials} type={ty('construction-materials', 'bar-h')} colorIndex={8} hidden={byConstructionMaterials.length === 0}
      insight={generateInsight(byConstructionMaterials, 'bar-h', 'les matériaux de construction')} crossVariables={cx('construction-materials')} rawRecords={filtered} groupField="construction_materials" /> },
    { key: 'standing', el: () => <ChartCard title={ct('standing', 'Standing')} data={byStanding} type={ty('standing', 'donut')} colorIndex={6} hidden={byStanding.length === 0}
      insight={generateInsight(byStanding, 'donut', 'les niveaux de standing')} crossVariables={cx('standing')} rawRecords={filtered} groupField="standing" /> },
    { key: 'floor-dist', el: () => <ChartCard title={ct('floor-dist', "Nombre d'étages")} icon={Layers} data={floorDistData} type={ty('floor-dist', 'bar-v')} colorIndex={14} hidden={floorDistData.length === 0}
      insight={generateInsight(floorDistData, 'bar-v', 'la distribution des étages')} crossVariables={cx('floor-dist')} rawRecords={filtered} groupField="floor_number" /> },
    { key: 'co-owners', el: () => <ChartCard title={ct('co-owners', 'Nb co-propriétaires')} icon={Users} data={coOwnersData.byCount} type={ty('co-owners', 'bar-v')} colorIndex={9} hidden={coOwnersData.byCount.length === 0}
      insight={generateInsight(coOwnersData.byCount, 'bar-v', 'le nombre de co-propriétaires')} /> },
    { key: 'co-owners-gender', el: () => <ChartCard title={ct('co-owners-gender', 'Genre co-propriétaires')} icon={UserCheck} data={coOwnersData.byGender} type={ty('co-owners-gender', 'donut')} colorIndex={10} hidden={coOwnersData.byGender.length === 0}
      insight={generateInsight(coOwnersData.byGender, 'donut', 'la répartition par genre')} /> },
    { key: 'co-owners-nationality', el: () => <ChartCard title={ct('co-owners-nationality', 'Nationalité co-propriétaires')} data={coOwnersData.byNationality} type={ty('co-owners-nationality', 'bar-h')} colorIndex={11} hidden={coOwnersData.byNationality.length === 0}
      insight={generateInsight(coOwnersData.byNationality, 'bar-h', 'les nationalités')} /> },
    { key: 'ownership-tenure', el: () => <ChartCard title={ct('ownership-tenure', 'Ancienneté propriété')} icon={CalendarClock} data={ownershipTenureData} type={ty('ownership-tenure', 'bar-v')} colorIndex={3} hidden={ownershipTenureData.length === 0}
      insight={generateInsight(ownershipTenureData, 'bar-v', "l'ancienneté de propriété")} crossVariables={cx('ownership-tenure')} rawRecords={filtered} groupField="current_owner_since" /> },
    { key: 'title-in-name', el: () => <ChartCard title={ct('title-in-name', 'Titre au nom du propriétaire')} icon={BadgeCheck} data={titleInNameData} type={ty('title-in-name', 'donut')} colorIndex={5} hidden={titleInNameData.length === 0}
      insight={generateInsight(titleInNameData, 'donut', 'la conformité du titre')} crossVariables={cx('title-in-name')} rawRecords={filtered} groupField="is_title_in_current_owner_name" /> },
    { key: 'title-issue-decade', el: () => <ChartCard title={ct('title-issue-decade', 'Décennie émission titre')} icon={Stamp} data={byTitleIssueDecade} type={ty('title-issue-decade', 'bar-v')} colorIndex={1} hidden={byTitleIssueDecade.length === 0}
      insight={generateInsight(byTitleIssueDecade, 'bar-v', "les décennies d'émission de titre")} /> },
    { key: 'occupant-density', el: () => <ChartCard title={ct('occupant-density', "Densité d'occupants")} icon={Home} data={occupantDensityData} type={ty('occupant-density', 'bar-v')} colorIndex={12} hidden={occupantDensityData.length === 0}
      insight={generateInsight(occupantDensityData, 'bar-v', "la densité d'occupation")} /> },
    { key: 'lease-years', el: () => <ChartCard title={ct('lease-years', 'Durée des baux')} icon={KeyRound} data={leaseYearsData} type={ty('lease-years', 'bar-v')} colorIndex={13} hidden={leaseYearsData.length === 0}
      insight={generateInsight(leaseYearsData, 'bar-v', 'les durées de bail')} crossVariables={cx('lease-years')} rawRecords={filtered} groupField="lease_years" /> },
    { key: 'rental-trend', el: () => <ChartCard title={ct('rental-trend', 'Tendance locative')} icon={TrendingUp} data={rentalTrend} type={ty('rental-trend', 'area')} colorIndex={6} hidden={rentalTrend.length === 0}
      insight={generateInsight(rentalTrend, 'area', 'les démarrages locatifs')} /> },
    { key: 'additional-constructions', el: () => <ChartCard title={ct('additional-constructions', 'Bâtiments secondaires')} icon={Building2} data={additionalConstructionsData} type={ty('additional-constructions', 'bar-v')} colorIndex={8} hidden={additionalConstructionsData.length === 0}
      insight={generateInsight(additionalConstructionsData, 'bar-v', 'les bâtiments secondaires')} /> },
    { key: 'buildings-per-parcel', el: () => <ChartCard title={ct('buildings-per-parcel', 'Bâtiments par parcelle')} icon={Building2} data={buildingsPerParcelData} type={ty('buildings-per-parcel', 'bar-v')} colorIndex={7} hidden={buildingsPerParcelData.length === 0}
      insight={generateInsight(buildingsPerParcelData, 'bar-v', 'le nombre de bâtiments par parcelle')} /> },
    { key: 'geo', el: () => <GeoCharts records={filtered} /> },
    { key: 'evolution', el: () => <ChartCard title={ct('evolution', 'Évolution')} icon={TrendingUp} data={trend} type={ty('evolution', 'area')} colorIndex={0} colSpan={2}
      insight={generateInsight(trend, 'area', 'les contributions')} /> },
  ].filter(d => v(d.key)).sort((a, b) => ord(a.key) - ord(b.key)), [filtered, normalized, byContributionType, byStatus, byPropertyTitleType, byLegalStatus, byDeclaredUsage, byConstructionType, byPropertyCategory, byLeaseType, byConstructionMaterials, byStanding, byAreaDist, byConstructionDecade, byTitleIssueDecade, occupationData, floorDistData, coOwnersData, ownershipTenureData, titleInNameData, occupantDensityData, leaseYearsData, rentalTrend, additionalConstructionsData, buildingsPerParcelData, fraudData, appealData, trend, v, ct, cx, ty, ord]);

  return (
    <FilterLabelContext.Provider value={filterLabel}>
    <div className="space-y-2">
      <AnalyticsFilters data={data.contributions} filter={filter} onChange={setFilter} hideStatus={filterConfig.hideStatus} hideTime={filterConfig.hideTime} hideLocation={filterConfig.hideLocation} dateField={filterConfig.dateField} statusField={filterConfig.statusField} />
      <KpiGrid items={kpiItems} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {chartDefs.map(d => <React.Fragment key={d.key}>{d.el()}</React.Fragment>)}
      </div>
    </div>
    </FilterLabelContext.Provider>
  );
});

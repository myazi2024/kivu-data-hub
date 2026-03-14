import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Interfaces ──────────────────────────────────────────────────────

export interface ProvinceParcelStats {
  province: string;
  count: number;
  avgArea: number;
  suCount: number;
  srCount: number;
  withGps: number;
}

export interface Distribution { label: string; count: number; }

export interface ContributionByStatus { status: string; count: number; }
export interface ContributionByProvince { province: string; approved: number; pending: number; rejected: number; total: number; }
export interface ContributionTrend { month: string; sortKey: string; count: number; }

export interface InvoiceStats { status: string; count: number; revenue: number; }
export interface MonthlyRevenue { month: string; sortKey: string; revenue: number; count: number; }

export interface TaxYearStats { year: number; paid: number; pending: number; paidCount: number; pendingCount: number; }

export interface DisputeStats { byType: Distribution[]; byStatus: Distribution[]; byNature: Distribution[]; total: number; }

export interface MortgageStats { byStatus: Distribution[]; byCreditorType: Distribution[]; totalAmount: number; totalCount: number; }

export interface TitleRequestStats { byStatus: Distribution[]; byProvince: Distribution[]; byType: Distribution[]; bySectionType: Distribution[]; byPaymentStatus: Distribution[]; total: number; totalAmount: number; }

export interface OwnershipStats { byLegalStatus: Distribution[]; byGender: Distribution[]; byLeaseType: Distribution[]; }

export interface PermitStats { byStatus: Distribution[]; total: number; }

export interface CCCCodeStats { total: number; used: number; unused: number; totalValue: number; usedValue: number; }

export interface RegistrationTrend { month: string; sortKey: string; count: number; }

export interface LandDataAnalytics {
  parcelsByProvince: ProvinceParcelStats[];
  titleTypes: Distribution[];
  usageDistribution: Distribution[];
  constructionNatures: Distribution[];
  constructionTypes: Distribution[];
  ownershipStats: OwnershipStats;
  contributionsByStatus: ContributionByStatus[];
  contributionsByProvince: ContributionByProvince[];
  contributionTrends: ContributionTrend[];
  invoiceStats: InvoiceStats[];
  monthlyRevenue: MonthlyRevenue[];
  taxHistory: TaxYearStats[];
  disputeStats: DisputeStats;
  mortgageStats: MortgageStats;
  titleRequestStats: TitleRequestStats;
  permitStats: PermitStats;
  cccCodeStats: CCCCodeStats;
  registrationTrends: RegistrationTrend[];
  totals: {
    totalParcels: number;
    totalProvinces: number;
    totalContributions: number;
    totalInvoices: number;
    totalRevenue: number;
    totalTaxCollected: number;
    avgArea: number;
    withGps: number;
    totalDisputes: number;
    totalMortgages: number;
    totalTitleRequests: number;
    totalPermits: number;
  };
}

// ─── Helper ──────────────────────────────────────────────────────────

const incMap = (map: Map<string, number>, key: string, n = 1) => {
  map.set(key, (map.get(key) || 0) + n);
};

const toDistribution = (map: Map<string, number>): Distribution[] =>
  Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

const monthKey = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (sortKey: string) => {
  const [y, m] = sortKey.split('-');
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' });
};

// ─── Hook ────────────────────────────────────────────────────────────

export const useLandDataAnalytics = () => {
  return useQuery({
    queryKey: ['land-data-analytics-v2'],
    queryFn: async (): Promise<LandDataAnalytics> => {
      const [
        parcelsRes,
        contributionsRes,
        invoicesRes,
        taxRes,
        disputesRes,
        mortgagesRes,
        titleReqRes,
        permitsRes,
        cccCodesRes,
      ] = await Promise.all([
        supabase.from('cadastral_parcels')
          .select('province, parcel_type, area_sqm, gps_coordinates, created_at, property_title_type, declared_usage, construction_nature, construction_type, current_owner_legal_status, lease_type')
          .is('deleted_at', null),
        supabase.from('cadastral_contributions')
          .select('province, status, created_at, current_owner_legal_status, current_owners_details'),
        supabase.from('cadastral_invoices')
          .select('status, total_amount_usd, created_at, payment_method'),
        supabase.from('cadastral_tax_history')
          .select('tax_year, payment_status, amount_usd'),
        supabase.from('cadastral_land_disputes')
          .select('dispute_type, dispute_nature, current_status'),
        supabase.from('cadastral_mortgages')
          .select('mortgage_status, mortgage_amount_usd, creditor_type'),
        supabase.from('land_title_requests')
          .select('status, province, section_type, payment_status, total_amount_usd, request_type'),
        supabase.from('cadastral_building_permits')
          .select('administrative_status'),
        supabase.from('cadastral_contributor_codes')
          .select('value_usd, is_used'),
      ]);

      const parcels = parcelsRes.data || [];
      const contributions = contributionsRes.data || [];
      const invoices = invoicesRes.data || [];
      const taxes = taxRes.data || [];
      const disputes = disputesRes.data || [];
      const mortgages = mortgagesRes.data || [];
      const titleReqs = titleReqRes.data || [];
      const permits = permitsRes.data || [];
      const cccCodes = cccCodesRes.data || [];

      // ── PARCELS ────────────────────────────────────────────
      const provinceMap = new Map<string, ProvinceParcelStats>();
      const titleMap = new Map<string, number>();
      const usageMap = new Map<string, number>();
      const natMap = new Map<string, number>();
      const typeMap = new Map<string, number>();
      const regTrendMap = new Map<string, number>();
      const legalStatusMap = new Map<string, number>();
      const genderMap = new Map<string, number>();
      const leaseMap = new Map<string, number>();

      parcels.forEach((p: any) => {
        const prov = p.province || 'Non spécifié';
        if (!provinceMap.has(prov)) {
          provinceMap.set(prov, { province: prov, count: 0, avgArea: 0, suCount: 0, srCount: 0, withGps: 0 });
        }
        const entry = provinceMap.get(prov)!;
        entry.count++;
        entry.avgArea += (p.area_sqm || 0);
        if (p.parcel_type === 'SU') entry.suCount++;
        if (p.parcel_type === 'SR') entry.srCount++;
        if (p.gps_coordinates) entry.withGps++;

        if (p.property_title_type) incMap(titleMap, p.property_title_type);
        if (p.declared_usage) incMap(usageMap, p.declared_usage);
        if (p.construction_nature) incMap(natMap, p.construction_nature);
        if (p.construction_type) incMap(typeMap, p.construction_type);
        if (p.current_owner_legal_status) incMap(legalStatusMap, p.current_owner_legal_status);
        if (p.lease_type) incMap(leaseMap, p.lease_type);

        if (p.created_at) {
          const key = monthKey(p.created_at);
          incMap(regTrendMap, key);
        }
      });

      const parcelsByProvince = Array.from(provinceMap.values())
        .map(p => ({ ...p, avgArea: p.count > 0 ? Math.round(p.avgArea / p.count) : 0 }))
        .sort((a, b) => b.count - a.count);

      // ── CONTRIBUTIONS ──────────────────────────────────────
      const contribStatusMap = new Map<string, number>();
      const contribProvMap = new Map<string, { approved: number; pending: number; rejected: number; total: number }>();
      const contribTrendMap = new Map<string, number>();

      contributions.forEach((c: any) => {
        incMap(contribStatusMap, c.status || 'unknown');

        const prov = c.province || 'Non spécifié';
        if (!contribProvMap.has(prov)) contribProvMap.set(prov, { approved: 0, pending: 0, rejected: 0, total: 0 });
        const pe = contribProvMap.get(prov)!;
        pe.total++;
        if (c.status === 'approved') pe.approved++;
        else if (c.status === 'pending') pe.pending++;
        else if (c.status === 'rejected') pe.rejected++;

        if (c.created_at) incMap(contribTrendMap, monthKey(c.created_at));

        // Extract gender from current_owners_details
        if (c.current_owners_details && Array.isArray(c.current_owners_details)) {
          (c.current_owners_details as any[]).forEach((owner: any) => {
            if (owner?.gender) incMap(genderMap, owner.gender);
          });
        }
      });

      const contributionsByStatus = Array.from(contribStatusMap.entries())
        .map(([status, count]) => ({ status, count }));

      const contributionsByProvince = Array.from(contribProvMap.entries())
        .map(([province, stats]) => ({ province, ...stats }))
        .sort((a, b) => b.total - a.total);

      const contributionTrends = Array.from(contribTrendMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([sortKey, count]) => ({ sortKey, month: monthLabel(sortKey), count }));

      // ── INVOICES ───────────────────────────────────────────
      const invStatusMap = new Map<string, { count: number; revenue: number }>();
      const monthlyRevMap = new Map<string, { revenue: number; count: number }>();

      invoices.forEach((i: any) => {
        const s = i.status || 'unknown';
        if (!invStatusMap.has(s)) invStatusMap.set(s, { count: 0, revenue: 0 });
        const e = invStatusMap.get(s)!;
        e.count++;
        e.revenue += (i.total_amount_usd || 0);

        if (i.created_at) {
          const mk = monthKey(i.created_at);
          if (!monthlyRevMap.has(mk)) monthlyRevMap.set(mk, { revenue: 0, count: 0 });
          const mr = monthlyRevMap.get(mk)!;
          mr.revenue += (i.total_amount_usd || 0);
          mr.count++;
        }
      });

      const invoiceStats = Array.from(invStatusMap.entries())
        .map(([status, data]) => ({ status, ...data }));

      const monthlyRevenue = Array.from(monthlyRevMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([sortKey, data]) => ({ sortKey, month: monthLabel(sortKey), ...data }));

      // ── TAXES ──────────────────────────────────────────────
      const taxYearMap = new Map<number, TaxYearStats>();
      taxes.forEach((t: any) => {
        if (!taxYearMap.has(t.tax_year)) taxYearMap.set(t.tax_year, { year: t.tax_year, paid: 0, pending: 0, paidCount: 0, pendingCount: 0 });
        const e = taxYearMap.get(t.tax_year)!;
        if (t.payment_status === 'paid') { e.paid += (t.amount_usd || 0); e.paidCount++; }
        else { e.pending += (t.amount_usd || 0); e.pendingCount++; }
      });
      const taxHistory = Array.from(taxYearMap.values()).sort((a, b) => a.year - b.year);

      // ── DISPUTES ───────────────────────────────────────────
      const dispTypeMap = new Map<string, number>();
      const dispStatusMap = new Map<string, number>();
      const dispNatureMap = new Map<string, number>();
      disputes.forEach((d: any) => {
        if (d.dispute_type) incMap(dispTypeMap, d.dispute_type);
        if (d.current_status) incMap(dispStatusMap, d.current_status);
        if (d.dispute_nature) incMap(dispNatureMap, d.dispute_nature);
      });

      // ── MORTGAGES ──────────────────────────────────────────
      const mortStatusMap = new Map<string, number>();
      const mortCredMap = new Map<string, number>();
      let totalMortAmount = 0;
      mortgages.forEach((m: any) => {
        if (m.mortgage_status) incMap(mortStatusMap, m.mortgage_status);
        if (m.creditor_type) incMap(mortCredMap, m.creditor_type);
        totalMortAmount += (m.mortgage_amount_usd || 0);
      });

      // ── TITLE REQUESTS ────────────────────────────────────
      const trStatusMap = new Map<string, number>();
      const trProvMap = new Map<string, number>();
      const trTypeMap = new Map<string, number>();
      const trSectionMap = new Map<string, number>();
      const trPayMap = new Map<string, number>();
      let trTotalAmount = 0;
      titleReqs.forEach((r: any) => {
        if (r.status) incMap(trStatusMap, r.status);
        if (r.province) incMap(trProvMap, r.province);
        if (r.request_type) incMap(trTypeMap, r.request_type);
        if (r.section_type) incMap(trSectionMap, r.section_type);
        if (r.payment_status) incMap(trPayMap, r.payment_status);
        trTotalAmount += (r.total_amount_usd || 0);
      });

      // ── PERMITS ────────────────────────────────────────────
      const permitStatusMap = new Map<string, number>();
      permits.forEach((p: any) => {
        if (p.administrative_status) incMap(permitStatusMap, p.administrative_status);
      });

      // ── CCC CODES ──────────────────────────────────────────
      let cccUsed = 0, cccUnused = 0, cccTotalValue = 0, cccUsedValue = 0;
      cccCodes.forEach((c: any) => {
        if (c.is_used) { cccUsed++; cccUsedValue += (c.value_usd || 0); }
        else cccUnused++;
        cccTotalValue += (c.value_usd || 0);
      });

      // ── REGISTRATION TRENDS ────────────────────────────────
      const registrationTrends = Array.from(regTrendMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([sortKey, count]) => ({ sortKey, month: monthLabel(sortKey), count }));

      // ── TOTALS ─────────────────────────────────────────────
      const totalArea = parcels.reduce((s: number, p: any) => s + (p.area_sqm || 0), 0);
      const withGps = parcels.filter((p: any) => p.gps_coordinates).length;
      const totalRevenue = invoices.reduce((s: number, i: any) => s + (i.total_amount_usd || 0), 0);
      const totalTaxCollected = taxes.filter((t: any) => t.payment_status === 'paid').reduce((s: number, t: any) => s + (t.amount_usd || 0), 0);

      return {
        parcelsByProvince,
        titleTypes: toDistribution(titleMap),
        usageDistribution: toDistribution(usageMap),
        constructionNatures: toDistribution(natMap),
        constructionTypes: toDistribution(typeMap),
        ownershipStats: {
          byLegalStatus: toDistribution(legalStatusMap),
          byGender: toDistribution(genderMap),
          byLeaseType: toDistribution(leaseMap),
        },
        contributionsByStatus,
        contributionsByProvince,
        contributionTrends,
        invoiceStats,
        monthlyRevenue,
        taxHistory,
        disputeStats: {
          byType: toDistribution(dispTypeMap),
          byStatus: toDistribution(dispStatusMap),
          byNature: toDistribution(dispNatureMap),
          total: disputes.length,
        },
        mortgageStats: {
          byStatus: toDistribution(mortStatusMap),
          byCreditorType: toDistribution(mortCredMap),
          totalAmount: totalMortAmount,
          totalCount: mortgages.length,
        },
        titleRequestStats: {
          byStatus: toDistribution(trStatusMap),
          byProvince: toDistribution(trProvMap),
          byType: toDistribution(trTypeMap),
          bySectionType: toDistribution(trSectionMap),
          byPaymentStatus: toDistribution(trPayMap),
          total: titleReqs.length,
          totalAmount: trTotalAmount,
        },
        permitStats: {
          byStatus: toDistribution(permitStatusMap),
          total: permits.length,
        },
        cccCodeStats: {
          total: cccCodes.length,
          used: cccUsed,
          unused: cccUnused,
          totalValue: cccTotalValue,
          usedValue: cccUsedValue,
        },
        registrationTrends,
        totals: {
          totalParcels: parcels.length,
          totalProvinces: provinceMap.size,
          totalContributions: contributions.length,
          totalInvoices: invoices.length,
          totalRevenue,
          totalTaxCollected,
          avgArea: parcels.length > 0 ? Math.round(totalArea / parcels.length) : 0,
          withGps,
          totalDisputes: disputes.length,
          totalMortgages: mortgages.length,
          totalTitleRequests: titleReqs.length,
          totalPermits: permits.length,
        },
      };
    },
  });
};

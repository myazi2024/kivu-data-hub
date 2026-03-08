import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ParcelsByProvince {
  province: string;
  count: number;
  avgArea: number;
  suCount: number;
  srCount: number;
  withGps: number;
}

export interface TitleTypeDistribution {
  type: string;
  count: number;
}

export interface UsageDistribution {
  usage: string;
  count: number;
}

export interface ConstructionNatureDistribution {
  nature: string;
  count: number;
}

export interface ConstructionTypeDistribution {
  type: string;
  count: number;
}

export interface ContributionStats {
  province: string;
  status: string;
  count: number;
}

export interface InvoiceStats {
  status: string;
  count: number;
  revenue: number;
}

export interface TaxHistoryStats {
  year: number;
  status: string;
  count: number;
  total: number;
}

export interface RegistrationTrend {
  month: string;
  count: number;
}

export interface LandDataAnalytics {
  parcelsByProvince: ParcelsByProvince[];
  titleTypes: TitleTypeDistribution[];
  usageDistribution: UsageDistribution[];
  constructionNatures: ConstructionNatureDistribution[];
  constructionTypes: ConstructionTypeDistribution[];
  contributionStats: ContributionStats[];
  invoiceStats: InvoiceStats[];
  taxHistory: TaxHistoryStats[];
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
  };
}

export const useLandDataAnalytics = () => {
  return useQuery({
    queryKey: ['land-data-analytics'],
    queryFn: async (): Promise<LandDataAnalytics> => {
      // Run all queries in parallel
      const [
        parcelsRes,
        titleTypesRes,
        usageRes,
        constructionNatRes,
        constructionTypeRes,
        contributionsRes,
        invoicesRes,
        taxRes,
        trendsRes,
        totalsRes,
      ] = await Promise.all([
        // Parcels by province
        supabase.rpc('get_parcels_by_province' as any).then(r => r).catch(() => ({ data: null })),
        // Fallback: direct queries
        supabase.from('cadastral_parcels').select('province, parcel_type, area_sqm, gps_coordinates').is('deleted_at', null),
        supabase.from('cadastral_parcels').select('declared_usage').is('deleted_at', null).not('declared_usage', 'is', null),
        supabase.from('cadastral_parcels').select('construction_nature').is('deleted_at', null).not('construction_nature', 'is', null),
        supabase.from('cadastral_parcels').select('construction_type').is('deleted_at', null).not('construction_type', 'is', null),
        supabase.from('cadastral_contributions').select('province, status'),
        supabase.from('cadastral_invoices').select('status, total_amount_usd'),
        supabase.from('cadastral_tax_history').select('tax_year, payment_status, amount_usd'),
        supabase.from('cadastral_parcels').select('created_at, province').is('deleted_at', null),
        supabase.from('cadastral_parcels').select('property_title_type').is('deleted_at', null),
      ]);

      // Process parcels by province
      const parcelsData = titleTypesRes.data || [];
      const provinceMap = new Map<string, ParcelsByProvince>();
      parcelsData.forEach((p: any) => {
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
      });
      const parcelsByProvince = Array.from(provinceMap.values()).map(p => ({
        ...p,
        avgArea: p.count > 0 ? Math.round(p.avgArea / p.count) : 0
      })).sort((a, b) => b.count - a.count);

      // Process title types
      const titleData = totalsRes.data || [];
      const titleMap = new Map<string, number>();
      titleData.forEach((t: any) => {
        const type = t.property_title_type || 'Non spécifié';
        titleMap.set(type, (titleMap.get(type) || 0) + 1);
      });
      const titleTypes = Array.from(titleMap.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);

      // Process usage
      const usageData = usageRes.data || [];
      const usageMap = new Map<string, number>();
      usageData.forEach((u: any) => {
        const usage = u.declared_usage || 'Non spécifié';
        usageMap.set(usage, (usageMap.get(usage) || 0) + 1);
      });
      const usageDistribution = Array.from(usageMap.entries()).map(([usage, count]) => ({ usage, count })).sort((a, b) => b.count - a.count);

      // Process construction nature
      const natData = constructionNatRes.data || [];
      const natMap = new Map<string, number>();
      natData.forEach((n: any) => {
        const nature = n.construction_nature || 'Non spécifié';
        natMap.set(nature, (natMap.get(nature) || 0) + 1);
      });
      const constructionNatures = Array.from(natMap.entries()).map(([nature, count]) => ({ nature, count })).sort((a, b) => b.count - a.count);

      // Process construction type
      const typeData = constructionTypeRes.data || [];
      const typeMap = new Map<string, number>();
      typeData.forEach((t: any) => {
        const type = t.construction_type || 'Non spécifié';
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      });
      const constructionTypes = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);

      // Process contributions
      const contribData = contributionsRes.data || [];
      const contribMap = new Map<string, ContributionStats>();
      contribData.forEach((c: any) => {
        const key = `${c.province || 'Non spécifié'}-${c.status}`;
        if (!contribMap.has(key)) {
          contribMap.set(key, { province: c.province || 'Non spécifié', status: c.status, count: 0 });
        }
        contribMap.get(key)!.count++;
      });
      const contributionStats = Array.from(contribMap.values());

      // Process invoices
      const invData = invoicesRes.data || [];
      const invMap = new Map<string, InvoiceStats>();
      invData.forEach((i: any) => {
        const status = i.status || 'unknown';
        if (!invMap.has(status)) {
          invMap.set(status, { status, count: 0, revenue: 0 });
        }
        const entry = invMap.get(status)!;
        entry.count++;
        entry.revenue += (i.total_amount_usd || 0);
      });
      const invoiceStats = Array.from(invMap.values());

      // Process tax history
      const taxData = taxRes.data || [];
      const taxMap = new Map<string, TaxHistoryStats>();
      taxData.forEach((t: any) => {
        const key = `${t.tax_year}-${t.payment_status}`;
        if (!taxMap.has(key)) {
          taxMap.set(key, { year: t.tax_year, status: t.payment_status, count: 0, total: 0 });
        }
        const entry = taxMap.get(key)!;
        entry.count++;
        entry.total += (t.amount_usd || 0);
      });
      const taxHistory = Array.from(taxMap.values()).sort((a, b) => a.year - b.year);

      // Process registration trends
      const trendData = trendsRes.data || [];
      const trendMap = new Map<string, number>();
      trendData.forEach((t: any) => {
        const month = new Date(t.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' });
        trendMap.set(month, (trendMap.get(month) || 0) + 1);
      });
      const registrationTrends = Array.from(trendMap.entries()).map(([month, count]) => ({ month, count }));

      // Totals
      const totalParcels = parcelsData.length;
      const totalProvinces = provinceMap.size;
      const totalContributions = contribData.length;
      const totalInvoices = invData.length;
      const totalRevenue = invData.reduce((s: number, i: any) => s + (i.total_amount_usd || 0), 0);
      const totalTaxCollected = taxData.filter((t: any) => t.payment_status === 'paid').reduce((s: number, t: any) => s + (t.amount_usd || 0), 0);
      const avgArea = totalParcels > 0 ? Math.round(parcelsData.reduce((s: number, p: any) => s + (p.area_sqm || 0), 0) / totalParcels) : 0;
      const withGps = parcelsData.filter((p: any) => p.gps_coordinates).length;

      return {
        parcelsByProvince,
        titleTypes,
        usageDistribution,
        constructionNatures,
        constructionTypes,
        contributionStats,
        invoiceStats,
        taxHistory,
        registrationTrends,
        totals: {
          totalParcels,
          totalProvinces,
          totalContributions,
          totalInvoices,
          totalRevenue,
          totalTaxCollected,
          avgArea,
          withGps,
        },
      };
    },
  });
};

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
      // Single parcels query instead of 4 redundant ones
      const [
        parcelsRes,
        contributionsRes,
        invoicesRes,
        taxRes,
      ] = await Promise.all([
        supabase.from('cadastral_parcels')
          .select('province, parcel_type, area_sqm, gps_coordinates, created_at, property_title_type, declared_usage, construction_nature, construction_type')
          .is('deleted_at', null),
        supabase.from('cadastral_contributions').select('province, status'),
        supabase.from('cadastral_invoices').select('status, total_amount_usd'),
        supabase.from('cadastral_tax_history').select('tax_year, payment_status, amount_usd'),
      ]);

      const parcelsData = parcelsRes.data || [];

      // Process parcels by province
      const provinceMap = new Map<string, ParcelsByProvince>();
      const titleMap = new Map<string, number>();
      const usageMap = new Map<string, number>();
      const natMap = new Map<string, number>();
      const typeMap = new Map<string, number>();
      const trendMap = new Map<string, number>();

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

        // Title types
        const titleType = p.property_title_type || 'Non spécifié';
        titleMap.set(titleType, (titleMap.get(titleType) || 0) + 1);

        // Usage
        if (p.declared_usage) {
          usageMap.set(p.declared_usage, (usageMap.get(p.declared_usage) || 0) + 1);
        }

        // Construction nature
        if (p.construction_nature) {
          natMap.set(p.construction_nature, (natMap.get(p.construction_nature) || 0) + 1);
        }

        // Construction type
        if (p.construction_type) {
          typeMap.set(p.construction_type, (typeMap.get(p.construction_type) || 0) + 1);
        }

        // Registration trends - use sortable YYYY-MM key
        if (p.created_at) {
          const d = new Date(p.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          trendMap.set(key, (trendMap.get(key) || 0) + 1);
        }
      });

      const parcelsByProvince = Array.from(provinceMap.values())
        .map(p => ({ ...p, avgArea: p.count > 0 ? Math.round(p.avgArea / p.count) : 0 }))
        .sort((a, b) => b.count - a.count);

      const titleTypes = Array.from(titleMap.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      const usageDistribution = Array.from(usageMap.entries())
        .map(([usage, count]) => ({ usage, count }))
        .sort((a, b) => b.count - a.count);

      const constructionNatures = Array.from(natMap.entries())
        .map(([nature, count]) => ({ nature, count }))
        .sort((a, b) => b.count - a.count);

      const constructionTypes = Array.from(typeMap.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      // Registration trends - sorted chronologically with readable labels
      const registrationTrends = Array.from(trendMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, count]) => {
          const [year, month] = key.split('-');
          const d = new Date(parseInt(year), parseInt(month) - 1);
          return { month: d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' }), count };
        });

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
        const e = invMap.get(status)!;
        e.count++;
        e.revenue += (i.total_amount_usd || 0);
      });
      const invoiceStats = Array.from(invMap.values());

      // Process tax history
      const taxData = taxRes.data || [];
      const taxMap2 = new Map<string, TaxHistoryStats>();
      taxData.forEach((t: any) => {
        const key = `${t.tax_year}-${t.payment_status}`;
        if (!taxMap2.has(key)) {
          taxMap2.set(key, { year: t.tax_year, status: t.payment_status, count: 0, total: 0 });
        }
        const e = taxMap2.get(key)!;
        e.count++;
        e.total += (t.amount_usd || 0);
      });
      const taxHistory = Array.from(taxMap2.values()).sort((a, b) => a.year - b.year);

      // Totals
      const totalParcels = parcelsData.length;
      const totalRevenue = invData.reduce((s: number, i: any) => s + (i.total_amount_usd || 0), 0);
      const totalTaxCollected = taxData.filter((t: any) => t.payment_status === 'paid').reduce((s: number, t: any) => s + (t.amount_usd || 0), 0);
      const totalArea = parcelsData.reduce((s: number, p: any) => s + (p.area_sqm || 0), 0);
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
          totalProvinces: provinceMap.size,
          totalContributions: contribData.length,
          totalInvoices: invData.length,
          totalRevenue,
          totalTaxCollected,
          avgArea: totalParcels > 0 ? Math.round(totalArea / totalParcels) : 0,
          withGps,
        },
      };
    },
  });
};

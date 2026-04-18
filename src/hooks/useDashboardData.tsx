import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { subDays } from 'date-fns';

interface DashboardData {
  // Advanced Metrics
  conversionRate: number;
  avgProcessingTime: number;
  avgTransactionValue: number;
  cccUsageRate: number;
  revenuePerReseller: number;
  activeResellers: number;

  // Alerts
  overdueContributions: number;
  failedPayments: number;
  blockedUsers: number;
  expiredCodes: number;
  inactiveResellers: number;
  pendingDisputes: number;
  pendingMortgages: number;

  // Recent Activity
  recentActivities: Array<{
    id: string;
    type: 'contribution' | 'payment' | 'registration';
    description: string;
    timestamp: Date;
    status?: string;
    amount?: number;
    user?: string;
  }>;

  // Top Performers
  topResellers: Array<{
    id: string;
    name: string;
    value: number;
    subtitle?: string;
    rank: number;
  }>;
  topUsers: Array<{
    id: string;
    name: string;
    value: number;
    subtitle?: string;
    rank: number;
  }>;
  topZones: Array<{
    id: string;
    name: string;
    value: number;
    subtitle?: string;
    rank: number;
  }>;
}

const TEST_FILTER = (q: any, excludeTest: boolean) =>
  excludeTest ? q.not('parcel_number', 'ilike', 'TEST-%') : q;

export const useDashboardData = (startDate?: Date, endDate?: Date, excludeTest: boolean = true) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData>({
    conversionRate: 0,
    avgProcessingTime: 0,
    avgTransactionValue: 0,
    cccUsageRate: 0,
    revenuePerReseller: 0,
    activeResellers: 0,
    overdueContributions: 0,
    failedPayments: 0,
    blockedUsers: 0,
    expiredCodes: 0,
    inactiveResellers: 0,
    pendingDisputes: 0,
    pendingMortgages: 0,
    recentActivities: [],
    topResellers: [],
    topUsers: [],
    topZones: [],
  });
  const { toast } = useToast();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const start = startDate || subDays(new Date(), 29);
      const end = endDate || new Date();

      // Fetch all data in parallel (with TEST exclusion)
      const [
        invoicesData,
        contributionsData,
        cccCodesData,
        resellersData,
        profilesData,
        recentContributions,
        recentPayments,
        recentUsers,
      ] = await Promise.all([
        TEST_FILTER(supabase
          .from('cadastral_invoices')
          .select('*')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString()), excludeTest),
        TEST_FILTER(supabase
          .from('cadastral_contributions')
          .select('*')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString()), excludeTest),
        TEST_FILTER(supabase
          .from('cadastral_contributor_codes')
          .select('*')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString()), excludeTest),
        supabase
          .from('reseller_sales')
          .select('*, resellers(*)')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString()),
        supabase
          .from('profiles')
          .select('*')
          .eq('is_blocked', true),
        TEST_FILTER(supabase
          .from('cadastral_contributions')
          .select('*, profiles(full_name, email)')
          .order('created_at', { ascending: false })
          .limit(10), excludeTest),
        TEST_FILTER(supabase
          .from('cadastral_invoices')
          .select('*, profiles(full_name, email)')
          .eq('status', 'paid')
          .order('created_at', { ascending: false })
          .limit(10), excludeTest),
        supabase
          .from('profiles')
          .select('*')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      // Calculate advanced metrics
      const totalInvoices = invoicesData.data?.length || 0;
      const paidInvoices = invoicesData.data?.filter(i => i.status === 'paid').length || 0;
      const conversionRate = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;

      const contributions = contributionsData.data || [];
      const reviewedContributions = contributions.filter(c => c.reviewed_at);
      const avgProcessingTime = reviewedContributions.length > 0
        ? reviewedContributions.reduce((acc, c) => {
            const created = new Date(c.created_at);
            const reviewed = new Date(c.reviewed_at!);
            return acc + (reviewed.getTime() - created.getTime()) / (1000 * 60 * 60);
          }, 0) / reviewedContributions.length
        : 0;

      const totalRevenue = invoicesData.data?.reduce((acc, i) => acc + (Number(i.total_amount_usd) || 0), 0) || 0;
      const avgTransactionValue = paidInvoices > 0 ? totalRevenue / paidInvoices : 0;

      const totalCodes = cccCodesData.data?.length || 0;
      const usedCodes = cccCodesData.data?.filter(c => c.is_used).length || 0;
      const cccUsageRate = totalCodes > 0 ? (usedCodes / totalCodes) * 100 : 0;

      const resellerSales = resellersData.data || [];
      const uniqueResellers = new Set(resellerSales.map(s => s.reseller_id)).size;
      const revenuePerReseller = uniqueResellers > 0 ? totalRevenue / uniqueResellers : 0;

      // Calculate alerts
      const now = new Date();
      const sevenDaysAgo = subDays(now, 7);
      const overdueContributions = contributions.filter(
        c => c.status === 'pending' && new Date(c.created_at) < sevenDaysAgo
      ).length;

      const failedPayments = invoicesData.data?.filter(i => i.status === 'failed').length || 0;
      const blockedUsers = profilesData.data?.length || 0;
      
      const expiredCodes = cccCodesData.data?.filter(c => 
        !c.is_used && new Date(c.expires_at) < now
      ).length || 0;

      // Inactive resellers: count distinct active resellers with no recent sale
      const thirtyDaysAgo = subDays(now, 30);
      const [recentSellersRes, allActiveRes] = await Promise.all([
        supabase
          .from('reseller_sales')
          .select('reseller_id')
          .gte('created_at', thirtyDaysAgo.toISOString()),
        supabase.from('resellers').select('id').eq('is_active', true),
      ]);
      const activeRecentIds = new Set((recentSellersRes.data || []).map((s: any) => s.reseller_id));
      const inactiveResellersCount =
        (allActiveRes.data || []).filter((r: any) => !activeRecentIds.has(r.id)).length;

      // Fetch pending disputes and mortgages
      const [disputesResult, mortgagesResult] = await Promise.all([
        supabase
          .from('cadastral_land_disputes')
          .select('*', { count: 'exact', head: true })
          .in('current_status', ['pending', 'under_investigation']),
        supabase
          .from('cadastral_mortgages')
          .select('*', { count: 'exact', head: true })
          .eq('mortgage_status', 'pending'),
      ]);

      const pendingDisputes = disputesResult.count || 0;
      const pendingMortgages = mortgagesResult.count || 0;

      // Prepare recent activities
      const activities = [
        ...recentContributions.data?.map(c => ({
          id: c.id,
          type: 'contribution' as const,
          description: `Contribution pour parcelle ${c.parcel_number}`,
          timestamp: new Date(c.created_at),
          status: c.status,
          user: (c.profiles as any)?.full_name || (c.profiles as any)?.email,
        })) || [],
        ...recentPayments.data?.map(p => ({
          id: p.id,
          type: 'payment' as const,
          description: `Paiement pour parcelle ${p.parcel_number}`,
          timestamp: new Date(p.created_at),
          amount: Number(p.total_amount_usd),
          user: (p.profiles as any)?.full_name || (p.profiles as any)?.email,
        })) || [],
        ...recentUsers.data?.map(u => ({
          id: u.id,
          type: 'registration' as const,
          description: `Nouvel utilisateur: ${u.full_name || u.email}`,
          timestamp: new Date(u.created_at),
          user: u.full_name || u.email,
        })) || [],
      ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);

      // Calculate top performers
      const resellerPerformance = new Map<string, { name: string; total: number }>();
      resellerSales.forEach(sale => {
        const reseller = (sale.resellers as any);
        const current = resellerPerformance.get(sale.reseller_id) || { name: reseller?.business_name || 'N/A', total: 0 };
        current.total += Number(sale.sale_amount_usd) || 0;
        resellerPerformance.set(sale.reseller_id, current);
      });

      const topResellers = Array.from(resellerPerformance.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5)
        .map(([id, data], index) => ({
          id,
          name: data.name,
          value: data.total,
          rank: index + 1,
        }));

      // Top users by spending — mask email for PII
      const maskEmail = (e?: string) => e ? e.replace(/^(.).*@(.+)$/, '$1***@$2') : 'Anonyme';
      const userSpending = new Map<string, { name: string; total: number }>();
      invoicesData.data?.forEach(invoice => {
        if (invoice.user_id && invoice.status === 'paid') {
          const displayName = invoice.client_name || maskEmail(invoice.client_email);
          const current = userSpending.get(invoice.user_id) || { name: displayName, total: 0 };
          current.total += Number(invoice.total_amount_usd) || 0;
          userSpending.set(invoice.user_id, current);
        }
      });

      const topUsers = Array.from(userSpending.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5)
        .map(([id, data], index) => ({
          id,
          name: data.name,
          value: data.total,
          rank: index + 1,
        }));

      // Top zones by activity
      const zoneActivity = new Map<string, number>();
      contributions.forEach(c => {
        if (c.province) {
          zoneActivity.set(c.province, (zoneActivity.get(c.province) || 0) + 1);
        }
      });

      const topZones = Array.from(zoneActivity.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count], index) => ({
          id: name,
          name,
          value: count,
          subtitle: `${count} contributions`,
          rank: index + 1,
        }));

      setData({
        conversionRate,
        avgProcessingTime,
        avgTransactionValue,
        cccUsageRate,
        revenuePerReseller,
        activeResellers: uniqueResellers,
        overdueContributions,
        failedPayments,
        blockedUsers,
        expiredCodes,
        inactiveResellers: inactiveResellersCount,
        pendingDisputes,
        pendingMortgages,
        recentActivities: activities,
        topResellers,
        topUsers,
        topZones,
      });

    } catch (error: any) {
      console.error('Erreur lors du chargement des données:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du dashboard",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate, excludeTest]);

  return {
    loading,
    data,
    refetch: fetchDashboardData,
  };
};

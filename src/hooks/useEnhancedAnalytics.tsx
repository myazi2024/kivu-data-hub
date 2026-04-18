import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

const TEST_FILTER = (q: any, excludeTest: boolean) =>
  excludeTest ? q.not('parcel_number', 'ilike', 'TEST-%') : q;

export const useEnhancedAnalytics = (startDate?: Date, endDate?: Date, excludeTest: boolean = true) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>({
    historicalRevenue: [],
    zonesData: [],
    contributionPerf: {},
    businessMetrics: {},
    resellersAnalysis: [],
    cohortData: [],
    alerts: []
  });

  useEffect(() => {
    fetchEnhancedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate?.toISOString(), endDate?.toISOString(), excludeTest]);

  const fetchEnhancedData = async () => {
    setLoading(true);
    try {
      const start = startDate || subDays(new Date(), 29);
      const end = endDate || new Date();

      // Historical revenue (period only)
      const revenueQ = TEST_FILTER(supabase
        .from('cadastral_invoices')
        .select('total_amount_usd, created_at')
        .eq('status', 'paid')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true }), excludeTest);
      const { data: revenueData } = await revenueQ;
      const historicalRevenue = groupByDate(revenueData || [], 'created_at', 'total_amount_usd');

      // Geographic data (period)
      const geoQ = TEST_FILTER(supabase
        .from('cadastral_invoices')
        .select('geographical_zone, total_amount_usd, created_at')
        .eq('status', 'paid')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString()), excludeTest);
      const { data: geoData } = await geoQ;
      const zonesData = await groupByZone(geoData || [], start, end, excludeTest);

      // Contribution performance (period)
      const contribQ = TEST_FILTER(supabase
        .from('cadastral_contributions')
        .select('status, created_at, reviewed_at, fraud_score')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString()), excludeTest);
      const { data: contributionsData } = await contribQ;
      const contributionPerf = calculateContributionPerformance(contributionsData || []);

      // Business metrics (period)
      const businessMetrics = await calculateBusinessMetrics(start, end, excludeTest);

      // Reseller data (period)
      const { data: resellerData } = await supabase
        .from('reseller_sales')
        .select('*, reseller:resellers(business_name)')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
      const resellersAnalysis = await groupResellerData(resellerData || []);

      // Cohort data (period)
      const cohortData = await generateCohortData(start, end, excludeTest);

      const alerts = generateSmartAlerts(contributionPerf, zonesData, historicalRevenue);

      setData({
        historicalRevenue, zonesData, contributionPerf, businessMetrics,
        resellersAnalysis, cohortData, alerts
      });
    } catch (error) {
      console.error('Error fetching enhanced analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return { loading, data, refetch: fetchEnhancedData };
};

// Helpers
function groupByDate(data: any[], dateField: string, valueField: string) {
  const grouped: Record<string, number> = {};
  data.forEach(item => {
    const date = new Date(item[dateField]).toISOString().split('T')[0];
    grouped[date] = (grouped[date] || 0) + parseFloat(item[valueField] || 0);
  });
  return Object.entries(grouped).map(([date, revenue]) => ({ date, revenue }));
}

async function groupByZone(data: any[], start: Date, end: Date, excludeTest: boolean) {
  const grouped: Record<string, { revenue: number; transactions: number; previousRevenue: number }> = {};
  const periodMs = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - periodMs);
  const prevEnd = new Date(start.getTime());

  data.forEach(item => {
    const zone = item.geographical_zone || 'Non spécifié';
    if (!grouped[zone]) grouped[zone] = { revenue: 0, transactions: 0, previousRevenue: 0 };
    grouped[zone].revenue += parseFloat(item.total_amount_usd || 0);
    grouped[zone].transactions += 1;
  });

  try {
    const prevQ = TEST_FILTER(supabase
      .from('cadastral_invoices')
      .select('geographical_zone, total_amount_usd')
      .eq('status', 'paid')
      .gte('created_at', prevStart.toISOString())
      .lt('created_at', prevEnd.toISOString()), excludeTest);
    const { data: previousData } = await prevQ;
    previousData?.forEach((item: any) => {
      const zone = item.geographical_zone || 'Non spécifié';
      if (grouped[zone]) grouped[zone].previousRevenue += parseFloat(String(item.total_amount_usd || 0));
    });
  } catch (e) { console.error(e); }

  return Object.entries(grouped).map(([zone, stats]) => {
    const growth = stats.previousRevenue > 0
      ? ((stats.revenue - stats.previousRevenue) / stats.previousRevenue) * 100 : 0;
    return { zone, revenue: stats.revenue, transactions: stats.transactions, growth: parseFloat(growth.toFixed(1)) };
  });
}

function calculateContributionPerformance(data: any[]) {
  const approved = data.filter(c => c.status === 'approved');
  const rejected = data.filter(c => c.status === 'rejected');
  const suspicious = data.filter(c => c.fraud_score && c.fraud_score > 50);
  const validatedContribs = data.filter(c => c.reviewed_at);
  const avgTime = validatedContribs.length > 0
    ? validatedContribs.reduce((sum, c) => {
        const created = new Date(c.created_at).getTime();
        const reviewed = new Date(c.reviewed_at).getTime();
        return sum + (reviewed - created) / (1000 * 60 * 60);
      }, 0) / validatedContribs.length
    : 0;
  const total = data.length || 1;
  return {
    avgValidationTime: avgTime,
    approvalRate: (approved.length / total) * 100,
    rejectionRate: (rejected.length / total) * 100,
    fraudRate: (suspicious.length / total) * 100,
    validationTrend: generateTrendData(validatedContribs),
    statusDistribution: [
      { status: 'approved', count: approved.length },
      { status: 'rejected', count: rejected.length },
      { status: 'pending', count: data.filter(c => c.status === 'pending').length },
      { status: 'suspicious', count: suspicious.length }
    ]
  };
}

function generateTrendData(data: any[]) {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });
  const dailyData: Record<string, { total: number; count: number }> = {};
  data.forEach(contrib => {
    const reviewedDate = new Date(contrib.reviewed_at).toISOString().split('T')[0];
    if (last7Days.includes(reviewedDate)) {
      const created = new Date(contrib.created_at).getTime();
      const reviewed = new Date(contrib.reviewed_at).getTime();
      const hours = (reviewed - created) / (1000 * 60 * 60);
      if (!dailyData[reviewedDate]) dailyData[reviewedDate] = { total: 0, count: 0 };
      dailyData[reviewedDate].total += hours;
      dailyData[reviewedDate].count += 1;
    }
  });
  return last7Days.map(date => ({
    date,
    avgTime: dailyData[date] ? dailyData[date].total / dailyData[date].count : 0
  }));
}

async function calculateBusinessMetrics(start: Date, end: Date, excludeTest: boolean) {
  const q = TEST_FILTER(supabase
    .from('cadastral_invoices')
    .select('total_amount_usd, user_id, created_at')
    .eq('status', 'paid')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString()), excludeTest);
  const { data: invoices } = await q;

  const totalRevenue = invoices?.reduce((s: number, i: any) => s + parseFloat(String(i.total_amount_usd || '0')), 0) || 0;
  const uniqueUsers = new Set(invoices?.map((i: any) => i.user_id).filter(Boolean)).size;
  const ltv = uniqueUsers > 0 ? totalRevenue / uniqueUsers : 0;

  // Retention: users active in 1st half vs 2nd half of period
  const periodMs = end.getTime() - start.getTime();
  const mid = new Date(start.getTime() + periodMs / 2);

  const oldQ = TEST_FILTER(supabase
    .from('cadastral_invoices')
    .select('user_id')
    .eq('status', 'paid')
    .gte('created_at', start.toISOString())
    .lt('created_at', mid.toISOString()), excludeTest);
  const recentQ = TEST_FILTER(supabase
    .from('cadastral_invoices')
    .select('user_id')
    .eq('status', 'paid')
    .gte('created_at', mid.toISOString())
    .lte('created_at', end.toISOString()), excludeTest);
  const [{ data: oldUsers }, { data: recentUsers }] = await Promise.all([oldQ, recentQ]);

  const oldIds = new Set((oldUsers || []).map((u: any) => u.user_id).filter(Boolean));
  const returned = (recentUsers || []).filter((u: any) => oldIds.has(u.user_id)).length;
  const retentionRate = oldIds.size > 0 ? (returned / oldIds.size) * 100 : 0;

  return {
    ltv: parseFloat(ltv.toFixed(2)),
    retentionRate: parseFloat(retentionRate.toFixed(1)),
    churnRate: parseFloat((100 - retentionRate).toFixed(1)),
    arpu: parseFloat(ltv.toFixed(2)),
  };
}

async function groupResellerData(data: any[]) {
  const grouped: Record<string, any> = {};
  data.forEach(sale => {
    const id = sale.reseller_id;
    if (!grouped[id]) {
      grouped[id] = {
        id, name: sale.reseller?.business_name || 'Revendeur inconnu',
        totalSales: 0, salesCount: 0, commissionEarned: 0,
        totalCodeUsage: 0, activeCodesCount: 0
      };
    }
    grouped[id].totalSales += parseFloat(sale.sale_amount_usd || 0);
    grouped[id].salesCount += 1;
    grouped[id].commissionEarned += parseFloat(sale.commission_earned_usd || 0);
  });
  try {
    const { data: codesData } = await supabase
      .from('discount_codes')
      .select('reseller_id, is_active, usage_count, max_usage');
    codesData?.forEach((code: any) => {
      if (grouped[code.reseller_id]) {
        if (code.is_active) grouped[code.reseller_id].activeCodesCount += 1;
        grouped[code.reseller_id].totalCodeUsage += code.usage_count;
      }
    });
  } catch (e) { console.error(e); }
  return Object.values(grouped).map((r: any) => ({
    ...r,
    conversionRate: r.activeCodesCount > 0 && r.totalCodeUsage > 0
      ? parseFloat(((r.salesCount / r.totalCodeUsage) * 100).toFixed(1)) : 0,
  }));
}

async function generateCohortData(start: Date, end: Date, excludeTest: boolean) {
  try {
    const q = TEST_FILTER(supabase
      .from('cadastral_invoices')
      .select('user_id, created_at')
      .eq('status', 'paid')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at'), excludeTest);
    const { data: invoices } = await q;
    if (!invoices) return [];

    const userCohorts: Record<string, string> = {};
    invoices.forEach((inv: any) => {
      if (inv.user_id && !userCohorts[inv.user_id]) {
        const d = new Date(inv.created_at);
        userCohorts[inv.user_id] = d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      }
    });
    const cohorts = Array.from(new Set(Object.values(userCohorts))).slice(-4);
    return Promise.all(cohorts.map(async (cohort) => {
      const cohortUsers = Object.entries(userCohorts).filter(([_, c]) => c === cohort).map(([u]) => u);
      const cohortStart = new Date(cohort);
      const retention = await Promise.all(
        [{ period: 'Semaine 1', days: 7 }, { period: 'Semaine 2', days: 14 },
         { period: 'Semaine 3', days: 21 }, { period: 'Semaine 4', days: 28 },
         { period: 'Mois 2', days: 60 }].map(async ({ period, days }) => {
          const endD = new Date(cohortStart);
          endD.setDate(endD.getDate() + days);
          const { data: active } = await supabase
            .from('cadastral_invoices')
            .select('user_id')
            .eq('status', 'paid')
            .in('user_id', cohortUsers)
            .gte('created_at', cohortStart.toISOString())
            .lte('created_at', endD.toISOString());
          const unique = new Set((active || []).map((u: any) => u.user_id)).size;
          return { period, rate: cohortUsers.length > 0 ? parseFloat(((unique / cohortUsers.length) * 100).toFixed(1)) : 0 };
        })
      );
      return { cohort, users: cohortUsers.length, retention };
    }));
  } catch (e) { console.error(e); return []; }
}

function generateSmartAlerts(contributionPerf: any, zonesData: any[], historicalRevenue: any[]) {
  const alerts: any[] = [];
  if (contributionPerf.fraudRate > 5) {
    alerts.push({ id: 'fraud-alert', type: 'critical' as const,
      title: 'Taux de fraude élevé',
      message: `${contributionPerf.fraudRate.toFixed(1)}% de fraudes détectées. Action requise.`,
      timestamp: new Date().toISOString(), actionUrl: '/admin?tab=fraud-detection' });
  }
  if (contributionPerf.avgValidationTime > 48) {
    alerts.push({ id: 'validation-delay', type: 'warning' as const,
      title: 'Délai de validation élevé',
      message: `Temps moyen: ${contributionPerf.avgValidationTime.toFixed(1)}h. Optimisation recommandée.`,
      timestamp: new Date().toISOString(), actionUrl: '/admin?tab=validation' });
  }
  if (historicalRevenue.length > 7) {
    const lastWeek = historicalRevenue.slice(-7).reduce((s, d) => s + d.revenue, 0);
    const prevWeek = historicalRevenue.slice(-14, -7).reduce((s, d) => s + d.revenue, 0);
    if (lastWeek < prevWeek * 0.85 && prevWeek > 0) {
      alerts.push({ id: 'revenue-drop', type: 'critical' as const,
        title: 'Baisse importante des revenus',
        message: `-${(((prevWeek - lastWeek) / prevWeek) * 100).toFixed(1)}% cette semaine`,
        timestamp: new Date().toISOString() });
    }
  }
  return alerts;
}

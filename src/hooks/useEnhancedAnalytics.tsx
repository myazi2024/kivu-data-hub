import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useEnhancedAnalytics = (startDate?: Date, endDate?: Date) => {
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
  }, [startDate, endDate]);

  const fetchEnhancedData = async () => {
    setLoading(true);
    try {
      // Fetch historical revenue for predictions
      const { data: revenueData } = await supabase
        .from('cadastral_invoices')
        .select('total_amount_usd, created_at')
        .eq('status', 'paid')
        .not('parcel_number', 'ilike', 'TEST-%')
        .order('created_at', { ascending: true });

      const historicalRevenue = groupByDate(revenueData || [], 'created_at', 'total_amount_usd');

      // Fetch geographical data
      const { data: geoData } = await supabase
        .from('cadastral_invoices')
        .select('geographical_zone, total_amount_usd, created_at')
        .eq('status', 'paid')
        .not('parcel_number', 'ilike', 'TEST-%');

      const zonesData = await groupByZone(geoData || []);

      // Fetch contribution performance
      const { data: contributionsData } = await supabase
        .from('cadastral_contributions')
        .select('status, created_at, reviewed_at, fraud_score')
        .not('parcel_number', 'ilike', 'TEST-%');

      const contributionPerf = calculateContributionPerformance(contributionsData || []);

      // Fetch business metrics
      const businessMetrics = await calculateBusinessMetrics();

      // Fetch reseller data
      const { data: resellerData } = await supabase
        .from('reseller_sales')
        .select(`
          *,
          reseller:resellers(business_name)
        `);

      const resellersAnalysis = groupResellerData(resellerData || []);

      // Generate cohort data
      const cohortData = await generateCohortData();

      // Generate smart alerts
      const alerts = generateSmartAlerts(contributionPerf, zonesData, historicalRevenue);

      setData({
        historicalRevenue,
        zonesData,
        contributionPerf,
        businessMetrics,
        resellersAnalysis,
        cohortData,
        alerts
      });
    } catch (error) {
      console.error('Error fetching enhanced analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return { loading, data, refetch: fetchEnhancedData };
};

// Helper functions
function groupByDate(data: any[], dateField: string, valueField: string) {
  const grouped: { [key: string]: number } = {};
  data.forEach(item => {
    const date = new Date(item[dateField]).toISOString().split('T')[0];
    grouped[date] = (grouped[date] || 0) + parseFloat(item[valueField] || 0);
  });
  return Object.entries(grouped).map(([date, revenue]) => ({ date, revenue }));
}

async function groupByZone(data: any[]) {
  const grouped: { [key: string]: { revenue: number; transactions: number; previousRevenue: number } } = {};
  
  // Get data from 60 days ago for growth calculation
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Current period data
  data.forEach(item => {
    const zone = item.geographical_zone || 'Non spécifié';
    if (!grouped[zone]) {
      grouped[zone] = { revenue: 0, transactions: 0, previousRevenue: 0 };
    }
    grouped[zone].revenue += parseFloat(item.total_amount_usd || 0);
    grouped[zone].transactions += 1;
  });

  // Fetch previous period data for growth calculation
  try {
    const { data: previousData } = await supabase
      .from('cadastral_invoices')
      .select('geographical_zone, total_amount_usd')
      .eq('status', 'paid')
      .not('parcel_number', 'ilike', 'TEST-%')
      .gte('created_at', sixtyDaysAgo.toISOString())
      .lt('created_at', thirtyDaysAgo.toISOString());

    previousData?.forEach(item => {
      const zone = item.geographical_zone || 'Non spécifié';
      if (grouped[zone]) {
        grouped[zone].previousRevenue += parseFloat(String(item.total_amount_usd || 0));
      }
    });
  } catch (error) {
    console.error('Error fetching previous period data:', error);
  }

  return Object.entries(grouped).map(([zone, stats]) => {
    const growth = stats.previousRevenue > 0 
      ? ((stats.revenue - stats.previousRevenue) / stats.previousRevenue) * 100 
      : 0;
    
    return {
      zone,
      revenue: stats.revenue,
      transactions: stats.transactions,
      growth: parseFloat(growth.toFixed(1))
    };
  });
}

function calculateContributionPerformance(data: any[]) {
  const approved = data.filter(c => c.status === 'approved');
  const rejected = data.filter(c => c.status === 'rejected');
  const suspicious = data.filter(c => c.fraud_score && c.fraud_score > 50);

  // Calculate avg validation time
  const validatedContribs = data.filter(c => c.reviewed_at);
  const avgTime = validatedContribs.reduce((sum, c) => {
    const created = new Date(c.created_at).getTime();
    const reviewed = new Date(c.reviewed_at).getTime();
    return sum + (reviewed - created) / (1000 * 60 * 60); // Convert to hours
  }, 0) / validatedContribs.length || 0;

  return {
    avgValidationTime: avgTime,
    approvalRate: (approved.length / data.length) * 100 || 0,
    rejectionRate: (rejected.length / data.length) * 100 || 0,
    fraudRate: (suspicious.length / data.length) * 100 || 0,
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

  // Calculate actual average validation times per day
  const dailyData: { [key: string]: { total: number; count: number } } = {};
  
  data.forEach(contrib => {
    const reviewedDate = new Date(contrib.reviewed_at).toISOString().split('T')[0];
    if (last7Days.includes(reviewedDate)) {
      const created = new Date(contrib.created_at).getTime();
      const reviewed = new Date(contrib.reviewed_at).getTime();
      const hours = (reviewed - created) / (1000 * 60 * 60);
      
      if (!dailyData[reviewedDate]) {
        dailyData[reviewedDate] = { total: 0, count: 0 };
      }
      dailyData[reviewedDate].total += hours;
      dailyData[reviewedDate].count += 1;
    }
  });

  return last7Days.map(date => ({
    date,
    avgTime: dailyData[date] ? dailyData[date].total / dailyData[date].count : 0
  }));
}

async function calculateBusinessMetrics() {
  const { data: invoices } = await supabase
    .from('cadastral_invoices')
    .select('total_amount_usd, user_id, created_at')
    .eq('status', 'paid')
    .not('parcel_number', 'ilike', 'TEST-%');

  const totalRevenue = invoices?.reduce((sum, inv) => sum + parseFloat(String(inv.total_amount_usd || '0')), 0) || 0;
  const uniqueUsers = new Set(invoices?.map(inv => inv.user_id).filter(Boolean)).size;

  // Calculate real LTV
  const ltv = uniqueUsers > 0 ? totalRevenue / uniqueUsers : 0;

  // Calculate real retention rate
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  const { data: oldUsers } = await supabase
    .from('cadastral_invoices')
    .select('user_id')
    .eq('status', 'paid')
    .not('parcel_number', 'ilike', 'TEST-%')
    .lt('created_at', twoMonthsAgo.toISOString());

  const { data: recentUsers } = await supabase
    .from('cadastral_invoices')
    .select('user_id')
    .eq('status', 'paid')
    .not('parcel_number', 'ilike', 'TEST-%')
    .gte('created_at', oneMonthAgo.toISOString());

  const oldUserIds = new Set(oldUsers?.map(u => u.user_id).filter(Boolean));
  const returnedUsers = recentUsers?.filter(u => oldUserIds.has(u.user_id)).length || 0;
  const retentionRate = oldUserIds.size > 0 ? (returnedUsers / oldUserIds.size) * 100 : 0;
  const churnRate = 100 - retentionRate;

  // Calculate ARPU (Average Revenue Per User)
  const arpu = uniqueUsers > 0 ? totalRevenue / uniqueUsers : 0;

  return {
    ltv: parseFloat(ltv.toFixed(2)),
    retentionRate: parseFloat(retentionRate.toFixed(1)),
    churnRate: parseFloat(churnRate.toFixed(1)),
    arpu: parseFloat(arpu.toFixed(2)),
  };
}

async function groupResellerData(data: any[]) {
  const grouped: { [key: string]: any } = {};
  
  data.forEach(sale => {
    const resellerId = sale.reseller_id;
    if (!grouped[resellerId]) {
      grouped[resellerId] = {
        id: resellerId,
        name: sale.reseller?.business_name || 'Revendeur inconnu',
        totalSales: 0,
        salesCount: 0,
        commissionEarned: 0,
        totalCodeUsage: 0,
        activeCodesCount: 0
      };
    }
    grouped[resellerId].totalSales += parseFloat(sale.sale_amount_usd || 0);
    grouped[resellerId].salesCount += 1;
    grouped[resellerId].commissionEarned += parseFloat(sale.commission_earned_usd || 0);
  });

  // Fetch real discount codes data for each reseller
  try {
    const { data: codesData } = await supabase
      .from('discount_codes')
      .select('reseller_id, is_active, usage_count, max_usage');

    codesData?.forEach(code => {
      if (grouped[code.reseller_id]) {
        if (code.is_active) {
          grouped[code.reseller_id].activeCodesCount += 1;
        }
        grouped[code.reseller_id].totalCodeUsage += code.usage_count;
      }
    });
  } catch (error) {
    console.error('Error fetching codes data:', error);
  }

  return Object.values(grouped).map((r: any) => {
    const conversionRate = r.activeCodesCount > 0 && r.totalCodeUsage > 0
      ? (r.salesCount / r.totalCodeUsage) * 100
      : 0;
    
    return {
      ...r,
      conversionRate: parseFloat(conversionRate.toFixed(1)),
      activeCodesCount: r.activeCodesCount
    };
  });
}

async function generateCohortData() {
  try {
    // Get users grouped by their first purchase month
    const { data: invoices } = await supabase
      .from('cadastral_invoices')
      .select('user_id, created_at')
      .eq('status', 'paid')
      .order('created_at');

    if (!invoices) return [];

    // Group users by cohort (month of first purchase)
    const userCohorts: { [userId: string]: string } = {};
    invoices.forEach(inv => {
      if (inv.user_id && !userCohorts[inv.user_id]) {
        const date = new Date(inv.created_at);
        userCohorts[inv.user_id] = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      }
    });

    // Get unique cohorts from last 4 months
    const cohortSet = new Set(Object.values(userCohorts));
    const cohorts = Array.from(cohortSet).slice(-4);

    // Calculate retention for each cohort
    const cohortData = await Promise.all(cohorts.map(async (cohort) => {
      const cohortUsers = Object.entries(userCohorts)
        .filter(([_, c]) => c === cohort)
        .map(([userId]) => userId);

      const cohortStartDate = new Date(cohort);
      
      // Calculate retention for different periods
      const retention = await Promise.all([
        { period: 'Semaine 1', days: 7 },
        { period: 'Semaine 2', days: 14 },
        { period: 'Semaine 3', days: 21 },
        { period: 'Semaine 4', days: 28 },
        { period: 'Mois 2', days: 60 }
      ].map(async ({ period, days }) => {
        const endDate = new Date(cohortStartDate);
        endDate.setDate(endDate.getDate() + days);

        const { data: activeUsers } = await supabase
          .from('cadastral_invoices')
          .select('user_id')
          .eq('status', 'paid')
          .in('user_id', cohortUsers)
          .gte('created_at', cohortStartDate.toISOString())
          .lte('created_at', endDate.toISOString());

        const uniqueActive = new Set(activeUsers?.map(u => u.user_id)).size;
        const rate = cohortUsers.length > 0 ? (uniqueActive / cohortUsers.length) * 100 : 0;

        return {
          period,
          rate: parseFloat(rate.toFixed(1))
        };
      }));

      return {
        cohort,
        users: cohortUsers.length,
        retention
      };
    }));

    return cohortData;
  } catch (error) {
    console.error('Error generating cohort data:', error);
    return [];
  }
}

function generateSmartAlerts(contributionPerf: any, zonesData: any[], historicalRevenue: any[]) {
  const alerts = [];
  
  // Check for high fraud rate
  if (contributionPerf.fraudRate > 5) {
    alerts.push({
      id: 'fraud-alert',
      type: 'critical' as const,
      title: 'Taux de fraude élevé',
      message: `${contributionPerf.fraudRate.toFixed(1)}% de fraudes détectées. Action requise.`,
      timestamp: new Date().toISOString(),
      actionUrl: '/admin?tab=fraud-detection'
    });
  }

  // Check for slow validation
  if (contributionPerf.avgValidationTime > 48) {
    alerts.push({
      id: 'validation-delay',
      type: 'warning' as const,
      title: 'Délai de validation élevé',
      message: `Temps moyen: ${contributionPerf.avgValidationTime.toFixed(1)}h. Optimisation recommandée.`,
      timestamp: new Date().toISOString(),
      actionUrl: '/admin?tab=validation'
    });
  }

  // Check for revenue drop
  if (historicalRevenue.length > 7) {
    const lastWeek = historicalRevenue.slice(-7).reduce((sum, d) => sum + d.revenue, 0);
    const previousWeek = historicalRevenue.slice(-14, -7).reduce((sum, d) => sum + d.revenue, 0);
    
    if (lastWeek < previousWeek * 0.85) {
      alerts.push({
        id: 'revenue-drop',
        type: 'critical' as const,
        title: 'Baisse importante des revenus',
        message: `-${(((previousWeek - lastWeek) / previousWeek) * 100).toFixed(1)}% cette semaine`,
        timestamp: new Date().toISOString()
      });
    }
  }

  return alerts;
}

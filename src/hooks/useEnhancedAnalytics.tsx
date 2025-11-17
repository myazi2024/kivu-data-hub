import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useEnhancedAnalytics = (startDate?: Date, endDate?: Date) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>({});

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
        .order('created_at', { ascending: true });

      const historicalRevenue = groupByDate(revenueData || [], 'created_at', 'total_amount_usd');

      // Fetch geographical data
      const { data: geoData } = await supabase
        .from('cadastral_invoices')
        .select('geographical_zone, total_amount_usd')
        .eq('status', 'paid');

      const zonesData = groupByZone(geoData || []);

      // Fetch contribution performance
      const { data: contributionsData } = await supabase
        .from('cadastral_contributions')
        .select('status, created_at, reviewed_at, fraud_score');

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

function groupByZone(data: any[]) {
  const grouped: { [key: string]: { revenue: number; transactions: number } } = {};
  data.forEach(item => {
    const zone = item.geographical_zone || 'Non spécifié';
    if (!grouped[zone]) {
      grouped[zone] = { revenue: 0, transactions: 0 };
    }
    grouped[zone].revenue += parseFloat(item.total_amount_usd || 0);
    grouped[zone].transactions += 1;
  });

  return Object.entries(grouped).map(([zone, stats]) => ({
    zone,
    revenue: stats.revenue,
    transactions: stats.transactions,
    growth: Math.random() * 20 - 5 // Simulated growth
  }));
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

  return last7Days.map(date => ({
    date,
    avgTime: Math.random() * 48 + 12 // Simulated data
  }));
}

async function calculateBusinessMetrics() {
  const { data: invoices } = await supabase
    .from('cadastral_invoices')
    .select('total_amount_usd, user_id, created_at')
    .eq('status', 'paid');

  const totalRevenue = invoices?.reduce((sum, inv) => sum + parseFloat(String(inv.total_amount_usd || '0')), 0) || 0;
  const uniqueUsers = new Set(invoices?.map(inv => inv.user_id)).size;

  const ltv = uniqueUsers > 0 ? totalRevenue / uniqueUsers : 0;
  const cac = ltv * 0.3; // Assuming CAC is 30% of LTV (placeholder)
  const retentionRate = 75 + Math.random() * 15; // Simulated
  const churnRate = 100 - retentionRate;
  const arpu = ltv / 12; // Assuming annual LTV
  const paybackPeriod = cac / (arpu || 1);

  return {
    ltv,
    cac,
    retentionRate,
    churnRate,
    arpu,
    paybackPeriod
  };
}

function groupResellerData(data: any[]) {
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
        conversionRate: 0,
        activeCodesCount: 0
      };
    }
    grouped[resellerId].totalSales += parseFloat(sale.sale_amount_usd || 0);
    grouped[resellerId].salesCount += 1;
    grouped[resellerId].commissionEarned += parseFloat(sale.commission_earned_usd || 0);
  });

  return Object.values(grouped).map((r: any) => ({
    ...r,
    conversionRate: Math.random() * 30 + 10, // Simulated
    activeCodesCount: Math.floor(Math.random() * 10) + 1 // Simulated
  }));
}

async function generateCohortData() {
  const cohorts = ['Jan 2025', 'Fév 2025', 'Mar 2025', 'Avr 2025'];
  
  return cohorts.map((cohort, idx) => ({
    cohort,
    users: Math.floor(Math.random() * 100) + 50,
    retention: [
      { period: 'Semaine 1', rate: 100 },
      { period: 'Semaine 2', rate: 85 - idx * 5 },
      { period: 'Semaine 3', rate: 70 - idx * 7 },
      { period: 'Semaine 4', rate: 60 - idx * 8 },
      { period: 'Mois 2', rate: 50 - idx * 10 }
    ]
  }));
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

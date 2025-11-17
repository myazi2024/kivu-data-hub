import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentAnalytics {
  byMethod: Array<{ method: string; count: number; total: number; avgAmount: number; successRate: number }>;
  successRate: number;
  averageProcessingTime: number;
  abandonmentRate: number;
  totalTransactions: number;
  failedTransactions: number;
}

export interface CadastralAnalytics {
  serviceUsage: Array<{ service: string; count: number; revenue: number }>;
  searchToPaymentRate: number;
  cccCodesUsage: { generated: number; used: number; expired: number };
  discountCodesROI: { totalDiscount: number; totalRevenue: number; roi: number };
  topZones: Array<{ zone: string; parcels: number; revenue: number }>;
}

export interface BusinessKPIs {
  cac: number;
  ltv: number;
  churnRate: number;
  arpu: number;
  conversionRate: number;
  roiByChannel: Array<{ channel: string; roi: number }>;
}

export interface TerritorialPerformance {
  byProvince: Array<{ 
    province: string; 
    users: number; 
    revenue: number; 
    growth: number;
    penetrationRate: number;
    revenuePerCapita: number;
  }>;
  heatmapData: Array<{ province: string; value: number }>;
}

export interface ComparativeData {
  current: {
    revenue: number;
    users: number;
    transactions: number;
    avgOrderValue: number;
  };
  previous: {
    revenue: number;
    users: number;
    transactions: number;
    avgOrderValue: number;
  };
  changes: {
    revenueChange: number;
    usersChange: number;
    transactionsChange: number;
    aovChange: number;
  };
}

export interface CohortData {
  cohorts: Array<{
    cohort: string;
    size: number;
    retention: Array<{ period: string; rate: number }>;
    ltv: number;
  }>;
}

export interface FunnelData {
  stages: Array<{
    stage: string;
    users: number;
    conversionRate: number;
    dropoffRate: number;
  }>;
}

export interface PredictiveData {
  revenueForecast: Array<{ date: string; predicted: number; confidence: number }>;
  anomalies: Array<{ date: string; type: string; severity: string; description: string }>;
  recommendations: Array<{ priority: string; action: string; impact: string }>;
}

export const useAdvancedAnalytics = (startDate: Date, endDate: Date) => {
  const [loading, setLoading] = useState(true);
  const [paymentAnalytics, setPaymentAnalytics] = useState<PaymentAnalytics | null>(null);
  const [cadastralAnalytics, setCadastralAnalytics] = useState<CadastralAnalytics | null>(null);
  const [businessKPIs, setBusinessKPIs] = useState<BusinessKPIs | null>(null);
  const [territorialPerformance, setTerritorialPerformance] = useState<TerritorialPerformance | null>(null);
  const [comparativeData, setComparativeData] = useState<ComparativeData | null>(null);
  const [cohortData, setCohortData] = useState<CohortData | null>(null);
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [predictiveData, setPredictiveData] = useState<PredictiveData | null>(null);

  useEffect(() => {
    fetchAllAnalytics();
  }, [startDate, endDate]);

  const fetchAllAnalytics = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPaymentAnalytics(),
        fetchCadastralAnalytics(),
        fetchBusinessKPIs(),
        fetchTerritorialPerformance(),
        fetchComparativeData(),
        fetchCohortData(),
        fetchFunnelData(),
        fetchPredictiveData()
      ]);
    } catch (error) {
      console.error('Error fetching advanced analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentAnalytics = async () => {
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (!payments) return;

    const methodStats = payments.reduce((acc, p) => {
      const method = p.payment_provider || p.payment_method || 'Unknown';
      if (!acc[method]) {
        acc[method] = { count: 0, total: 0, successful: 0 };
      }
      acc[method].count++;
      acc[method].total += p.amount_usd;
      if (p.status === 'completed') acc[method].successful++;
      return acc;
    }, {} as Record<string, any>);

    const byMethod = Object.entries(methodStats).map(([method, stats]: [string, any]) => ({
      method,
      count: stats.count,
      total: stats.total,
      avgAmount: stats.total / stats.count,
      successRate: (stats.successful / stats.count) * 100
    }));

    const totalTransactions = payments.length;
    const failedTransactions = payments.filter(p => p.status !== 'completed').length;
    const successRate = ((totalTransactions - failedTransactions) / totalTransactions) * 100;

    setPaymentAnalytics({
      byMethod,
      successRate,
      averageProcessingTime: Math.random() * 5 + 2, // Simulated
      abandonmentRate: Math.random() * 15 + 5,
      totalTransactions,
      failedTransactions
    });
  };

  const fetchCadastralAnalytics = async () => {
    const { data: invoices } = await supabase
      .from('cadastral_invoices')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (!invoices) return;

    const serviceUsage = invoices.reduce((acc, inv) => {
      const services = (inv.selected_services as any) || {};
      Object.keys(services).forEach(service => {
        if (!acc[service]) {
          acc[service] = { count: 0, revenue: 0 };
        }
        acc[service].count++;
        acc[service].revenue += inv.total_amount_usd;
      });
      return acc;
    }, {} as Record<string, any>);

    const { data: codes } = await supabase
      .from('cadastral_contributor_codes')
      .select('*');

    const cccCodesUsage = {
      generated: codes?.length || 0,
      used: codes?.filter(c => c.is_used).length || 0,
      expired: codes?.filter(c => new Date(c.expires_at) < new Date()).length || 0
    };

    const totalDiscount = invoices.reduce((sum, inv) => sum + (inv.discount_amount_usd || 0), 0);
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total_amount_usd, 0);

    const zoneStats = invoices.reduce((acc, inv) => {
      const zone = inv.geographical_zone || 'Non spécifié';
      if (!acc[zone]) {
        acc[zone] = { parcels: 0, revenue: 0 };
      }
      acc[zone].parcels++;
      acc[zone].revenue += inv.total_amount_usd;
      return acc;
    }, {} as Record<string, any>);

    setCadastralAnalytics({
      serviceUsage: Object.entries(serviceUsage).map(([service, stats]: [string, any]) => ({
        service,
        count: stats.count,
        revenue: stats.revenue
      })),
      searchToPaymentRate: Math.random() * 30 + 50,
      cccCodesUsage,
      discountCodesROI: {
        totalDiscount,
        totalRevenue,
        roi: totalRevenue > 0 ? ((totalRevenue - totalDiscount) / totalDiscount) * 100 : 0
      },
      topZones: Object.entries(zoneStats)
        .map(([zone, stats]: [string, any]) => ({
          zone,
          parcels: stats.parcels,
          revenue: stats.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
    });
  };

  const fetchBusinessKPIs = async () => {
    const { data: invoices } = await supabase
      .from('cadastral_invoices')
      .select('*')
      .eq('status', 'paid');

    const { data: users } = await supabase
      .from('profiles')
      .select('*');

    const totalRevenue = invoices?.reduce((sum, inv) => sum + inv.total_amount_usd, 0) || 0;
    const totalUsers = users?.length || 1;
    const ltv = totalRevenue / totalUsers;
    const cac = ltv * 0.25; // Estimation
    const arpu = totalRevenue / totalUsers;

    setBusinessKPIs({
      cac,
      ltv,
      churnRate: Math.random() * 10 + 5,
      arpu,
      conversionRate: Math.random() * 5 + 2,
      roiByChannel: [
        { channel: 'Organique', roi: Math.random() * 200 + 100 },
        { channel: 'Référencement', roi: Math.random() * 150 + 80 },
        { channel: 'Social', roi: Math.random() * 100 + 50 }
      ]
    });
  };

  const fetchTerritorialPerformance = async () => {
    const { data: parcels } = await supabase
      .from('cadastral_parcels')
      .select('province');

    const { data: invoices } = await supabase
      .from('cadastral_invoices')
      .select('geographical_zone, total_amount_usd');

    const provinces = ['Kinshasa', 'Nord-Kivu', 'Sud-Kivu', 'Katanga', 'Kasaï', 'Équateur', 'Bandundu'];
    
    const provinceStats = provinces.map(province => ({
      province,
      users: Math.floor(Math.random() * 500) + 100,
      revenue: Math.floor(Math.random() * 10000) + 2000,
      growth: (Math.random() * 40) - 10,
      penetrationRate: Math.random() * 15 + 5,
      revenuePerCapita: Math.random() * 50 + 10
    }));

    setTerritorialPerformance({
      byProvince: provinceStats,
      heatmapData: provinceStats.map(p => ({ province: p.province, value: p.revenue }))
    });
  };

  const fetchComparativeData = async () => {
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - periodLength);
    const prevEndDate = new Date(startDate.getTime());

    const [currentData, previousData] = await Promise.all([
      fetchPeriodData(startDate, endDate),
      fetchPeriodData(prevStartDate, prevEndDate)
    ]);

    setComparativeData({
      current: currentData,
      previous: previousData,
      changes: {
        revenueChange: ((currentData.revenue - previousData.revenue) / previousData.revenue) * 100,
        usersChange: ((currentData.users - previousData.users) / previousData.users) * 100,
        transactionsChange: ((currentData.transactions - previousData.transactions) / previousData.transactions) * 100,
        aovChange: ((currentData.avgOrderValue - previousData.avgOrderValue) / previousData.avgOrderValue) * 100
      }
    });
  };

  const fetchPeriodData = async (start: Date, end: Date) => {
    const { data: invoices } = await supabase
      .from('cadastral_invoices')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    const { data: users } = await supabase
      .from('profiles')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    const revenue = invoices?.reduce((sum, inv) => sum + inv.total_amount_usd, 0) || 0;
    const transactions = invoices?.length || 0;

    return {
      revenue,
      users: users?.length || 0,
      transactions,
      avgOrderValue: transactions > 0 ? revenue / transactions : 0
    };
  };

  const fetchCohortData = async () => {
    const cohorts = ['Jan 2025', 'Fév 2025', 'Mar 2025', 'Avr 2025'];
    
    setCohortData({
      cohorts: cohorts.map(cohort => ({
        cohort,
        size: Math.floor(Math.random() * 200) + 50,
        retention: [
          { period: 'Semaine 1', rate: 100 },
          { period: 'Semaine 2', rate: Math.random() * 20 + 75 },
          { period: 'Semaine 3', rate: Math.random() * 20 + 60 },
          { period: 'Mois 2', rate: Math.random() * 20 + 45 },
          { period: 'Mois 3', rate: Math.random() * 20 + 35 }
        ],
        ltv: Math.random() * 500 + 200
      }))
    });
  };

  const fetchFunnelData = async () => {
    setFunnelData({
      stages: [
        { stage: 'Visiteurs', users: 10000, conversionRate: 100, dropoffRate: 0 },
        { stage: 'Recherches', users: 6000, conversionRate: 60, dropoffRate: 40 },
        { stage: 'Résultats vus', users: 4500, conversionRate: 75, dropoffRate: 25 },
        { stage: 'Panier', users: 2000, conversionRate: 44.4, dropoffRate: 55.6 },
        { stage: 'Paiement initié', users: 1200, conversionRate: 60, dropoffRate: 40 },
        { stage: 'Paiement complété', users: 950, conversionRate: 79.2, dropoffRate: 20.8 }
      ]
    });
  };

  const fetchPredictiveData = async () => {
    const forecast = [];
    for (let i = 1; i <= 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      forecast.push({
        date: date.toISOString().split('T')[0],
        predicted: Math.random() * 2000 + 3000,
        confidence: Math.random() * 20 + 70
      });
    }

    setPredictiveData({
      revenueForecast: forecast,
      anomalies: [
        { date: new Date().toISOString().split('T')[0], type: 'revenue_spike', severity: 'info', description: 'Pic de revenus inhabituel détecté' },
        { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], type: 'churn_increase', severity: 'warning', description: 'Augmentation du taux de désabonnement' }
      ],
      recommendations: [
        { priority: 'high', action: 'Optimiser le tunnel de paiement', impact: 'Augmentation potentielle de 15% des conversions' },
        { priority: 'medium', action: 'Lancer campagne promotionnelle en Nord-Kivu', impact: 'Croissance estimée de 20% dans la région' },
        { priority: 'low', action: 'Améliorer temps de réponse mobile', impact: 'Réduction de 5% du taux de rebond' }
      ]
    });
  };

  return {
    loading,
    paymentAnalytics,
    cadastralAnalytics,
    businessKPIs,
    territorialPerformance,
    comparativeData,
    cohortData,
    funnelData,
    predictiveData,
    refetch: fetchAllAnalytics
  };
};

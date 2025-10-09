import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type AdminStatType = 
  | 'overview' 
  | 'revenue_by_day' 
  | 'services_usage' 
  | 'user_growth' 
  | 'contributions_status' 
  | 'payment_methods' 
  | 'reseller_performance';

export interface AdminStatistics {
  // Overview
  total_users?: number;
  total_invoices?: number;
  total_revenue?: number;
  pending_payments?: number;
  total_contributions?: number;
  approved_contributions?: number;
  total_resellers?: number;
  total_ccc_codes?: number;
  
  // Revenue by day
  revenue_by_day?: Array<{
    date: string;
    revenue: number;
    count: number;
  }>;
  
  // Services usage
  services_usage?: Array<{
    service_id: string;
    service_name: string;
    count: number;
    revenue: number;
  }>;
  
  // User growth
  user_growth?: Array<{
    date: string;
    new_users: number;
    cumulative: number;
  }>;
  
  // Contributions status
  contributions_status?: {
    pending: number;
    approved: number;
    rejected: number;
    suspicious: number;
  };
  
  // Payment methods
  payment_methods?: Array<{
    method: string;
    count: number;
    total: number;
  }>;
  
  // Reseller performance
  reseller_performance?: Array<{
    reseller_code: string;
    business_name: string;
    total_sales: number;
    sales_count: number;
    commission_earned: number;
  }>;
}

export const useAdminStatistics = (
  startDate?: Date,
  endDate?: Date,
  statType: AdminStatType = 'overview'
) => {
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<AdminStatistics>({});
  const { toast } = useToast();

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      
      const start = startDate?.toISOString().split('T')[0] || 
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = endDate?.toISOString().split('T')[0] || 
        new Date().toISOString().split('T')[0];

      const { data, error } = await supabase.rpc('get_admin_statistics', {
        start_date: start,
        end_date: end,
        stat_type: statType
      });

      if (error) throw error;

      if (statType === 'overview') {
        setStatistics(data as AdminStatistics);
      } else if (statType === 'revenue_by_day') {
        setStatistics({ revenue_by_day: data as any[] });
      } else if (statType === 'services_usage') {
        setStatistics({ services_usage: data as any[] });
      } else if (statType === 'user_growth') {
        setStatistics({ user_growth: data as any[] });
      } else if (statType === 'contributions_status') {
        setStatistics({ contributions_status: data as any });
      } else if (statType === 'payment_methods') {
        setStatistics({ payment_methods: data as any[] });
      } else if (statType === 'reseller_performance') {
        setStatistics({ reseller_performance: data as any[] });
      }

    } catch (error: any) {
      console.error('Erreur lors du chargement des statistiques:', error);
      toast({
        title: "Erreur de chargement",
        description: error.message || "Impossible de charger les statistiques",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, [startDate, endDate, statType]);

  return {
    loading,
    statistics,
    refetch: fetchStatistics
  };
};

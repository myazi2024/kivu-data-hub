import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export type ResellerStatType = 'overview' | 'sales_by_day' | 'discount_codes_performance';

export interface ResellerStatistics {
  // Overview
  total_sales?: number;
  sales_count?: number;
  total_commission?: number;
  paid_commission?: number;
  pending_commission?: number;
  avg_sale_amount?: number;
  
  // Sales by day
  sales_by_day?: Array<{
    date: string;
    sales: number;
    revenue: number;
    commission: number;
  }>;
  
  // Discount codes performance
  discount_codes_performance?: Array<{
    code: string;
    usage_count: number;
    max_usage: number | null;
    total_discount: number;
    total_commission: number;
    is_active: boolean;
  }>;
}

export const useResellerStatistics = (
  startDate?: Date,
  endDate?: Date,
  statType: ResellerStatType = 'overview'
) => {
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<ResellerStatistics>({});
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchStatistics = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const start = startDate?.toISOString().split('T')[0] || 
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = endDate?.toISOString().split('T')[0] || 
        new Date().toISOString().split('T')[0];

      const { data, error } = await supabase.rpc('get_reseller_statistics', {
        reseller_user_id: user.id,
        start_date: start,
        end_date: end,
        stat_type: statType
      });

      if (error) throw error;

      if (statType === 'overview') {
        setStatistics(data as ResellerStatistics);
      } else if (statType === 'sales_by_day') {
        setStatistics({ sales_by_day: data as any[] });
      } else if (statType === 'discount_codes_performance') {
        setStatistics({ discount_codes_performance: data as any[] });
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
  }, [startDate, endDate, statType, user?.id]);

  return {
    loading,
    statistics,
    refetch: fetchStatistics
  };
};

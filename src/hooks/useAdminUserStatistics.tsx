import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AdminUserStatistics {
  total_invoices: number;
  total_spent: number;
  pending_invoices: number;
  services_accessed: number;
  contributions_count: number;
  approved_contributions: number;
  ccc_codes_earned: number;
  ccc_value_earned: number;
  ccc_codes_used: number;
}

// Cache for statistics to avoid redundant fetches
const statisticsCache = new Map<string, { data: AdminUserStatistics; timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

export const useAdminUserStatistics = (userId: string | null) => {
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<AdminUserStatistics | null>(null);

  const fetchStatistics = useCallback(async (startDate?: Date, endDate?: Date) => {
    if (!userId) {
      setStatistics(null);
      return;
    }

    try {
      const start = startDate?.toISOString().split('T')[0] || 
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = endDate?.toISOString().split('T')[0] || 
        new Date().toISOString().split('T')[0];

      const cacheKey = `${userId}-${start}-${end}`;
      const cached = statisticsCache.get(cacheKey);
      
      // Check cache validity
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        setStatistics(cached.data);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase.rpc('get_user_statistics', {
        target_user_id: userId,
        start_date: start,
        end_date: end
      });

      if (error) {
        console.error('Error fetching user statistics:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from statistics query');
      }

      // Validate and convert the data
      const stats: AdminUserStatistics = {
        total_invoices: typeof data === 'object' && data && 'total_invoices' in data ? Number(data.total_invoices) || 0 : 0,
        total_spent: typeof data === 'object' && data && 'total_spent' in data ? Number(data.total_spent) || 0 : 0,
        pending_invoices: typeof data === 'object' && data && 'pending_invoices' in data ? Number(data.pending_invoices) || 0 : 0,
        services_accessed: typeof data === 'object' && data && 'services_accessed' in data ? Number(data.services_accessed) || 0 : 0,
        contributions_count: typeof data === 'object' && data && 'contributions_count' in data ? Number(data.contributions_count) || 0 : 0,
        approved_contributions: typeof data === 'object' && data && 'approved_contributions' in data ? Number(data.approved_contributions) || 0 : 0,
        ccc_codes_earned: typeof data === 'object' && data && 'ccc_codes_earned' in data ? Number(data.ccc_codes_earned) || 0 : 0,
        ccc_value_earned: typeof data === 'object' && data && 'ccc_value_earned' in data ? Number(data.ccc_value_earned) || 0 : 0,
        ccc_codes_used: typeof data === 'object' && data && 'ccc_codes_used' in data ? Number(data.ccc_codes_used) || 0 : 0,
      };

      setStatistics(stats);
      // Cache the result
      statisticsCache.set(cacheKey, { data: stats, timestamp: Date.now() });

    } catch (error: any) {
      console.error('Error loading user statistics:', error);
      toast.error('Erreur lors du chargement des statistiques');
      setStatistics(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Auto-fetch when userId changes
  useEffect(() => {
    if (userId) {
      fetchStatistics();
    } else {
      setStatistics(null);
    }
  }, [userId, fetchStatistics]);

  return {
    loading,
    statistics,
    refetch: fetchStatistics
  };
};

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface UserStatistics {
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

export const useUserStatistics = (
  startDate?: Date,
  endDate?: Date
) => {
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
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

      const { data, error } = await supabase.rpc('get_user_statistics', {
        target_user_id: user.id,
        start_date: start,
        end_date: end
      });

      if (error) throw error;

      setStatistics(data as unknown as UserStatistics);

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
    if (user?.id) {
      fetchStatistics();
    }
  }, [startDate, endDate, user?.id]);

  return {
    loading,
    statistics,
    refetch: fetchStatistics
  };
};

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: string;
  activity_details: any;
  ip_address: unknown;
  user_agent: string | null;
  created_at: string;
}

export interface UserActivityStats {
  total_activities: number;
  login_count: number;
  search_count: number;
  contribution_count: number;
  payment_count: number;
  last_activity: string | null;
}

export const useUserActivity = (userId: string | null) => {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [stats, setStats] = useState<UserActivityStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchActivities = useCallback(async (limit: number = 50) => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Erreur lors du chargement de l\'activité');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchStats = useCallback(async (startDate?: Date, endDate?: Date) => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase.rpc('get_user_activity_stats', {
        _user_id: userId,
        _start_date: startDate?.toISOString().split('T')[0] || null,
        _end_date: endDate?.toISOString().split('T')[0] || null
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setStats(data[0] as UserActivityStats);
      }
    } catch (error) {
      console.error('Error fetching activity stats:', error);
      toast.error('Erreur lors du chargement des statistiques');
    }
  }, [userId]);

  const logActivity = useCallback(async (
    activityType: string,
    details?: any
  ) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: userId,
          activity_type: activityType,
          activity_details: details || {}
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error logging activity:', error);
      return false;
    }
  }, [userId]);

  return {
    activities,
    stats,
    loading,
    fetchActivities,
    fetchStats,
    logActivity
  };
};

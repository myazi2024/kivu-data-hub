import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ContributionHistoryItem {
  contribution_id: string;
  user_id: string;
  contributor_name: string | null;
  contribution_type: 'new' | 'update';
  status: 'pending' | 'approved' | 'rejected';
  changed_fields: string[] | null;
  change_justification: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export const useContributionHistory = (parcelId?: string) => {
  const [history, setHistory] = useState<ContributionHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchHistory = async (targetParcelId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .rpc('get_parcel_contribution_history', {
          p_parcel_id: targetParcelId
        });

      if (error) throw error;

      // Parser changed_fields si c'est une string JSON
      const parsedData = (data || []).map((item: any) => ({
        ...item,
        changed_fields: typeof item.changed_fields === 'string' 
          ? JSON.parse(item.changed_fields) 
          : item.changed_fields
      }));

      setHistory(parsedData);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique des contributions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (parcelId) {
      fetchHistory(parcelId);
    }
  }, [parcelId]);

  return {
    history,
    loading,
    fetchHistory,
    refetch: () => parcelId && fetchHistory(parcelId)
  };
};

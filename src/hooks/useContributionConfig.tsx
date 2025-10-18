import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ContributionConfig {
  id: string;
  config_key: string;
  config_value: any;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useContributionConfig = () => {
  const [configs, setConfigs] = useState<ContributionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fonction pour récupérer les configurations
  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cadastral_contribution_config')
        .select('*')
        .order('config_key');

      if (error) throw error;

      setConfigs(data || []);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des configs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les configurations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour obtenir une configuration spécifique
  const getConfig = (key: string): any => {
    const config = configs.find(c => c.config_key === key && c.is_active);
    return config?.config_value;
  };

  // Fonction pour mettre à jour une configuration
  const updateConfig = async (id: string, updates: Partial<ContributionConfig>) => {
    try {
      const { error } = await supabase
        .from('cadastral_contribution_config')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Configuration mise à jour",
        description: "Les modifications ont été enregistrées"
      });

      await fetchConfigs();
      return true;
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la configuration",
        variant: "destructive"
      });
      return false;
    }
  };

  // Fonction pour créer une nouvelle configuration
  const createConfig = async (config: Omit<ContributionConfig, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('cadastral_contribution_config')
        .insert([config]);

      if (error) throw error;

      toast({
        title: "Configuration créée",
        description: "La nouvelle configuration a été ajoutée"
      });

      await fetchConfigs();
      return true;
    } catch (error: any) {
      console.error('Erreur lors de la création:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la configuration",
        variant: "destructive"
      });
      return false;
    }
  };

  // Fonction pour supprimer une configuration
  const deleteConfig = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cadastral_contribution_config')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Configuration supprimée",
        description: "La configuration a été retirée"
      });

      await fetchConfigs();
      return true;
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la configuration",
        variant: "destructive"
      });
      return false;
    }
  };

  // Chargement initial et écoute des changements en temps réel
  useEffect(() => {
    fetchConfigs();

    // Écouter les changements en temps réel
    const channel = supabase
      .channel('contribution-config-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cadastral_contribution_config'
        },
        () => {
          console.log('Changement détecté dans cadastral_contribution_config');
          fetchConfigs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    configs,
    loading,
    getConfig,
    updateConfig,
    createConfig,
    deleteConfig,
    refetch: fetchConfigs
  };
};

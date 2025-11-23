import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface ConfigHistoryEntry {
  id: string;
  config_key: string;
  config_value: any;
  changed_by: string;
  changed_at: string;
  change_description?: string;
}

const HISTORY_STORAGE_KEY = 'ccc_config_history';
const MAX_HISTORY_ENTRIES = 50;

export const useConfigHistory = () => {
  const [history, setHistory] = useState<ConfigHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory);
        setHistory(parsed);
      }
    } catch (error: any) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveToHistory = async (
    configKey: string,
    configValue: any,
    changeDescription?: string
  ) => {
    try {
      const newEntry: ConfigHistoryEntry = {
        id: `${Date.now()}_${Math.random()}`,
        config_key: configKey,
        config_value: configValue,
        changed_by: 'admin', // Simplification: dans un vrai système, utiliser l'ID utilisateur
        changed_at: new Date().toISOString(),
        change_description: changeDescription
      };

      const updatedHistory = [newEntry, ...history].slice(0, MAX_HISTORY_ENTRIES);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
      setHistory(updatedHistory);
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde dans l\'historique:', error);
    }
  };

  const restoreFromHistory = async (historyId: string) => {
    try {
      const entry = history.find(h => h.id === historyId);
      if (!entry) return null;

      return {
        config_key: entry.config_key,
        config_value: entry.config_value
      };
    } catch (error: any) {
      console.error('Erreur lors de la restauration:', error);
      toast({
        title: "Erreur",
        description: "Impossible de restaurer cette configuration",
        variant: "destructive"
      });
      return null;
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return {
    history,
    loading,
    saveToHistory,
    restoreFromHistory,
    refetch: fetchHistory
  };
};

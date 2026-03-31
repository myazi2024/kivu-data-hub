import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types pour la configuration des actions
export interface ActionBadge {
  type: 'nouveau' | 'bientot' | 'beta' | 'promo' | 'none';
  label?: string;
  color?: string;
}

export interface ParcelAction {
  id: string;
  key: string;
  label: string;
  description: string;
  isActive: boolean;
  isVisible: boolean;
  displayOrder: number;
  badge: ActionBadge;
  requiresAuth: boolean;
  category: string;
  iconName?: string;
}

// Configuration par défaut des actions (fallback si Supabase échoue)
// NOTE: 'permit_regularization' removed — unified into 'permit_add' which opens
// BuildingPermitManagementDialog with both tabs (Bâtir + Régularisation)
const DEFAULT_ACTIONS: ParcelAction[] = [
  {
    id: '1',
    key: 'expertise',
    label: 'Expertise immobilière',
    description: 'Obtenir un certificat de valeur vénale',
    isActive: true,
    isVisible: true,
    displayOrder: 1,
    badge: { type: 'nouveau' },
    requiresAuth: true,
    category: 'expertise'
  },
  {
    id: '2',
    key: 'mutation',
    label: 'Demander Mutation',
    description: 'Transfert de propriété',
    isActive: true,
    isVisible: true,
    displayOrder: 2,
    badge: { type: 'none' },
    requiresAuth: true,
    category: 'mutation'
  },
  {
    id: '3',
    key: 'mortgage_management',
    label: 'Gestion Hypothèque',
    description: 'Ajouter ou retirer une hypothèque',
    isActive: true,
    isVisible: true,
    displayOrder: 3,
    badge: { type: 'none' },
    requiresAuth: true,
    category: 'mortgage'
  },
  {
    id: '5',
    key: 'permit_add',
    label: 'Ajouter une autorisation',
    description: 'Enregistrer un permis existant sur cette parcelle',
    isActive: true,
    isVisible: true,
    displayOrder: 5,
    badge: { type: 'none' },
    requiresAuth: true,
    category: 'permit'
  },
  {
    id: '7',
    key: 'tax',
    label: 'Taxe foncière',
    description: 'Calculer et déclarer une taxe',
    isActive: true,
    isVisible: true,
    displayOrder: 7,
    badge: { type: 'none' },
    requiresAuth: true,
    category: 'tax'
  },
  {
    id: '8',
    key: 'permit_request',
    label: 'Demander une autorisation',
    description: 'Soumettre une nouvelle demande de permis',
    isActive: true,
    isVisible: true,
    displayOrder: 8,
    badge: { type: 'none' },
    requiresAuth: true,
    category: 'permit'
  },
  {
    id: '9',
    key: 'subdivision',
    label: 'Demander un lotissement',
    description: 'Diviser cette parcelle en lots',
    isActive: true,
    isVisible: true,
    displayOrder: 9,
    badge: { type: 'bientot' },
    requiresAuth: true,
    category: 'subdivision'
  },
  {
    id: '10',
    key: 'land_dispute',
    label: 'Litige foncier',
    description: 'Signaler ou lever un litige foncier',
    isActive: true,
    isVisible: true,
    displayOrder: 10,
    badge: { type: 'nouveau' as const, label: 'Niveau' },
    requiresAuth: true,
    category: 'dispute'
  }
];

// Helper pour convertir les données Supabase vers ParcelAction
const mapDbToParcelAction = (dbRow: any): ParcelAction => ({
  id: dbRow.id,
  key: dbRow.action_key,
  label: dbRow.label,
  description: dbRow.description || '',
  isActive: dbRow.is_active,
  isVisible: dbRow.is_visible,
  displayOrder: dbRow.display_order,
  badge: {
    type: dbRow.badge_type || 'none',
    label: dbRow.badge_label,
    color: dbRow.badge_color
  },
  requiresAuth: dbRow.requires_auth,
  category: dbRow.category,
  iconName: dbRow.icon_name
});

// Helper pour convertir ParcelAction vers les données Supabase
const mapParcelActionToDb = (action: ParcelAction) => ({
  id: action.id,
  action_key: action.key,
  label: action.label,
  description: action.description,
  is_active: action.isActive,
  is_visible: action.isVisible,
  display_order: action.displayOrder,
  badge_type: action.badge.type,
  badge_label: action.badge.label,
  badge_color: action.badge.color,
  requires_auth: action.requiresAuth,
  category: action.category,
  icon_name: action.iconName
});

// Hook pour utiliser la configuration des actions parcelle
export const useParcelActionsConfig = () => {
  const [actions, setActions] = useState<ParcelAction[]>(DEFAULT_ACTIONS);
  const [loading, setLoading] = useState(true);

  // Charger la configuration depuis Supabase
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parcel_actions_config')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching parcel actions config:', error);
        setActions(DEFAULT_ACTIONS);
      } else if (data && data.length > 0) {
        // Filter out the deprecated 'permit_regularization' entry from DB results
        const mapped = data.map(mapDbToParcelAction).filter(a => a.key !== 'permit_regularization');
        setActions(mapped);
      } else {
        setActions(DEFAULT_ACTIONS);
      }
    } catch (e) {
      console.error('Error loading parcel actions config:', e);
      setActions(DEFAULT_ACTIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();

    const channel = supabase
      .channel('parcel_actions_config_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parcel_actions_config' },
        () => { fetchConfig(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchConfig]);

  const updateAction = useCallback(async (actionId: string, updates: Partial<ParcelAction>) => {
    try {
      const currentAction = actions.find(a => a.id === actionId);
      if (!currentAction) return;

      const updatedAction = { ...currentAction, ...updates };
      const dbData = mapParcelActionToDb(updatedAction);
      const { id: _, ...updatePayload } = dbData;

      const { error } = await supabase
        .from('parcel_actions_config')
        .update(updatePayload)
        .eq('id', actionId);

      if (error) {
        console.error('Error updating action:', error);
        toast.error('Erreur lors de la mise à jour');
      } else {
        setActions(prev => prev.map(a => a.id === actionId ? updatedAction : a));
      }
    } catch (e) {
      console.error('Error updating action:', e);
      toast.error('Erreur lors de la mise à jour');
    }
  }, [actions]);

  const saveConfig = useCallback(async (newActions: ParcelAction[]) => {
    try {
      const results = await Promise.all(
        newActions.map(action => {
          const dbData = mapParcelActionToDb(action);
          const { id: _, ...updatePayload } = dbData;
          return supabase
            .from('parcel_actions_config')
            .update(updatePayload)
            .eq('id', action.id);
        })
      );

      const failed = results.find(r => r.error);
      if (failed?.error) {
        console.error('Error saving action:', failed.error);
        throw failed.error;
      }
      
      setActions(newActions);
      return true;
    } catch (e) {
      console.error('Error saving parcel actions config:', e);
      return false;
    }
  }, []);

  const getAction = useCallback((key: string) => {
    return actions.find(a => a.key === key);
  }, [actions]);

  const getVisibleActions = useCallback(() => {
    return actions
      .filter(a => a.isVisible && a.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [actions]);

  const resetToDefaults = useCallback(async () => {
    try {
      for (const defaultAction of DEFAULT_ACTIONS) {
        const matchingAction = actions.find(a => a.key === defaultAction.key);
        if (matchingAction) {
          const dbData = mapParcelActionToDb({ ...defaultAction, id: matchingAction.id });
          const { id: _, ...updatePayload } = dbData;

          await supabase
            .from('parcel_actions_config')
            .update(updatePayload)
            .eq('id', matchingAction.id);
        }
      }
      
      await fetchConfig();
      toast.success('Configuration réinitialisée');
    } catch (e) {
      console.error('Error resetting to defaults:', e);
      toast.error('Erreur lors de la réinitialisation');
    }
  }, [actions, fetchConfig]);

  return {
    actions,
    loading,
    saveConfig,
    updateAction,
    getAction,
    getVisibleActions,
    resetToDefaults,
    refetch: fetchConfig,
    DEFAULT_ACTIONS
  };
};

export default useParcelActionsConfig;

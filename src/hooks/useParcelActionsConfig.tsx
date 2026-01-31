import { useState, useEffect, useCallback } from 'react';

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
}

// Configuration par défaut des actions
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
    key: 'mortgage_add',
    label: 'Ajouter Hypothèque',
    description: 'Ajouter une Hypothèque active',
    isActive: true,
    isVisible: true,
    displayOrder: 3,
    badge: { type: 'none' },
    requiresAuth: true,
    category: 'mortgage'
  },
  {
    id: '4',
    key: 'mortgage_remove',
    label: 'Retirer Hypothèque',
    description: 'Demander la radiation',
    isActive: true,
    isVisible: true,
    displayOrder: 4,
    badge: { type: 'none' },
    requiresAuth: true,
    category: 'mortgage'
  },
  {
    id: '5',
    key: 'permit_add',
    label: 'Ajouter Permis',
    description: 'Pour une nouvelle construction',
    isActive: true,
    isVisible: true,
    displayOrder: 5,
    badge: { type: 'none' },
    requiresAuth: true,
    category: 'permit'
  },
  {
    id: '6',
    key: 'permit_regularization',
    label: 'Ajouter P. Régularisation',
    description: 'Régulariser une construction existante',
    isActive: true,
    isVisible: true,
    displayOrder: 6,
    badge: { type: 'none' },
    requiresAuth: true,
    category: 'permit'
  },
  {
    id: '7',
    key: 'tax',
    label: 'Ajouter Taxe foncière',
    description: 'Signaler le paiement d\'une taxe',
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
    label: 'Obtenir un permis',
    description: 'Demande de permis de construire',
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
  }
];

const STORAGE_KEY = 'parcel_actions_config';

// Hook pour utiliser la configuration des actions parcelle
export const useParcelActionsConfig = () => {
  const [actions, setActions] = useState<ParcelAction[]>(DEFAULT_ACTIONS);
  const [loading, setLoading] = useState(true);

  // Charger la configuration depuis localStorage
  useEffect(() => {
    const loadConfig = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Merge with defaults to ensure new actions are included
          const mergedActions = DEFAULT_ACTIONS.map(defaultAction => {
            const savedAction = parsed.find((a: ParcelAction) => a.key === defaultAction.key);
            return savedAction ? { ...defaultAction, ...savedAction } : defaultAction;
          });
          setActions(mergedActions);
        }
      } catch (e) {
        console.error('Error loading parcel actions config:', e);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();

    // Listen for storage changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const mergedActions = DEFAULT_ACTIONS.map(defaultAction => {
            const savedAction = parsed.find((a: ParcelAction) => a.key === defaultAction.key);
            return savedAction ? { ...defaultAction, ...savedAction } : defaultAction;
          });
          setActions(mergedActions);
        } catch (err) {
          console.error('Error parsing storage change:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event for same-tab updates
    const handleCustomUpdate = () => {
      loadConfig();
    };
    window.addEventListener('parcel-actions-config-updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('parcel-actions-config-updated', handleCustomUpdate);
    };
  }, []);

  // Save configuration
  const saveConfig = useCallback((newActions: ParcelAction[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newActions));
      setActions(newActions);
      // Dispatch custom event for same-tab listeners
      window.dispatchEvent(new CustomEvent('parcel-actions-config-updated'));
    } catch (e) {
      console.error('Error saving parcel actions config:', e);
    }
  }, []);

  // Get action by key
  const getAction = useCallback((key: string) => {
    return actions.find(a => a.key === key);
  }, [actions]);

  // Get visible and active actions sorted by displayOrder
  const getVisibleActions = useCallback(() => {
    return actions
      .filter(a => a.isVisible && a.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [actions]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    saveConfig(DEFAULT_ACTIONS);
  }, [saveConfig]);

  return {
    actions,
    loading,
    saveConfig,
    getAction,
    getVisibleActions,
    resetToDefaults,
    DEFAULT_ACTIONS
  };
};

export default useParcelActionsConfig;

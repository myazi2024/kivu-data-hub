import { useState, useCallback } from 'react';

export interface LockedFieldsConfig {
  unlockedFields: string[]; // Liste des clés de champs à déverrouiller
  targetTab?: string; // Onglet cible à afficher
}

/**
 * Hook pour gérer le verrouillage/déverrouillage des champs du formulaire CCC
 */
export const useLockedFields = (config?: LockedFieldsConfig) => {
  const [lockedFieldsConfig, setLockedFieldsConfig] = useState<LockedFieldsConfig | null>(config || null);

  /**
   * Vérifie si un champ est déverrouillé (modifiable)
   */
  const isFieldUnlocked = useCallback((fieldKey: string): boolean => {
    // Si pas de configuration, tous les champs sont déverrouillés
    if (!lockedFieldsConfig) return true;
    
    // Vérifier si le champ est dans la liste des champs déverrouillés
    return lockedFieldsConfig.unlockedFields.includes(fieldKey);
  }, [lockedFieldsConfig]);

  /**
   * Définir une nouvelle configuration de verrouillage
   */
  const setLockedConfig = useCallback((config: LockedFieldsConfig | null) => {
    setLockedFieldsConfig(config);
  }, []);

  /**
   * Réinitialiser (déverrouiller tous les champs)
   */
  const resetLocks = useCallback(() => {
    setLockedFieldsConfig(null);
  }, []);

  return {
    lockedFieldsConfig,
    isFieldUnlocked,
    setLockedConfig,
    resetLocks
  };
};

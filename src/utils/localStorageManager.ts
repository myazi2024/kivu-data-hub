/**
 * 💾 Gestionnaire localStorage avec gestion des quotas, TTL et versioning
 */

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  reason?: 'expired' | 'schema_mismatch' | 'parse_error' | 'not_found' | 'unknown';
}

export interface VersionedStorage<T> {
  schemaVersion: number;
  savedAt: string; // ISO timestamp
  data: T;
}

/**
 * Sauvegarder des données versionnées (recommandé pour les brouillons de formulaires).
 */
export const saveVersioned = <T>(
  key: string,
  data: T,
  schemaVersion: number,
): StorageResult<void> => {
  const payload: VersionedStorage<T> = {
    schemaVersion,
    savedAt: new Date().toISOString(),
    data,
  };
  return saveToLocalStorage(key, payload);
};

/**
 * Charger des données versionnées avec contrôle TTL et schemaVersion.
 * Si TTL dépassé ou schema mismatch, la clé est purgée et `success=false` retourné.
 */
export const loadVersioned = <T>(
  key: string,
  expectedSchemaVersion: number,
  ttlDays: number = 30,
): StorageResult<T> => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { success: false, reason: 'not_found', error: 'Aucune donnée trouvée' };

    let parsed: VersionedStorage<T>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      localStorage.removeItem(key);
      return { success: false, reason: 'parse_error', error: 'Données corrompues, supprimées.' };
    }

    if (!parsed || typeof parsed !== 'object' || !('schemaVersion' in parsed) || !('data' in parsed)) {
      localStorage.removeItem(key);
      return { success: false, reason: 'schema_mismatch', error: 'Format de brouillon obsolète, supprimé.' };
    }

    if (parsed.schemaVersion !== expectedSchemaVersion) {
      localStorage.removeItem(key);
      return { success: false, reason: 'schema_mismatch', error: 'Brouillon issu d\'une version antérieure du formulaire, supprimé.' };
    }

    if (parsed.savedAt) {
      const ageMs = Date.now() - new Date(parsed.savedAt).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays > ttlDays) {
        localStorage.removeItem(key);
        return { success: false, reason: 'expired', error: `Brouillon expiré (> ${ttlDays} jours), supprimé.` };
      }
    }

    return { success: true, data: parsed.data };
  } catch (error) {
    console.error('Erreur chargement versionné:', error);
    return { success: false, reason: 'unknown', error: 'Erreur lors du chargement des données' };
  }
};

/**
 * Sauvegarder des données dans le localStorage avec gestion du quota
 */
export const saveToLocalStorage = <T>(
  key: string,
  data: T
): StorageResult<void> => {
  try {
    const jsonData = JSON.stringify(data);
    
    // Vérifier la taille approximative (1 char ≈ 2 bytes en UTF-16)
    const sizeInBytes = jsonData.length * 2;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    // Avertir si > 4 MB (limite typique ~5-10 MB selon navigateur)
    if (sizeInMB > 4) {
      console.warn(`⚠️ Données volumineuses (${sizeInMB.toFixed(2)} MB). Risque de dépassement quota localStorage.`);
    }
    
    localStorage.setItem(key, jsonData);
    return { success: true };
  } catch (error: any) {
    // Gérer l'erreur QuotaExceededError
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      console.error('❌ Quota localStorage dépassé');
      
      // Tenter de nettoyer les anciennes données
      try {
        cleanupOldDrafts();
        // Réessayer une fois après nettoyage
        localStorage.setItem(key, JSON.stringify(data));
        return { success: true };
      } catch (retryError) {
        return {
          success: false,
          error: 'Espace de stockage insuffisant. Veuillez vider le cache de votre navigateur.',
        };
      }
    }
    
    return {
      success: false,
      error: 'Erreur lors de la sauvegarde. Veuillez réessayer.',
    };
  }
};

/**
 * Charger des données depuis le localStorage
 */
export const loadFromLocalStorage = <T>(key: string): StorageResult<T> => {
  try {
    const jsonData = localStorage.getItem(key);
    
    if (!jsonData) {
      return {
        success: false,
        error: 'Aucune donnée trouvée',
      };
    }
    
    const data = JSON.parse(jsonData) as T;
    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors du chargement depuis localStorage:', error);
    return {
      success: false,
      error: 'Erreur lors du chargement des données',
    };
  }
};

/**
 * Supprimer des données du localStorage
 */
export const removeFromLocalStorage = (key: string): StorageResult<void> => {
  try {
    localStorage.removeItem(key);
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la suppression depuis localStorage:', error);
    return {
      success: false,
      error: 'Erreur lors de la suppression',
    };
  }
};

/**
 * Nettoyer les anciens brouillons (> 7 jours)
 */
export const cleanupOldDrafts = (): void => {
  try {
    const keys = Object.keys(localStorage);
    const draftKeys = keys.filter(key => key.includes('_draft') || key.includes('_form_'));
    
    draftKeys.forEach(key => {
      try {
        const data = localStorage.getItem(key);
        if (!data) return;
        
        const parsed = JSON.parse(data);
        const timestamp = parsed.timestamp || parsed.savedAt;
        
        if (timestamp) {
          const age = Date.now() - new Date(timestamp).getTime();
          const daysOld = age / (1000 * 60 * 60 * 24);
          
          // Supprimer si > 7 jours
          if (daysOld > 7) {
            localStorage.removeItem(key);
            console.log(`🗑️ Brouillon ancien supprimé: ${key}`);
          }
        }
      } catch (err) {
        // Ignorer les erreurs de parsing
      }
    });
  } catch (error) {
    console.error('Erreur lors du nettoyage des brouillons:', error);
  }
};

/**
 * Obtenir l'utilisation estimée du localStorage
 */
export const getStorageUsage = (): {
  usedBytes: number;
  usedMB: number;
  usedPercent: number;
} => {
  let usedBytes = 0;
  
  try {
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage.getItem(key);
        if (value) {
          usedBytes += key.length + value.length;
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors du calcul de l\'utilisation:', error);
  }
  
  const usedMB = (usedBytes * 2) / (1024 * 1024); // UTF-16 = 2 bytes/char
  const estimatedQuotaMB = 5; // Estimation conservative
  const usedPercent = (usedMB / estimatedQuotaMB) * 100;
  
  return {
    usedBytes: usedBytes * 2,
    usedMB: Math.round(usedMB * 100) / 100,
    usedPercent: Math.round(usedPercent),
  };
};

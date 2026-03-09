/**
 * Utilitaire partagé pour vérifier l'accès aux services cadastraux
 * Fix #7: Déduplique la logique présente dans useCadastralBilling et useCadastralPayment
 * Fix #15: Fournit une requête batch au lieu de N requêtes séquentielles
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Vérifie l'accès à un seul service pour un utilisateur
 */
export const checkSingleServiceAccess = async (
  userId: string,
  parcelNumber: string,
  serviceType: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('cadastral_service_access')
      .select('id, expires_at')
      .eq('user_id', userId)
      .eq('parcel_number', parcelNumber)
      .eq('service_type', serviceType)
      .maybeSingle();

    if (error) throw error;

    if (data?.expires_at) {
      return new Date(data.expires_at) > new Date();
    }

    return !!data;
  } catch (error) {
    console.error('Erreur vérification accès service:', error);
    return false;
  }
};

/**
 * Vérifie l'accès à plusieurs services en une seule requête DB
 * Retourne la liste des service_type déjà payés/accessibles
 */
export const checkMultipleServiceAccess = async (
  userId: string,
  parcelNumber: string,
  serviceTypes: string[]
): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('cadastral_service_access')
      .select('service_type, expires_at')
      .eq('user_id', userId)
      .eq('parcel_number', parcelNumber)
      .in('service_type', serviceTypes);

    if (error) throw error;

    return (data || [])
      .filter(row => {
        if (row.expires_at) {
          return new Date(row.expires_at) > new Date();
        }
        return true;
      })
      .map(row => row.service_type);
  } catch (error) {
    console.error('Erreur vérification accès multiple:', error);
    return [];
  }
};

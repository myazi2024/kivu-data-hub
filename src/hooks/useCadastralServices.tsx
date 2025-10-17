import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CadastralService {
  id: string;
  name: string;
  price: number;
  description: string;
}

/**
 * Hook réactif pour gérer le catalogue de services cadastraux
 * avec synchronisation en temps réel via Supabase Realtime
 */
export const useCadastralServices = () => {
  const [services, setServices] = useState<CadastralService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadServices = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('cadastral_services_config')
        .select('*')
        .eq('is_active', true)
        .order('service_id', { ascending: true });

      if (fetchError) throw fetchError;

      const mappedServices = (data || []).map(service => ({
        id: service.service_id,
        name: service.name,
        price: Number(service.price_usd),
        description: service.description || ''
      }));

      setServices(mappedServices);
    } catch (err: any) {
      console.error('Erreur lors du chargement des services:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Chargement initial
    loadServices();

    // Configuration du canal Realtime pour les mises à jour en temps réel
    const channel = supabase
      .channel('cadastral-services-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Écoute INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'cadastral_services_config'
        },
        (payload) => {
          console.log('📡 Changement détecté dans cadastral_services_config:', payload);
          
          // Rechargement des services après tout changement
          loadServices();

          // Notification visuelle pour l'utilisateur
          if (payload.eventType === 'INSERT') {
            toast.success('Un nouveau service a été ajouté au catalogue', {
              description: 'Le catalogue a été mis à jour automatiquement'
            });
          } else if (payload.eventType === 'UPDATE') {
            toast.info('Le catalogue de services a été mis à jour', {
              description: 'Les prix ou descriptions ont pu changer'
            });
          } else if (payload.eventType === 'DELETE') {
            toast.warning('Un service a été retiré du catalogue', {
              description: 'Le catalogue a été actualisé'
            });
          }
        }
      )
      .subscribe();

    // Nettoyage à la désinscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    services,
    loading,
    error,
    refreshServices: loadServices
  };
};

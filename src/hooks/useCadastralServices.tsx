import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CadastralService {
  id: string;
  name: string;
  price: number;
  description: string;
  icon_name?: string | null;
  required_data_fields?: unknown;
  display_order?: number | null;
}

/**
 * Hook réactif pour gérer le catalogue de services cadastraux
 * avec synchronisation en temps réel via Supabase Realtime
 * Fix #13: Ajout du callback d'erreur sur subscribe()
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
        .is('deleted_at', null)
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;

      const mappedServices = (data || []).map(service => ({
        id: service.service_id,
        name: service.name,
        price: Number(service.price_usd),
        description: service.description || '',
        icon_name: service.icon_name ?? null,
        required_data_fields: service.required_data_fields ?? null,
        display_order: service.display_order ?? null,
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
    loadServices();

    const channel = supabase
      .channel('cadastral-services-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cadastral_services_config'
        },
        (payload) => {
          console.log('📡 Changement détecté dans cadastral_services_config:', payload);
          loadServices();

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
      .subscribe((status, err) => {
        if (err) {
          console.error('❌ Erreur Realtime cadastral_services_config:', err);
        }
        if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Canal Realtime en erreur, rechargement des services...');
          loadServices();
        }
      });

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

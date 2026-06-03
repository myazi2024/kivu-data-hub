import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CadastralServiceCategory } from '@/constants/cadastralServiceCategories';


export interface CadastralService {
  id: string;
  name: string;
  price: number;
  description: string;
  icon_name?: string | null;
  required_data_fields?: unknown;
  display_order?: number | null;
  category?: CadastralServiceCategory | string | null;
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
        category: (service.category as CadastralServiceCategory | string | null) ?? 'consultation',
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

    const channelName = `cadastral-services-changes-${crypto.randomUUID()}`;

    // Lot R : back-off exponentiel borné (max 3 retries, 2s → 8s) pour éviter
    // une boucle infinie de rechargements lors de coupures WS prolongées.
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const MAX_RETRIES = 3;

    // Lot X (B10) : debounce toast pour regrouper les rafales d'updates admin (1.5s).
    const pendingEvents = new Set<'INSERT' | 'UPDATE' | 'DELETE'>();
    let toastTimer: ReturnType<typeof setTimeout> | null = null;
    const flushToast = () => {
      if (pendingEvents.has('INSERT')) toast.success('Le catalogue de services a été enrichi');
      else if (pendingEvents.has('DELETE')) toast.warning('Un service a été retiré du catalogue');
      else if (pendingEvents.has('UPDATE')) toast.info('Le catalogue de services a été mis à jour');
      pendingEvents.clear();
      toastTimer = null;
    };

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cadastral_services_config' },
        (payload) => {
          loadServices();
          const t = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
          pendingEvents.add(t);
          if (toastTimer) clearTimeout(toastTimer);
          // Pas de toast quand l'onglet est en arrière-plan
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
          toastTimer = setTimeout(flushToast, 1500);
        }
      )

      .subscribe((status, err) => {
        if (err) {
          console.error('❌ Erreur Realtime cadastral_services_config:', err);
        }
        if (status === 'SUBSCRIBED') {
          retryCount = 0;
          return;
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (cancelled) return;
          if (retryCount >= MAX_RETRIES) {
            console.warn(`⚠️ Realtime ${status} : abandon après ${MAX_RETRIES} tentatives.`);
            return;
          }
          const delay = Math.min(2000 * Math.pow(2, retryCount), 8000);
          retryCount += 1;
          console.warn(`⚠️ Realtime ${status}, retry ${retryCount}/${MAX_RETRIES} dans ${delay}ms`);
          retryTimer = setTimeout(() => loadServices(), delay);
        }
      });

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
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

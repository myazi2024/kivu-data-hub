import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CadastralService {
  id: string;
  service_id: string;
  name: string;
  description: string | null;
  price_usd: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useCadastralServices = () => {
  const [services, setServices] = useState<CadastralService[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cadastral_services_config')
        .select('*')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('service_id', { ascending: true });

      if (error) throw error;
      
      setServices(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des services:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les services cadastraux",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const getTotalPrice = (selectedServiceIds: string[]) => {
    return services
      .filter(service => selectedServiceIds.includes(service.service_id))
      .reduce((sum, service) => sum + service.price_usd, 0);
  };

  const getServiceById = (serviceId: string) => {
    return services.find(service => service.service_id === serviceId);
  };

  return {
    services,
    loading,
    fetchServices,
    getTotalPrice,
    getServiceById
  };
};

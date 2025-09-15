import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CadastralService {
  id: string;
  name: string;
  price: number;
  description: string;
}

// Hook pour récupérer les services cadastraux depuis le backend sécurisé
export const useCadastralServices = () => {
  const [services, setServices] = useState<CadastralService[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchServices = async () => {
    if (services.length > 0) return services; // Cache simple
    
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('cadastral-services', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'get-services' })
      });

      if (error) throw error;
      
      if (data?.services) {
        const mappedServices = data.services.map((s: any) => ({
          id: s.service_id,
          name: s.name,
          price: s.price_usd,
          description: s.description
        }));
        setServices(mappedServices);
        return mappedServices;
      }
      return [];
    } catch (error) {
      console.error('Erreur lors du chargement des services:', error);
      // Fallback sur les services par défaut en cas d'erreur
      const fallbackServices = [
        {
          id: 'information',
          name: 'Informations générales',
          price: 3,
          description: 'Identité du propriétaire actuel, superficie exacte, statut juridique de la parcelle et coordonnées géographiques.'
        },
        {
          id: 'location_history',
          name: 'Localisation et Historique de bornage',
          price: 2,
          description: 'Position géographique précise, limites cadastrales, historique complet des opérations de bornage.'
        },
        {
          id: 'history',
          name: 'Historique complet des propriétaires',
          price: 3,
          description: 'Chaîne complète de propriété depuis la création de la parcelle, toutes les transactions.'
        },
        {
          id: 'obligations',
          name: 'Obligations fiscales et hypothécaires',
          price: 15,
          description: 'État détaillé des taxes foncières impayées, hypothèques en cours, servitudes.'
        }
      ];
      setServices(fallbackServices);
      return fallbackServices;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  return {
    services,
    loading,
    fetchServices
  };
};

// Fonction utilitaire pour obtenir les services de manière synchrone (avec fallback)
export const getCadastralServicesSync = (): CadastralService[] => {
  return [
    {
      id: 'information',
      name: 'Informations générales',
      price: 3,
      description: 'Identité du propriétaire actuel, superficie exacte, statut juridique de la parcelle et coordonnées géographiques.'
    },
    {
      id: 'location_history',
      name: 'Localisation et Historique de bornage',
      price: 2,
      description: 'Position géographique précise, limites cadastrales, historique complet des opérations de bornage.'
    },
    {
      id: 'history',
      name: 'Historique complet des propriétaires',
      price: 3,
      description: 'Chaîne complète de propriété depuis la création de la parcelle, toutes les transactions.'
    },
    {
      id: 'obligations',
      name: 'Obligations fiscales et hypothécaires',
      price: 15,
      description: 'État détaillé des taxes foncières impayées, hypothèques en cours, servitudes.'
    }
  ];
};
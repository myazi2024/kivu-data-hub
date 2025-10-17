import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCadastralServices } from '@/hooks/useCadastralServices';

export interface ServiceStats {
  serviceId: string;
  serviceName: string;
  count: number;
}

export const useCadastralStats = () => {
  const { services } = useCadastralServices();
  const [stats, setStats] = useState<ServiceStats[]>([]);
  const [totalQueries, setTotalQueries] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Récupérer toutes les factures payées
      const { data: invoices, error } = await supabase
        .from('cadastral_invoices')
        .select('selected_services')
        .eq('status', 'paid');

      if (error) throw error;

      // Compter les occurrences de chaque service
      const serviceCount: { [key: string]: number } = {};
      let total = 0;

      invoices?.forEach(invoice => {
        let services: string[] = [];
        
        // Gérer les différents formats de selected_services
        if (Array.isArray(invoice.selected_services)) {
          services = invoice.selected_services.filter((item): item is string => typeof item === 'string');
        } else if (typeof invoice.selected_services === 'string') {
          try {
            services = JSON.parse(invoice.selected_services);
          } catch {
            services = [];
          }
        }

        services.forEach(serviceId => {
          serviceCount[serviceId] = (serviceCount[serviceId] || 0) + 1;
          total++;
        });
      });

      // Créer les statistiques avec les noms des services depuis la DB
      const statsArray = services.map(service => ({
        serviceId: service.id,
        serviceName: service.name,
        count: serviceCount[service.id] || 0
      }));

      setStats(statsArray);
      setTotalQueries(total);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      // Initialiser avec des valeurs par défaut en cas d'erreur
      setStats(services.map(service => ({
        serviceId: service.id,
        serviceName: service.name,
        count: 0
      })));
      setTotalQueries(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (services.length > 0) {
      fetchStats();
    }

    // Écouter les événements de paiement pour actualiser les statistiques
    const handlePaymentCompleted = () => {
      setTimeout(() => fetchStats(), 500); // Petit délai pour laisser la base de données se mettre à jour
    };

    // Écouter les mises à jour de factures
    const handleInvoiceUpdated = () => {
      setTimeout(() => fetchStats(), 300);
    };

    // Écouter les nouveaux paiements
    const handleNewPayment = () => {
      setTimeout(() => fetchStats(), 300);
    };

    window.addEventListener('cadastralPaymentCompleted', handlePaymentCompleted);
    window.addEventListener('cadastralInvoiceUpdated', handleInvoiceUpdated);
    window.addEventListener('cadastralNewPayment', handleNewPayment);

    // Actualiser les statistiques toutes les 30 secondes pour capturer les changements
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);

    return () => {
      window.removeEventListener('cadastralPaymentCompleted', handlePaymentCompleted);
      window.removeEventListener('cadastralInvoiceUpdated', handleInvoiceUpdated);
      window.removeEventListener('cadastralNewPayment', handleNewPayment);
      clearInterval(interval);
    };
  }, [services]);

  return {
    stats,
    totalQueries,
    loading,
    refetch: fetchStats
  };
};
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import { CadastralService, useCadastralServices } from '@/hooks/useCadastralServices';

// Re-export for backward compatibility
export type { CadastralService };

/**
 * @deprecated Utilisez useCadastralServices() à la place pour avoir des données réactives
 * Cette variable globale est maintenue uniquement pour compatibilité ascendante
 */
export let CADASTRAL_SERVICES: CadastralService[] = [];

/**
 * @deprecated Utilisez useCadastralServices() à la place
 */
export const loadCadastralServices = async () => {
  console.warn('loadCadastralServices() est déprécié. Utilisez useCadastralServices() à la place.');
  try {
    const { data, error } = await supabase
      .from('cadastral_services_config')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    if (data && data.length > 0) {
      CADASTRAL_SERVICES = data.map(service => ({
        id: service.service_id,
        name: service.name,
        price: Number(service.price_usd),
        description: service.description || ''
      }));
    }
  } catch (error) {
    console.error('Error loading cadastral services from database:', error);
  }
};

export interface CadastralInvoice {
  id: string;
  parcel_number: string;
  search_date: string;
  selected_services: any; // Will be parsed from JSON
  total_amount_usd: number;
  status: string; // Database returns string, not restricted type
  invoice_number: string;
  client_name?: string | null;
  client_email: string;
  client_organization?: string | null;
  geographical_zone?: string | null;
  payment_method?: string | null;
  created_at: string;
  updated_at: string;
  discount_code_used?: string | null;
  discount_amount_usd?: number;
  original_amount_usd?: number;
}

export const useCadastralBilling = () => {
  const [loading, setLoading] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<CadastralInvoice[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<CadastralInvoice | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Utiliser le hook réactif pour les services
  const { services: catalogServices } = useCadastralServices();

  // Synchroniser la variable globale deprecated pour compatibilité
  useEffect(() => {
    if (catalogServices.length > 0) {
      CADASTRAL_SERVICES = catalogServices;
    }
  }, [catalogServices]);

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const getTotalAmount = () => {
    return selectedServices.reduce((total, serviceId) => {
      const service = catalogServices.find(s => s.id === serviceId);
      return total + (service?.price || 0);
    }, 0);
  };

  const createInvoice = async (searchResult: CadastralSearchResult, discountData?: {
    code: string;
    amount: number;
    reseller_id: string | null;
    code_id: string;
  }) => {
    if (selectedServices.length === 0) {
      toast({
        title: "Aucun service sélectionné",
        description: "Veuillez sélectionner au moins un service",
        variant: "destructive"
      });
      return null;
    }

    try {
      setLoading(true);

      const originalAmount = getTotalAmount();
      const discountAmount = discountData?.amount || 0;
      const finalAmount = Math.max(0, originalAmount - discountAmount);
      const geographicalZone = `${searchResult.parcel?.commune || ''}, ${searchResult.parcel?.quartier || ''}, ${searchResult.parcel?.province || ''}`.replace(/^,\s*|,\s*$/g, '');

      // Pour les tests, créer une facture simulée sans base de données
      const simulatedInvoice: CadastralInvoice = {
        id: `test-${Date.now()}`,
        parcel_number: searchResult.parcel.parcel_number,
        search_date: new Date().toISOString(),
        selected_services: selectedServices,
        total_amount_usd: finalAmount,
        client_email: user?.email || 'guest@example.com',
        geographical_zone: geographicalZone,
        invoice_number: `INV-TEST-${Date.now()}`,
        status: 'pending',
        client_name: user?.user_metadata?.full_name || null,
        client_organization: null,
        payment_method: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        discount_code_used: discountData?.code || null,
        discount_amount_usd: discountAmount,
        original_amount_usd: originalAmount
      };

      setCurrentInvoice(simulatedInvoice);

      // Stocker les données de facture dans le localStorage pour la récupération par la facture
      localStorage.setItem('currentCadastralInvoice', JSON.stringify(simulatedInvoice));

      toast({
        title: "Accès accordé (mode test)",
        description: discountData ? 
          `Code de remise appliqué ! Économie de ${discountAmount.toFixed(2)} USD` :
          "Vous pouvez maintenant consulter les données cadastrales"
      });

      // Déclencher l'événement pour mettre à jour les statistiques même en mode test
      window.dispatchEvent(new CustomEvent('cadastralNewPayment'));

      return simulatedInvoice;
    } catch (error) {
      console.error('Erreur lors de la création de la facture:', error);
      toast({
        title: "Erreur de facturation",
        description: "Une erreur s'est produite lors de la création de la facture",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInvoices = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cadastral_invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Transform the data to ensure selected_services is an array
      const transformedData = (data || []).map(invoice => ({
        ...invoice,
        selected_services: Array.isArray(invoice.selected_services) 
          ? invoice.selected_services 
          : JSON.parse(invoice.selected_services as string || '[]')
      })) as CadastralInvoice[];
      setInvoices(transformedData);
    } catch (error) {
      console.error('Erreur lors de la récupération des factures:', error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger l'historique des factures",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkServiceAccess = async (parcelNumber: string, serviceType: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('cadastral_service_access')
        .select('*')
        .eq('user_id', user.id)
        .eq('parcel_number', parcelNumber)
        .eq('service_type', serviceType)
        .maybeSingle();

      if (error) throw error;
      
      // Check if access has expired
      if (data?.expires_at) {
        return new Date(data.expires_at) > new Date();
      }
      
      return !!data;
    } catch (error) {
      console.error('Erreur lors de la vérification d\'accès:', error);
      return false;
    }
  };

  const updateInvoiceStatus = async (invoiceId: string, status: 'paid' | 'failed', paymentId?: string) => {
    try {
      // Pour les paiements de test, ne pas essayer de mettre à jour la base de données
      if (invoiceId.startsWith('test-')) {
        console.log('Paiement de test - pas de mise à jour en base');
        toast({
          title: status === 'paid' ? "Paiement de test réussi" : "Paiement de test échoué",
          description: status === 'paid' 
            ? "Mode test - Vos services sont simulés"
            : "Le paiement de test n'a pas pu être traité",
          variant: status === 'paid' ? "default" : "destructive"
        });
        
        // Déclencher un événement pour actualiser les statistiques même en mode test
        if (status === 'paid') {
          window.dispatchEvent(new CustomEvent('cadastralPaymentCompleted'));
        }
        return;
      }

      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (paymentId) updateData.payment_id = paymentId;

      const { error } = await supabase
        .from('cadastral_invoices')
        .update(updateData)
        .eq('id', invoiceId);

      if (error) throw error;

      // If payment successful, grant service access
      if (status === 'paid' && currentInvoice) {
        const accessPromises = selectedServices.map(serviceType => 
          supabase
            .from('cadastral_service_access')
            .insert({
              user_id: user?.id,
              invoice_id: invoiceId,
              parcel_number: currentInvoice.parcel_number,
              service_type: serviceType
            })
        );

        await Promise.all(accessPromises);
      }

      toast({
        title: status === 'paid' ? "Paiement réussi" : "Paiement échoué",
        description: status === 'paid' 
          ? "Vos services sont maintenant accessibles"
          : "Le paiement n'a pas pu être traité",
        variant: status === 'paid' ? "default" : "destructive"
      });

      // Déclencher un événement pour actualiser les statistiques
      if (status === 'paid') {
        window.dispatchEvent(new CustomEvent('cadastralPaymentCompleted'));
        window.dispatchEvent(new CustomEvent('cadastralInvoiceUpdated'));
      }

    } catch (error) {
      console.error('Erreur lors de la mise à jour de la facture:', error);
    }
  };

  const resetBillingState = () => {
    setSelectedServices([]);
    setCurrentInvoice(null);
  };

  return {
    loading,
    selectedServices,
    invoices,
    currentInvoice,
    catalogServices, // Services réactifs du catalogue
    toggleService,
    getTotalAmount,
    createInvoice,
    fetchUserInvoices,
    checkServiceAccess,
    updateInvoiceStatus,
    resetBillingState,
    setCurrentInvoice
  };
};
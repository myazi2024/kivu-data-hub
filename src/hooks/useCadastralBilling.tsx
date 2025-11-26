import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
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
  selected_services: any;
  total_amount_usd: number;
  status: string;
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
  
  // Hooks pour configuration
  const { services: catalogServices } = useCadastralServices();
  const { 
    paymentMode, 
    availableMethods, 
    loading: configLoading,
    isPaymentRequired 
  } = usePaymentConfig();

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
    reseller_id: string;
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

    // Vérifier si des méthodes de paiement sont configurées (en mode production uniquement)
    if (isPaymentRequired() && !availableMethods.hasAnyMethod) {
      toast({
        title: "Moyens de paiement non configurés",
        description: "Aucun moyen de paiement n'est actuellement disponible. Veuillez contacter l'administrateur.",
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

      // MODE TEST : bypass_payment activé OU paiement désactivé
      if (!isPaymentRequired()) {
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
        localStorage.setItem('currentCadastralInvoice', JSON.stringify(simulatedInvoice));

        toast({
          title: "Accès accordé (Mode Test)",
          description: paymentMode.bypass_payment 
            ? "Paiement contourné - Mode développement activé"
            : "Paiement désactivé - Accès gratuit aux services"
        });

        window.dispatchEvent(new CustomEvent('cadastralNewPayment'));
        return simulatedInvoice;
      }

      // MODE PRODUCTION : Créer une vraie facture en base de données
      if (!user) {
        toast({
          title: "Authentification requise",
          description: "Veuillez vous connecter pour créer une facture",
          variant: "destructive"
        });
        return null;
      }

      // Appeler la fonction RPC sécurisée pour créer la facture
      const { data: invoiceData, error: rpcError } = await supabase.rpc(
        'create_cadastral_invoice_secure',
        {
          parcel_number_param: searchResult.parcel.parcel_number,
          selected_services_param: selectedServices,
          discount_code_param: discountData?.code || null
        }
      );

      if (rpcError) {
        console.error('Erreur RPC création facture:', rpcError);
        throw new Error(rpcError.message || 'Erreur lors de la création de la facture');
      }

      if (!invoiceData || invoiceData.length === 0) {
        throw new Error('Aucune donnée de facture retournée');
      }

      const invoiceResult = invoiceData[0];

      if (invoiceResult.error_message) {
        toast({
          title: "Erreur de facturation",
          description: invoiceResult.error_message,
          variant: "destructive"
        });
        return null;
      }

      // Récupérer la facture complète créée
      const { data: fullInvoice, error: fetchError } = await supabase
        .from('cadastral_invoices')
        .select('*')
        .eq('id', invoiceResult.invoice_id)
        .single();

      if (fetchError || !fullInvoice) {
        console.error('Erreur récupération facture:', fetchError);
        throw new Error('Impossible de récupérer la facture créée');
      }

      // Transformer pour le format attendu
      const transformedInvoice: CadastralInvoice = {
        ...fullInvoice,
        selected_services: Array.isArray(fullInvoice.selected_services)
          ? fullInvoice.selected_services
          : JSON.parse(fullInvoice.selected_services as string || '[]')
      };

      setCurrentInvoice(transformedInvoice);

      toast({
        title: "Facture créée",
        description: discountData
          ? `Code de remise appliqué ! Économie de ${discountAmount.toFixed(2)} USD`
          : `Facture #${transformedInvoice.invoice_number} créée avec succès`,
      });

      window.dispatchEvent(new CustomEvent('cadastralNewPayment'));
      return transformedInvoice;

    } catch (error) {
      console.error('Erreur lors de la création de la facture:', error);
      toast({
        title: "Erreur de facturation",
        description: error instanceof Error ? error.message : "Une erreur s'est produite",
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
    // En mode test, accorder l'accès automatiquement
    if (!isPaymentRequired()) {
      return true;
    }

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
        
        if (status === 'paid') {
          window.dispatchEvent(new CustomEvent('cadastralPaymentCompleted'));
        }
        return;
      }

      // Mode production : mise à jour réelle en base
      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (paymentId) updateData.payment_id = paymentId;

      const { error } = await supabase
        .from('cadastral_invoices')
        .update(updateData)
        .eq('id', invoiceId);

      if (error) throw error;

      // Si paiement réussi, accorder l'accès aux services
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

      if (status === 'paid') {
        window.dispatchEvent(new CustomEvent('cadastralPaymentCompleted'));
        window.dispatchEvent(new CustomEvent('cadastralInvoiceUpdated'));
      }

    } catch (error) {
      console.error('Erreur lors de la mise à jour de la facture:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut de la facture",
        variant: "destructive"
      });
    }
  };

  const resetBillingState = () => {
    setSelectedServices([]);
    setCurrentInvoice(null);
  };

  return {
    loading: loading || configLoading,
    selectedServices,
    invoices,
    currentInvoice,
    catalogServices,
    paymentMode,
    availableMethods,
    isPaymentRequired,
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

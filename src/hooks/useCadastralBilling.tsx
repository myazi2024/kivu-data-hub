import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import { type CadastralService } from '@/hooks/useCadastralServices';

// Interface pour les factures cadastrales uniquement
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
  const [availableServices, setAvailableServices] = useState<CadastralService[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  // Charger les services depuis le backend sécurisé
  const fetchServices = async () => {
    if (availableServices.length > 0) return; // Éviter les rechargements

    try {
      const { data, error } = await supabase.functions.invoke('cadastral-services', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (error) throw error;
      
      if (data?.services) {
        const services = data.services.map((s: any) => ({
          id: s.service_id,
          name: s.name,
          price: s.price_usd,
          description: s.description
        }));
        setAvailableServices(services);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des services:', error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les services disponibles",
        variant: "destructive"
      });
    }
  };

  // Charger les services au montage
  useEffect(() => {
    fetchServices();
  }, []);

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const getTotalAmount = () => {
    return selectedServices.reduce((total, serviceId) => {
      const service = availableServices.find(s => s.id === serviceId);
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

    try {
      setLoading(true);

      // Appeler l'edge function sécurisée pour créer la facture
      const { data, error } = await supabase.functions.invoke('cadastral-services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parcel_number: searchResult.parcel.parcel_number,
          selected_services: selectedServices,
          discount_code: discountData?.code
        })
      });

      if (error) {
        throw new Error(error.message || 'Erreur lors de la création de la facture');
      }

      if (data?.error) {
        toast({
          title: "Erreur de facturation",
          description: data.error,
          variant: "destructive"
        });
        return null;
      }

      const invoiceData = data.invoice;
      
      // Créer l'objet facture avec les données validées du serveur
      const invoice: CadastralInvoice = {
        id: invoiceData.id,
        parcel_number: searchResult.parcel.parcel_number,
        search_date: new Date().toISOString(),
        selected_services: selectedServices,
        total_amount_usd: invoiceData.total_amount_usd,
        original_amount_usd: invoiceData.original_amount_usd,
        discount_amount_usd: invoiceData.discount_amount_usd,
        discount_code_used: invoiceData.discount_code_used,
        client_email: user?.email || '',
        geographical_zone: `${searchResult.parcel?.commune || ''}, ${searchResult.parcel?.quartier || ''}, ${searchResult.parcel?.province || ''}`.replace(/^,\s*|,\s*$/g, ''),
        invoice_number: invoiceData.invoice_number,
        status: invoiceData.status,
        client_name: user?.user_metadata?.full_name || null,
        client_organization: null,
        payment_method: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setCurrentInvoice(invoice);

      toast({
        title: "Facture créée avec succès",
        description: invoiceData.discount_amount_usd > 0 ? 
          `Code de remise appliqué ! Économie de ${invoiceData.discount_amount_usd.toFixed(2)} USD` :
          "Facture générée, vous pouvez procéder au paiement"
      });

      return invoice;
    } catch (error) {
      console.error('Erreur lors de la création de la facture:', error);
      toast({
        title: "Erreur de facturation",
        description: error instanceof Error ? error.message : "Une erreur s'est produite lors de la création de la facture",
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
      // Utiliser l'edge function sécurisée pour vérifier l'accès
      const { data, error } = await supabase.functions.invoke('cadastral-services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parcel_number: parcelNumber,
          service_type: serviceType
        })
      });

      if (error) {
        console.error('Erreur lors de la vérification d\'accès:', error);
        return false;
      }

      return data?.hasAccess || false;
    } catch (error) {
      console.error('Erreur lors de la vérification d\'accès:', error);
      return false;
    }
  };

  const updateInvoiceStatus = async (invoiceId: string, status: 'paid' | 'failed', paymentId?: string) => {
    try {
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
    availableServices,
    toggleService,
    getTotalAmount,
    createInvoice,
    fetchUserInvoices,
    checkServiceAccess,
    updateInvoiceStatus,
    resetBillingState,
    setCurrentInvoice,
    fetchServices
  };
};
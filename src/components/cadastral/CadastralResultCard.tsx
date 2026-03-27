import React, { useState, useRef } from 'react';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import { useCadastralServices } from '@/hooks/useCadastralServices';
import { checkMultipleServiceAccess } from '@/utils/checkServiceAccess';
import { useAuth } from '@/hooks/useAuth';
import CadastralBillingPanel from './CadastralBillingPanel';
import CadastralInvoice from './CadastralInvoice';
import CadastralContributionDialog from './CadastralContributionDialog';
import CadastralDocumentView from './CadastralDocumentView';
import { supabase } from '@/integrations/supabase/client';

interface CadastralResultCardProps {
  result: CadastralSearchResult;
  onClose: () => void;
  selectedServices?: string[];
  onPaymentSuccess?: (services: string[]) => void;
}

const CadastralResultCard: React.FC<CadastralResultCardProps> = ({ result, onClose, selectedServices = [], onPaymentSuccess }) => {
  const [showBillingPanel, setShowBillingPanel] = useState(true);
  const [paidServices, setPaidServices] = useState<string[]>([]);
  const [showInvoice, setShowInvoice] = useState(false);
  const [preselectServiceId, setPreselectServiceId] = useState<string | undefined>(undefined);
  const [invoiceFormat, setInvoiceFormat] = useState<'mini' | 'a4'>('a4');
  const [showContributionDialog, setShowContributionDialog] = useState(false);
  const { parcel, ownership_history, tax_history, mortgage_history, boundary_history, building_permits } = result;
  const { services: catalogServices } = useCadastralServices();
  const { user } = useAuth();

  const catalogServiceIdsRef = useRef<string[]>([]);
  React.useEffect(() => {
    if (catalogServices.length > 0) {
      catalogServiceIdsRef.current = catalogServices.map(s => s.id);
    }
  }, [catalogServices]);

  const checkAllServices = React.useCallback(async () => {
    if (!user || catalogServiceIdsRef.current.length === 0) return;
    
    const paidServicesList = await checkMultipleServiceAccess(
      user.id,
      parcel.parcel_number,
      catalogServiceIdsRef.current
    );
    
    if (paidServicesList.length > 0) {
      setPaidServices(paidServicesList);
      if (paidServicesList.length >= catalogServiceIdsRef.current.length) {
        setShowBillingPanel(false);
      }
    }
  }, [user, parcel.parcel_number]);

  React.useEffect(() => {
    checkAllServices();
  }, [checkAllServices]);

  React.useEffect(() => {
    const handlePaymentCompleted = () => {
      checkAllServices();
    };
    window.addEventListener('cadastralPaymentCompleted', handlePaymentCompleted);
    return () => {
      window.removeEventListener('cadastralPaymentCompleted', handlePaymentCompleted);
    };
  }, [checkAllServices]);

  const handlePaymentSuccess = (services: string[]) => {
    const updatedServices = [...new Set([...paidServices, ...services])];
    setPaidServices(updatedServices);
    
    if (updatedServices.length >= catalogServiceIdsRef.current.length) {
      setShowBillingPanel(false);
    }
    
    setShowInvoice(true);
    
    if (onPaymentSuccess) {
      onPaymentSuccess(updatedServices);
    }
  };

  const handleDownloadPDF = () => {
    const fetchAndGeneratePDF = async () => {
      try {
        const { data: dbInvoice } = await supabase
          .from('cadastral_invoices')
          .select('*')
          .eq('parcel_number', result.parcel.parcel_number)
          .eq('user_id', user?.id || '')
          .eq('status', 'paid')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!dbInvoice) {
          const { toast } = await import('sonner');
          toast.error('Aucune facture payée trouvée pour cette parcelle');
          return;
        }

        const invoice = {
          id: dbInvoice.id,
          user_id: dbInvoice.user_id,
          invoice_number: dbInvoice.invoice_number,
          parcel_number: dbInvoice.parcel_number,
          selected_services: Array.isArray(dbInvoice.selected_services) 
            ? dbInvoice.selected_services as string[]
            : typeof dbInvoice.selected_services === 'string' 
              ? JSON.parse(dbInvoice.selected_services as string) 
              : [],
          search_date: dbInvoice.search_date || dbInvoice.created_at,
          total_amount_usd: Number(dbInvoice.total_amount_usd),
          status: dbInvoice.status,
          created_at: dbInvoice.created_at,
          updated_at: dbInvoice.updated_at,
          client_name: dbInvoice.client_name,
          client_email: dbInvoice.client_email,
          client_organization: dbInvoice.client_organization || null,
          geographical_zone: dbInvoice.geographical_zone || `${result.parcel.commune}, ${result.parcel.quartier}`,
          discount_amount_usd: Number(dbInvoice.discount_amount_usd || 0),
          original_amount_usd: Number(dbInvoice.original_amount_usd || dbInvoice.total_amount_usd),
          payment_method: dbInvoice.payment_method
        };

        const { generateInvoicePDF } = await import('@/lib/pdf');
        generateInvoicePDF(invoice, catalogServices, invoiceFormat);
      } catch (e) {
        console.error('Error generating PDF from DB invoice:', e);
      }
    };
    
    fetchAndGeneratePDF();
  };

  const handleDownloadReport = () => {
    import('@/lib/pdf').then(({ generateCadastralReport }) => {
      generateCadastralReport(result, paidServices, catalogServices);
    });
  };

  if (showBillingPanel) {
    return (
      <>
        <CadastralBillingPanel 
          searchResult={result} 
          onPaymentSuccess={(services) => handlePaymentSuccess(services)} 
          preselectServiceId={preselectServiceId}
          onClose={onClose}
          onRequestContribution={() => setShowContributionDialog(true)}
          alreadyPaidServices={paidServices}
        />
        <CadastralContributionDialog
          open={showContributionDialog}
          onOpenChange={setShowContributionDialog}
          parcelNumber={result.parcel.parcel_number}
        />
      </>
    );
  }

  return (
    <>
      <CadastralDocumentView
        result={result}
        paidServices={paidServices}
        catalogServices={catalogServices}
        onDownloadReport={handleDownloadReport}
        onBackToCatalog={() => setShowBillingPanel(true)}
      />
      <CadastralInvoice
        isOpen={showInvoice}
        onClose={() => setShowInvoice(false)}
        result={result}
        paidServices={paidServices}
        onDownloadPDF={handleDownloadPDF}
      />
    </>
  );
};

export default CadastralResultCard;
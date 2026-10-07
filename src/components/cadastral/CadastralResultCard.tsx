import React, { useState, useMemo } from 'react';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import { useCadastralServices } from '@/hooks/useCadastralServices';
import { activeServices, EMPTY_ACCESS } from '@/lib/cadastralResultAccess';
import { useAuth } from '@/hooks/useAuth';
import CadastralBillingPanel from './CadastralBillingPanel';
import CadastralInvoice from './CadastralInvoice';
import CadastralContributionDialog from './CadastralContributionDialog';
import CadastralDocumentView from './CadastralDocumentView';
import { supabase } from '@/integrations/supabase/client';
import { useInvoiceTemplateConfig } from '@/hooks/useInvoiceTemplateConfig';

interface CadastralResultCardProps {
  result: CadastralSearchResult;
  onClose: () => void;
  onPaymentSuccess?: (services: string[]) => void;
}

const CadastralResultCard: React.FC<CadastralResultCardProps> = ({ result, onClose, onPaymentSuccess }) => {
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);
  const [showBillingPanel, setShowBillingPanel] = useState(true);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceFormat, setInvoiceFormat] = useState<'mini' | 'a4'>('a4');
  const [showContributionDialog, setShowContributionDialog] = useState(false);
  const { parcel } = result;
  const { services: catalogServices } = useCadastralServices();
  const { user } = useAuth();
  const { config: invoiceTplConfig } = useInvoiceTemplateConfig();

  // Services achetés : uniquement la liste calculée par le serveur (rechargée après paiement).
  const paidServices = useMemo(() => activeServices(result.access ?? EMPTY_ACCESS), [result.access]);

  React.useEffect(() => {
    if (invoiceTplConfig?.default_format) {
      setInvoiceFormat(invoiceTplConfig.default_format);
    }
  }, [invoiceTplConfig?.default_format]);

  // Tout le catalogue déjà acquis pour cette parcelle : afficher directement la fiche.
  const catalogIdsKey = catalogServices.map((s) => s.id).join(',');
  React.useEffect(() => {
    if (catalogServices.length > 0 && catalogServices.every((s) => paidServices.includes(s.id))) {
      setShowBillingPanel(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogIdsKey, paidServices]);

  const handlePaymentSuccess = (services: string[]) => {
    setShowBillingPanel(false);
    setShowInvoice(true);
    onPaymentSuccess?.([...new Set([...paidServices, ...services])]);
  };

  const handleDownloadPDF = async () => {
    if (isDownloadingInvoice) return;
    setIsDownloadingInvoice(true);
    const { toast } = await import('sonner');
    const loadingId = toast.loading('Génération du justificatif PDF…');
    try {
      const { data: dbInvoice, error } = await supabase
        .from('cadastral_invoices')
        .select('*')
        .eq('parcel_number', result.parcel.parcel_number)
        .eq('user_id', user?.id || '')
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!dbInvoice) {
        toast.dismiss(loadingId);
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
        client_type: dbInvoice.client_type || null,
        client_address: dbInvoice.client_address || null,
        client_nif: dbInvoice.client_nif || null,
        client_rccm: dbInvoice.client_rccm || null,
        client_id_nat: dbInvoice.client_id_nat || null,
        client_tax_regime: dbInvoice.client_tax_regime || null,
        geographical_zone: dbInvoice.geographical_zone || `${result.parcel.commune}, ${result.parcel.quartier}`,
        discount_amount_usd: Number(dbInvoice.discount_amount_usd || 0),
        discount_code_used: dbInvoice.discount_code_used || null,
        original_amount_usd: Number(dbInvoice.original_amount_usd || dbInvoice.total_amount_usd),
        currency_code: dbInvoice.currency_code || 'USD',
        exchange_rate_used: Number(dbInvoice.exchange_rate_used || 1),
        paid_at: dbInvoice.paid_at || null,
        payment_method: dbInvoice.payment_method,
        invoice_signature: dbInvoice.invoice_signature || null,
        dgi_validation_code: dbInvoice.dgi_validation_code || null,
      };

      const { downloadInvoicePDF } = await import('@/lib/invoiceDownload');
      await downloadInvoicePDF(invoice, { format: invoiceFormat, services: catalogServices });
      toast.dismiss(loadingId);
      toast.success('Justificatif PDF téléchargé');
    } catch (e) {
      console.error('Error generating PDF from DB invoice:', e);
      toast.dismiss(loadingId);
      toast.error("Impossible de générer le PDF. Veuillez réessayer.");
    } finally {
      setIsDownloadingInvoice(false);
    }
  };

  const handleDownloadReport = () => {
    import('@/lib/pdf').then(({ generateCadastralReport }) => {
      generateCadastralReport(result, catalogServices);
    });
  };

  if (showBillingPanel) {
    return (
      <>
        <CadastralBillingPanel 
          searchResult={result} 
          onPaymentSuccess={(services) => handlePaymentSuccess(services)} 
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
        onDownloadReport={handleDownloadReport}
        onBackToCatalog={() => setShowBillingPanel(true)}
      />
      <CadastralInvoice
        isOpen={showInvoice}
        onClose={() => setShowInvoice(false)}
        result={result}
        paidServices={paidServices}
        onDownloadPDF={handleDownloadPDF}
        isDownloadingPDF={isDownloadingInvoice}
      />
    </>
  );
};

export default CadastralResultCard;
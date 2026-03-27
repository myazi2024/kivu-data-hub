import React, { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import { useCadastralServices } from '@/hooks/useCadastralServices';
import { checkMultipleServiceAccess } from '@/utils/checkServiceAccess';
import { useAuth } from '@/hooks/useAuth';
import CadastralBillingPanel from './CadastralBillingPanel';
import CadastralInvoice from './CadastralInvoice';
import CadastralContributionDialog from './CadastralContributionDialog';
import CadastralDocumentView from './CadastralDocumentView';
import { supabase } from '@/integrations/supabase/client';

const DisputesContent: React.FC<{ parcelNumber: string }> = ({ parcelNumber }) => {
  const [disputes, setDisputes] = React.useState<any[]>([]);
  const [loadingD, setLoadingD] = React.useState(true);
  React.useEffect(() => {
    (async () => {
      setLoadingD(true);
      try {
        const { data } = await (supabase as any).from('cadastral_land_disputes').select('*').eq('parcel_number', parcelNumber).eq('dispute_type', 'report').order('created_at', { ascending: false });
        if (data) setDisputes(data);
      } catch (e) { console.error(e); }
      finally { setLoadingD(false); }
    })();
  }, [parcelNumber]);
  if (loadingD) return <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (disputes.length === 0) return (
    <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
      <div><span className="text-xs font-medium block">Aucun litige foncier enregistré</span><span className="text-[10px] text-muted-foreground">Cette parcelle ne fait l'objet d'aucun litige connu</span></div>
    </div>
  );
  return (
    <div className="space-y-3">{disputes.map((d: any) => (
      <Card key={d.id} className="border-0 bg-gradient-to-br from-background to-primary/5">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between"><Badge variant="destructive" className="text-[10px]">{d.dispute_nature}</Badge><span className="text-[10px] font-mono text-muted-foreground">{d.reference_number}</span></div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Statut :</span><span className="font-medium">{d.current_status}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Déclarant :</span><span>{d.declarant_name}</span></div>
            {d.dispute_start_date && <div className="flex justify-between"><span className="text-muted-foreground">Depuis :</span><span>{new Date(d.dispute_start_date).toLocaleDateString('fr-FR')}</span></div>}
            {d.dispute_description && <p className="text-[10px] text-muted-foreground mt-1">{d.dispute_description}</p>}
          </div>
        </CardContent>
      </Card>
    ))}</div>
  );
};

interface CadastralResultCardProps {
  result: CadastralSearchResult;
  onClose: () => void;
  selectedServices?: string[]; // Services sélectionnés depuis le billing panel
  onPaymentSuccess?: (services: string[]) => void;
}

const CadastralResultCard: React.FC<CadastralResultCardProps> = ({ result, onClose, selectedServices = [], onPaymentSuccess }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [obligationsTab, setObligationsTab] = useState('taxes');
  const [showBillingPanel, setShowBillingPanel] = useState(true);
  const [paidServices, setPaidServices] = useState<string[]>([]);
  const [showInvoice, setShowInvoice] = useState(false);
  const [preselectServiceId, setPreselectServiceId] = useState<string | undefined>(undefined);
  const [invoiceFormat, setInvoiceFormat] = useState<'mini' | 'a4'>('a4');
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [showContributionDialog, setShowContributionDialog] = useState(false);
  const lastScrollYRef = useRef(0);
  const { parcel, ownership_history, tax_history, mortgage_history, boundary_history, building_permits } = result;
  const { services: catalogServices } = useCadastralServices();
  const { user } = useAuth();

  // Fix #17: Utiliser un ref callback au lieu de querySelector fragile
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    const handleScroll = () => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const currentScrollY = el.scrollTop || 0;
      const scrollDirection = currentScrollY > lastScrollYRef.current ? 'down' : 'up';
      
      if (scrollDirection === 'down' && currentScrollY > 50) {
        setIsHeaderHidden(true);
      } else if (scrollDirection === 'up' && currentScrollY <= 30) {
        setIsHeaderHidden(false);
      }
      
      lastScrollYRef.current = currentScrollY;
    };

    // Trouver le conteneur scrollable le plus proche
    const findScrollContainer = () => {
      const card = document.getElementById('cadastral-result-card');
      if (!card) return null;
      let parent = card.parentElement;
      while (parent) {
        const style = getComputedStyle(parent);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') return parent;
        parent = parent.parentElement;
      }
      return null;
    };

    const container = findScrollContainer();
    if (container) {
      scrollContainerRef.current = container;
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Fix #3: Utiliser les IDs dynamiques du catalogue au lieu de hardcoder
  // Fix #9: Écouter l'événement cadastralPaymentCompleted pour re-vérifier
  // Fix #19: Stabiliser le callback pour ne pas re-vérifier à chaque changement Realtime
  // On utilise les IDs du catalogue seulement une fois au montage ou quand la parcelle change
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
      // Fix #9: Ne masquer le billing panel que si TOUS les services sont payés
      if (paidServicesList.length >= catalogServiceIdsRef.current.length) {
        setShowBillingPanel(false);
      }
    }
  }, [user, parcel.parcel_number]);

  React.useEffect(() => {
    checkAllServices();
  }, [checkAllServices]);

  // Fix #9: Re-vérifier les accès après un paiement réussi
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
    // En mode test: ajouter les nouveaux services aux services déjà payés
    const updatedServices = [...new Set([...paidServices, ...services])];
    setPaidServices(updatedServices);
    
    // Fix #2: Ne masquer le billing panel que si TOUS les services du catalogue sont payés
    if (updatedServices.length >= catalogServiceIdsRef.current.length) {
      setShowBillingPanel(false);
    }
    
    // Afficher automatiquement la facture
    setShowInvoice(true);
    
    // Définir l'onglet par défaut selon les services nouvellement sélectionnés
    if (services.includes('information')) setActiveTab('general');
    else if (services.includes('location_history')) setActiveTab('location');
    else if (services.includes('history')) setActiveTab('history');
    else if (services.includes('obligations')) setActiveTab('obligations');
    else if (services.includes('land_disputes')) setActiveTab('disputes');
    
    // Notifier le parent avec tous les services payés
    if (onPaymentSuccess) {
      onPaymentSuccess(updatedServices);
    }
  };

  // Check if user has access to a specific service
  const hasServiceAccess = (serviceType: string) => {
    return paidServices.includes(serviceType);
  };

  // Fix: Utiliser les données réelles de la facture DB au lieu de recalculer localement
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

  // Fix #1: Utilise catalogServices réactifs au lieu de la variable globale deprecated
  const handleDownloadReport = () => {
    import('@/lib/pdf').then(({ generateCadastralReport }) => {
      generateCadastralReport(result, paidServices, catalogServices);
    });
  };

  // Fonction pour formater les dates
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // Fonction pour formater la superficie
  const formatArea = (sqm: number) => {
    if (sqm >= 10000) {
      return `${(sqm / 10000).toFixed(2)} ha (${sqm.toLocaleString()} m²)`;
    }
    return `${sqm.toLocaleString()} m²`;
  };

  // Fonction pour obtenir l'icône du statut de paiement
  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'overdue':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  // Fonction pour obtenir la couleur du badge de statut
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'overdue':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Fonction pour traduire le statut de paiement
  const translatePaymentStatus = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Payé';
      case 'overdue':
        return 'En retard';
      case 'pending':
        return 'En attente';
      default:
        return status;
    }
  };

  // Calculer le statut fiscal global
  const getOverallTaxStatus = () => {
    const overdueTaxes = tax_history.filter(tax => tax.payment_status === 'overdue');
    const pendingTaxes = tax_history.filter(tax => tax.payment_status === 'pending');
    
    if (overdueTaxes.length > 0) return { status: 'overdue', count: overdueTaxes.length };
    if (pendingTaxes.length > 0) return { status: 'pending', count: pendingTaxes.length };
    return { status: 'up_to_date', count: 0 };
  };

  // Fix #7: Utiliser surface_calculee_bornes de la DB si disponible, sinon calcul client
  const calculateSurfaceFromBounds = () => {
    // Priorité à la valeur pré-calculée en DB
    if (parcel.surface_calculee_bornes && parcel.surface_calculee_bornes > 0) {
      return parcel.surface_calculee_bornes;
    }
    
    const coords = parcel.gps_coordinates;
    if (!coords || !Array.isArray(coords) || coords.length < 3) return null;
    
    let area = 0;
    const n = coords.length;
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const coord_i = coords[i] as { lat: number; lng: number };
      const coord_j = coords[j] as { lat: number; lng: number };
      area += coord_i.lat * coord_j.lng;
      area -= coord_j.lat * coord_i.lng;
    }
    
    return Math.abs(area) / 2 * 111319.5 * 111319.5;
  };

  const taxStatus = getOverallTaxStatus();

  // Show billing panel if user requests it or hasn't paid any services initially
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
import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  User, 
  Calendar, 
  DollarSign, 
  FileText, 
  Download, 
  Map,
  Building,
  Clock,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  XCircle,
  CreditCard,
  Landmark,
  Receipt,
  Calculator,
  MapPin as Surveyor,
  Printer,
  Settings,
  FileCheck,
  ExternalLink,
  Info,
  Hash,
  Scale
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import { useCadastralServices } from '@/hooks/useCadastralServices';
import { TVA_RATE } from '@/constants/billing';
import { checkMultipleServiceAccess } from '@/utils/checkServiceAccess';
import { useAuth } from '@/hooks/useAuth';
import CadastralMap from './CadastralMap';
import CadastralBillingPanel from './CadastralBillingPanel';
import CadastralInvoice from './CadastralInvoice';
import DocumentAttachment from './DocumentAttachment';
import { PROPERTY_TITLE_TYPES } from './PropertyTitleTypeSelect';
import CadastralContributionDialog from './CadastralContributionDialog';
import LockedServiceOverlay from './LockedServiceOverlay';
import VerificationButton from './VerificationButton';
import { Loader2 } from 'lucide-react';
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

  // Fix #3: Utiliser le vrai invoice_number de la DB si disponible au lieu de fabriquer un faux
  const handleDownloadPDF = () => {
    const selectedServicesList = catalogServices.filter(s => paidServices.includes(s.id));
    const subtotal = selectedServicesList.reduce((sum, service) => sum + Number(service.price), 0);
    
    const discountAmount = 0;
    const netAmount = subtotal - discountAmount;
    const tvaAmount = netAmount * TVA_RATE;
    const total = netAmount + tvaAmount;
    
    // Chercher la facture réelle en DB pour récupérer le vrai invoice_number
    const fetchAndGeneratePDF = async () => {
      let invoiceNumber = `TEMP-${Date.now()}`;
      
      try {
        const { data: dbInvoice } = await supabase
          .from('cadastral_invoices')
          .select('invoice_number')
          .eq('parcel_number', result.parcel.parcel_number)
          .eq('user_id', user?.id || '')
          .eq('status', 'paid')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (dbInvoice?.invoice_number) {
          invoiceNumber = dbInvoice.invoice_number;
        }
      } catch (e) {
        console.warn('Could not fetch invoice number from DB:', e);
      }

      const invoice = {
        id: `pdf-${Date.now()}`,
        user_id: user?.id || null,
        invoice_number: invoiceNumber,
        parcel_number: result.parcel.parcel_number,
        selected_services: paidServices,
        search_date: new Date().toISOString(),
        total_amount_usd: total,
        status: 'paid',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        client_name: user?.user_metadata?.full_name || null,
        client_email: user?.email || null,
        client_organization: user?.user_metadata?.organization || null,
        geographical_zone: `${result.parcel.commune}, ${result.parcel.quartier}`,
        discount_amount_usd: discountAmount,
        original_amount_usd: subtotal,
        payment_method: null
      };

      const { generateInvoicePDF } = await import('@/lib/pdf');
      generateInvoicePDF(invoice, catalogServices, invoiceFormat);
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
    <TooltipProvider>
      <Card id="cadastral-result-card" className="w-full shadow-2xl border-0 bg-gradient-to-br from-background via-background to-primary/5 overflow-visible">
      <CardHeader className={`sticky top-0 z-20 pb-3 p-4 md:p-5 bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-border/50 backdrop-blur-md bg-background/95 transition-all duration-500 ease-out ${isHeaderHidden ? 'transform -translate-y-full opacity-0' : 'transform translate-y-0 opacity-100'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              <div className="p-1.5 rounded-lg bg-primary/10 shadow-sm">
                <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <span className="truncate text-xs md:text-sm">Parcelle {parcel.parcel_number}</span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge 
                variant={parcel.parcel_type === 'SU' ? 'default' : 'secondary'} 
                className="text-xs font-medium px-2 py-1 shadow-sm"
              >
                {parcel.parcel_type === 'SU' ? 'Section Urbaine' : 'Section Rurale'}
              </Badge>
              <Badge variant="outline" className="text-xs px-2 py-1 bg-background/80 shadow-sm">{parcel.location}</Badge>
            </div>
          </div>
          {/* Boutons compacts avec icônes seulement */}
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleDownloadReport}
              className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all duration-200"
              title="Télécharger le rapport cadastral complet"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => window.print()}
              className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all duration-200"
              title="Imprimer le rapport"
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
              title="Fermer"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Onglets figés pour faciliter la navigation */}
          <TabsList className={`sticky z-10 grid w-full grid-cols-5 h-auto bg-muted/50 p-1 rounded-xl shadow-inner backdrop-blur-md bg-background/95 border border-border/50 transition-all duration-500 ease-out ${isHeaderHidden ? 'top-0 shadow-lg' : 'top-[120px]'}`}>
            <TabsTrigger 
              value="general" 
              className="text-xs font-medium p-2 md:p-3 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-200 hover:scale-[1.02] rounded-lg"
            >
              <div className="flex flex-col items-center gap-1">
                <span className="hidden sm:inline">Informations</span>
                <span className="sm:hidden">Info</span>
                {!hasServiceAccess('information') && <span className="text-xs opacity-60">🔒</span>}
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="location" 
              className="text-xs font-medium p-2 md:p-3 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-200 hover:scale-[1.02] rounded-lg"
            >
              <div className="flex flex-col items-center gap-1">
                <span className="hidden sm:inline">Localisation</span>
                <span className="sm:hidden">Lieu</span>
                {!hasServiceAccess('location_history') && <span className="text-xs opacity-60">🔒</span>}
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="text-xs font-medium p-2 md:p-3 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-200 hover:scale-[1.02] rounded-lg"
            >
              <div className="flex flex-col items-center gap-1">
                <span className="hidden sm:inline">Historique</span>
                <span className="sm:hidden">Hist.</span>
                {!hasServiceAccess('history') && <span className="text-xs opacity-60">🔒</span>}
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="obligations" 
              className="text-xs font-medium p-2 md:p-3 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-200 hover:scale-[1.02] rounded-lg"
            >
              <div className="flex flex-col items-center gap-1">
                <span className="hidden sm:inline">Obligations</span>
                <span className="sm:hidden">Oblig.</span>
                {!hasServiceAccess('obligations') && <span className="text-xs opacity-60">🔒</span>}
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="disputes" 
              className="text-xs font-medium p-2 md:p-3 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-200 hover:scale-[1.02] rounded-lg"
            >
              <div className="flex flex-col items-center gap-1">
                <span className="hidden sm:inline">Litiges</span>
                <span className="sm:hidden">Lit.</span>
                {!hasServiceAccess('land_disputes') && <span className="text-xs opacity-60">🔒</span>}
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Contenu masqué - Design premium */}
          {/* Fix #8: Inclure land_disputes dans la vérification du bloc Premium */}
          {!hasServiceAccess('information') && !hasServiceAccess('location_history') && 
           !hasServiceAccess('history') && !hasServiceAccess('obligations') && !hasServiceAccess('land_disputes') && (
            <div className="mt-4">
              <LockedServiceOverlay
                icon={<FileText className="h-8 w-8 text-primary" />}
                title="Contenu Premium"
                description="Accédez aux données détaillées avec nos services cadastraux professionnels"
                onUnlock={() => setShowBillingPanel(true)}
                premium
              />
            </div>
          )}

          {/* Onglet Informations générales - Mobile First */}
          <TabsContent value="general" className="mt-3 space-y-3 animate-fade-in">
            {!hasServiceAccess('information') ? (
              <LockedServiceOverlay
                icon={<Building className="h-6 w-6 text-primary" />}
                title="Service Premium"
                description="Accédez aux informations détaillées"
                onUnlock={() => { setPreselectServiceId('information'); setShowBillingPanel(true); }}
                premium
              />
            ) : (
              <div className="space-y-3">
                {/* Informations de propriété - Mobile First */}
                <Card className="border-0 bg-gradient-to-br from-background to-primary/5">
                  <CardContent className="p-3">
                    <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-primary">
                      <Building className="h-3 w-3" />
                      Titre de Propriété
                    </h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">Type:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium bg-primary/10 px-1.5 py-0.5 rounded text-right">{parcel.property_title_type}</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-4 w-4 p-0.5">
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[calc(100vw-2rem)] sm:w-96 max-w-md" side="left">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">{parcel.property_title_type}</h4>
                                <p className="text-xs leading-relaxed">
                                  {PROPERTY_TITLE_TYPES.find(t => t.value === parcel.property_title_type)?.details || 
                                   "Type de titre de propriété reconnu par la législation foncière de la RDC."}
                                </p>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      {parcel.title_reference_number && (
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">Référence:</span>
                          <span className="text-xs font-medium font-mono text-right break-words leading-tight">{parcel.title_reference_number}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">Surface:</span>
                        <span className="text-xs font-medium text-primary text-right">{formatArea(parcel.area_sqm)}</span>
                      </div>
                      {parcel.area_hectares > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-muted-foreground">Hectares:</span>
                          <span className="text-xs font-medium text-right">{parcel.area_hectares.toFixed(2)} ha</span>
                        </div>
                       )}
                    </div>
                    
                    {/* Pièce jointe: Titre de propriété */}
                    {parcel.property_title_document_url && (
                      <div className="mt-3 pt-2 border-t border-muted/30">
                        <DocumentAttachment 
                          documentUrl={parcel.property_title_document_url}
                          label="Titre de propriété"
                          description="Document officiel du titre de propriété"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                 {/* Propriétaire actuel - Mobile First */}
                <Card className="border-0 bg-gradient-to-br from-background to-secondary/5">
                  <CardContent className="p-3">
                    <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-primary">
                      <User className="h-3 w-3" />
                      Propriétaire Actuel
                    </h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">Nom:</span>
                        <span className="text-xs font-medium text-right break-words leading-tight">{parcel.current_owner_name}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">Statut:</span>
                        <span className="text-xs font-medium bg-secondary/10 px-1.5 py-0.5 rounded text-right break-words">{parcel.current_owner_legal_status}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">Depuis:</span>
                        <span className="text-xs font-medium text-primary">{formatDate(parcel.current_owner_since)}</span>
                      </div>
                      {parcel.whatsapp_number && (
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-muted-foreground">WhatsApp:</span>
                          <Button variant="outline" size="sm" className="h-5 text-xs px-2" asChild>
                            <a href={`https://wa.me/${parcel.whatsapp_number.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-2 w-2 mr-1" />
                              {parcel.whatsapp_number}
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Pièce jointe: Document du propriétaire actuel */}
                    {parcel.owner_document_url && (
                      <div className="mt-3 pt-2 border-t border-muted/30">
                        <DocumentAttachment 
                          documentUrl={parcel.owner_document_url}
                          label="Document d'identité"
                          description="Justificatif du propriétaire actuel"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Informations sur la construction - Mobile First */}
                {(parcel.construction_type || parcel.construction_nature || parcel.declared_usage || building_permits.length > 0) && (
                  <Card className="border-0 bg-gradient-to-br from-background to-accent/5">
                    <CardContent className="p-3">
                      <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-primary">
                        <Building className="h-3 w-3" />
                        Informations sur la construction
                      </h4>
                      <div className="space-y-1.5">
                        {parcel.construction_type && (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-muted-foreground">Type:</span>
                            <span className="text-xs font-medium text-right">{parcel.construction_type}</span>
                          </div>
                        )}
                        {parcel.construction_nature && (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-muted-foreground">Nature:</span>
                            <Badge variant={parcel.construction_nature === 'Durable' ? 'default' : parcel.construction_nature === 'Semi-durable' ? 'secondary' : 'outline'} className="text-xs h-5">
                              {parcel.construction_nature}
                            </Badge>
                          </div>
                        )}
                        {parcel.declared_usage && (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-muted-foreground">Usage:</span>
                            <span className="text-xs font-medium bg-accent/10 px-1.5 py-0.5 rounded text-right">{parcel.declared_usage}</span>
                          </div>
                        )}
                        
                        {/* Informations de l'autorisation de bâtir actuelle intégrées */}
                        {building_permits.filter(permit => permit.is_current).map((permit) => {
                          const issueDate = new Date(permit.issue_date);
                          // Fix #3: Calcul correct de la date de fin avec ajout de mois réels
                          const validityEndDate = new Date(issueDate);
                          validityEndDate.setMonth(validityEndDate.getMonth() + permit.validity_period_months);
                          const isValid = validityEndDate > new Date();
                          
                          return (
                            <React.Fragment key={permit.id}>
                              <Separator className="my-2" />
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-muted-foreground">Permis N°:</span>
                                <span className="text-xs font-medium text-right">{permit.permit_number}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-muted-foreground">Statut admin:</span>
                                <div className="flex items-center gap-1">
                                  {permit.administrative_status === 'Conforme' && <CheckCircle className="h-3 w-3 text-green-500" />}
                                  {permit.administrative_status === 'En attente' && <AlertCircle className="h-3 w-3 text-yellow-500" />}
                                  {permit.administrative_status === 'Non autorisé' && <XCircle className="h-3 w-3 text-red-500" />}
                                  <span className="text-xs font-medium">{permit.administrative_status}</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-muted-foreground">Validité:</span>
                                <span className={`text-xs font-medium ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                                  {isValid ? '✅ Valide' : '❌ Expiré'} ({validityEndDate.toLocaleDateString('fr-FR')})
                                </span>
                              </div>
                              <div className="flex justify-between items-start">
                                <span className="text-[10px] text-muted-foreground">Service émetteur:</span>
                                <span className="text-xs text-right leading-tight max-w-[60%]">{permit.issuing_service}</span>
                              </div>
                              {permit.issuing_service_contact && (
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-muted-foreground">Contact:</span>
                                  <Button variant="outline" size="sm" className="h-5 text-xs px-2" asChild>
                                    <a href={`tel:${permit.issuing_service_contact}`}>
                                      <ExternalLink className="h-2 w-2 mr-1" />
                                      Voir contact
                                    </a>
                                  </Button>
                                </div>
                              )}
                              {permit.permit_document_url && (
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-muted-foreground">Document:</span>
                                  <Button variant="outline" size="sm" className="h-5 text-xs px-2" asChild>
                                    <a href={permit.permit_document_url} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-2 w-2 mr-1" />
                                      Voir le permis
                                    </a>
                                  </Button>
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Historique des autorisations de bâtir - Mobile First */}
                {building_permits.filter(permit => !permit.is_current).length > 0 && (
                  <Card className="border-0 bg-gradient-to-br from-background to-orange-50">
                    <CardContent className="p-3">
                      <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-primary">
                        <Clock className="h-3 w-3" />
                        Historique des autorisations de bâtir
                        <Badge variant="outline" className="text-xs h-4 ml-1">
                          {building_permits.filter(permit => !permit.is_current).length} ancien{building_permits.filter(permit => !permit.is_current).length > 1 ? 's' : ''}
                        </Badge>
                      </h4>
                      <div className="space-y-2">
                        {building_permits.filter(permit => !permit.is_current).map((permit) => {
                          const issueDate = new Date(permit.issue_date);
                          const validityEndDate = new Date(issueDate.getTime() + permit.validity_period_months * 30 * 24 * 60 * 60 * 1000);
                          
                          return (
                            <div key={permit.id} className="p-2 bg-background/50 rounded-lg border border-border/30">
                              <div className="flex justify-between items-start gap-2 mb-1">
                                <span className="text-[10px] text-muted-foreground">Numéro:</span>
                                <span className="text-xs font-medium text-right">{permit.permit_number}</span>
                              </div>
                              <div className="flex justify-between items-center gap-2 mb-1">
                                <span className="text-[10px] text-muted-foreground">Période:</span>
                                <span className="text-xs text-right">
                                  {formatDate(permit.issue_date)} - {validityEndDate.toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                              <div className="flex justify-between items-center gap-2 mb-1">
                                <span className="text-[10px] text-muted-foreground">Statut:</span>
                                <div className="flex items-center gap-1">
                                  {permit.administrative_status === 'Conforme' && <CheckCircle className="h-3 w-3 text-green-500" />}
                                  {permit.administrative_status === 'En attente' && <AlertCircle className="h-3 w-3 text-yellow-500" />}
                                  {permit.administrative_status === 'Non autorisé' && <XCircle className="h-3 w-3 text-red-500" />}
                                  <span className="text-xs font-medium">{permit.administrative_status}</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-[10px] text-muted-foreground">Service émetteur:</span>
                                <span className="text-xs text-right leading-tight max-w-[60%]">{permit.issuing_service}</span>
                              </div>
                              {permit.issuing_service_contact && (
                                <div className="flex justify-between items-center gap-2 mt-1">
                                  <span className="text-[10px] text-muted-foreground">Contact:</span>
                                  <Button variant="outline" size="sm" className="h-5 text-xs px-2" asChild>
                                    <a href={`tel:${permit.issuing_service_contact}`}>
                                      <ExternalLink className="h-2 w-2 mr-1" />
                                      {permit.issuing_service_contact}
                                    </a>
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Onglet Localisation - Mobile First */}
          <TabsContent value="location" className="mt-3 space-y-3">
            {!hasServiceAccess('location_history') ? (
              <LockedServiceOverlay
                icon={<MapPin className="h-6 w-6 text-muted-foreground" />}
                title="Contenu verrouillé"
                description="Informations de localisation détaillées"
                onUnlock={() => { setPreselectServiceId('location_history'); setShowBillingPanel(true); }}
              />
            ) : (
              <>
                {/* Informations de localisation - Mobile First */}
                <Card className="border-0 bg-gradient-to-br from-background to-primary/5">
                  <CardContent className="p-3">
                    <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-primary">
                      <MapPin className="h-3 w-3" />
                      Localisation
                    </h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">Province:</span>
                        <span className="text-xs font-medium text-right">{parcel.province}</span>
                      </div>
                      
                      {parcel.parcel_type === 'SU' ? (
                        <>
                          {parcel.ville && (
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-muted-foreground">Ville:</span>
                              <span className="text-xs font-medium text-right break-words">{parcel.ville}</span>
                            </div>
                          )}
                          {parcel.commune && (
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-muted-foreground">Commune:</span>
                              <span className="text-xs font-medium text-right break-words">{parcel.commune}</span>
                            </div>
                          )}
                          {parcel.quartier && (
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-muted-foreground">Quartier:</span>
                              <span className="text-xs font-medium text-right break-words">{parcel.quartier}</span>
                            </div>
                          )}
                          {parcel.avenue && (
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-muted-foreground">Avenue:</span>
                              <span className="text-xs font-medium text-right break-words">{parcel.avenue}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {parcel.territoire && (
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-muted-foreground">Territoire:</span>
                              <span className="text-xs font-medium text-right break-words">{parcel.territoire}</span>
                            </div>
                          )}
                          {parcel.collectivite && (
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-muted-foreground">Collectivité:</span>
                              <span className="text-xs font-medium text-right break-words">{parcel.collectivite}</span>
                            </div>
                          )}
                          {parcel.groupement && (
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-muted-foreground">Groupement:</span>
                              <span className="text-xs font-medium text-right break-words">{parcel.groupement}</span>
                            </div>
                          )}
                          {parcel.village && (
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-muted-foreground">Village:</span>
                              <span className="text-xs font-medium text-right break-words">{parcel.village}</span>
                            </div>
                          )}
                        </>
                      )}
                      
                      <div className="flex justify-between items-center pt-1 border-t border-muted/30">
                        <span className="text-[10px] text-muted-foreground">Type:</span>
                        <span className="text-xs font-medium bg-primary/10 px-1.5 py-0.5 rounded">
                          {parcel.parcel_type === 'SU' ? 'Section Urbaine' : 'Section Rurale'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Carte cadastrale */}
                <Card className="border-0 bg-gradient-to-br from-background to-primary/5">
                  <CardContent className="p-3">
                    <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-primary">
                      <Map className="h-3 w-3" />
                      Croquis du terrain
                       <Popover>
                         <PopoverTrigger asChild>
                           <button className="inline-flex items-center">
                             <Info className="h-3 w-3 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                           </button>
                         </PopoverTrigger>
                         <PopoverContent 
                           side="bottom" 
                           className="max-w-xs text-sm z-[100]"
                           sideOffset={5}
                         >
                           <p className="text-xs leading-relaxed">Ce croquis est réalisé à partir des données du dernier bornage réalisé. En cas d'incohérence, veuillez vous référer au dernier croquis enregistré au bureau de la circonscription foncière à laquelle est attachée cette parcelle.</p>
                         </PopoverContent>
                       </Popover>
                    </h4>
                     <div className="relative z-0">
                       <CadastralMap 
                         coordinates={Array.isArray(parcel.gps_coordinates) ? parcel.gps_coordinates as Array<{ lat: number; lng: number; borne: string }> : []}
                         center={{ lat: parcel.latitude, lng: parcel.longitude }}
                         parcelNumber={parcel.parcel_number}
                       />
                     </div>
                  </CardContent>
                </Card>

                {/* Informations sur le bornage - Mobile First */}
                <Card className="border-0 bg-gradient-to-br from-background to-secondary/5">
                  <CardContent className="p-3">
                    <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-primary">
                      <Surveyor className="h-3 w-3" />
                      Bornage
                    </h4>
                     {boundary_history.length > 0 ? (
                       <div className="space-y-2">
                         {boundary_history.map((boundary) => (
                           <div key={boundary.id} className="p-2 bg-muted/30 rounded-lg border border-border/50">
                             <div className="space-y-1">
                               <div className="flex justify-between items-center">
                                 <span className="text-[10px] text-muted-foreground">Réf. PV:</span>
                                 <span className="text-xs font-medium text-right">{boundary.pv_reference_number}</span>
                               </div>
                               <div className="flex justify-between items-start">
                                 <span className="text-[10px] text-muted-foreground">Objet:</span>
                                 <span className="text-xs font-medium text-right break-words max-w-[60%]">{boundary.boundary_purpose}</span>
                               </div>
                               <div className="flex justify-between items-start">
                                 <span className="text-[10px] text-muted-foreground">Géomètre:</span>
                                 <span className="text-xs font-medium text-right break-words max-w-[60%]">{boundary.surveyor_name}</span>
                               </div>
                               <div className="flex justify-between items-center pt-1 border-t border-muted/30">
                                 <span className="text-[10px] text-muted-foreground">Date:</span>
                                 <span className="text-xs font-medium text-primary">{formatDate(boundary.survey_date)}</span>
                               </div>
                                <div className="mt-2 pt-2 border-t border-muted/30">
                                  <VerificationButton
                                    verificationUrl={`https://circonscription-fonciere.cd/verification-pv/${boundary.pv_reference_number}?parcelle=${parcel.parcel_number}&location=${encodeURIComponent(parcel.location)}`}
                                    documentType="du titre ou document"
                                    label="Vérifier PV"
                                  />
                                </div>
                              </div>
                            
                            {/* Pièce jointe: PV de bornage */}
                            {boundary.boundary_document_url && (
                              <div className="mt-2 pt-2 border-t border-muted/30">
                                <DocumentAttachment 
                                  documentUrl={boundary.boundary_document_url}
                                  label="PV de bornage"
                                  description={`Procès-verbal ${boundary.pv_reference_number}`}
                                />
                              </div>
                            )}
                          </div>
                          ))}
                        </div>
                    ) : (
                      <div className="text-center text-xs text-muted-foreground py-2">
                        Aucun historique disponible
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Onglet Historique - Mobile First */}
          <TabsContent value="history" className="mt-3 space-y-3">
            {!hasServiceAccess('history') ? (
              <LockedServiceOverlay
                icon={<Clock className="h-6 w-6 text-muted-foreground" />}
                title="Contenu verrouillé"
                description="Historique des propriétaires"
                onUnlock={() => { setPreselectServiceId('history'); setShowBillingPanel(true); }}
              />
            ) : (
              <Card className="border-0 bg-gradient-to-br from-background to-primary/5">
                <CardContent className="p-3">
                  <h4 className="text-xs font-semibold mb-3 flex items-center gap-1.5 text-primary">
                    <Clock className="h-3 w-3" />
                    Historique des Propriétaires
                  </h4>
                  <div className="space-y-2">
                     {/* Propriétaire actuel */}
                     <div className="flex items-start gap-2 p-2 bg-primary/10 rounded">
                       <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                       <div className="flex-1">
                         <div className="flex items-start justify-between gap-2">
                           <span className="text-xs font-medium break-words">{parcel.current_owner_name}</span>
                           <Badge variant="default" className="text-[9px] px-1 py-0 h-4 flex-shrink-0">Actuel</Badge>
                         </div>
                         <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                           {parcel.current_owner_legal_status}
                         </div>
                         <div className="text-[10px] text-primary mt-0.5">
                           Depuis {formatDate(parcel.current_owner_since)}
                         </div>
                         <div className="mt-2 pt-2 border-t border-muted/30">
                           <VerificationButton
                             verificationUrl={`https://cadastre.cd/verification-proprietaire/${encodeURIComponent(parcel.current_owner_name)}?parcelle=${parcel.parcel_number}`}
                             documentType="du document de propriété"
                           />
                         </div>
                          
                          {/* Pièces jointes: Documents du propriétaire actuel */}
                          {(parcel.owner_document_url || parcel.property_title_document_url) && (
                            <div className="mt-3 pt-2 border-t border-muted/30 space-y-2">
                              {parcel.owner_document_url && (
                                <DocumentAttachment 
                                  documentUrl={parcel.owner_document_url}
                                  label="Document d'identité"
                                  description="Justificatif du propriétaire actuel"
                                />
                              )}
                              {parcel.property_title_document_url && (
                                <DocumentAttachment 
                                  documentUrl={parcel.property_title_document_url}
                                  label="Titre de propriété actuel"
                                  description="Document officiel du titre"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                    {/* Anciens propriétaires */}
                    {ownership_history.length > 0 && (
                      <>
                        <div className="border-t border-muted/30 my-2"></div>
                         {ownership_history.map((owner, index) => (
                           <div key={owner.id} className="flex items-start gap-2 p-2 bg-muted/30 rounded">
                             <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full mt-1.5 flex-shrink-0" />
                             <div className="flex-1">
                               <div className="flex items-start justify-between gap-2">
                                 <span className="text-xs font-medium break-words">{owner.owner_name}</span>
                                 {owner.mutation_type && (
                                   <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 flex-shrink-0">{owner.mutation_type}</Badge>
                                 )}
                               </div>
                               <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                                 {owner.legal_status}
                               </div>
                               <div className="text-[10px] text-muted-foreground mt-0.5">
                                 Du {formatDate(owner.ownership_start_date)} au {formatDate(owner.ownership_end_date)}
                               </div>
                               <div className="mt-2 pt-2 border-t border-muted/30">
                                 <VerificationButton
                                   verificationUrl={`https://cadastre.cd/verification-proprietaire/${encodeURIComponent(owner.owner_name)}?parcelle=${parcel.parcel_number}&periode=${owner.ownership_start_date}-${owner.ownership_end_date}`}
                                   documentType="du document de propriété"
                                 />
                               </div>
                                
                                {/* Pièce jointe: Titre de propriété historique */}
                                {owner.ownership_document_url && (
                                  <div className="mt-2 pt-2 border-t border-muted/30">
                                    <DocumentAttachment 
                                      documentUrl={owner.ownership_document_url}
                                      label="Titre de propriété"
                                      description={`Document pour ${owner.owner_name}`}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                           ))}
                       </>
                     )}

                     {ownership_history.length === 0 && (
                       <div className="text-center text-xs text-muted-foreground py-2">
                         Aucun historique disponible
                       </div>
                     )}
                   </div>
                 </CardContent>
               </Card>
             )}
           </TabsContent>

          {/* Onglet Obligations - Mobile First */}
          <TabsContent value="obligations" className="mt-3 space-y-3">
            {!hasServiceAccess('obligations') ? (
              <LockedServiceOverlay
                icon={<Calculator className="h-6 w-6 text-muted-foreground" />}
                title="Contenu verrouillé"
                description="Obligations fiscales et hypothécaires"
                onUnlock={() => { setPreselectServiceId('obligations'); setShowBillingPanel(true); }}
              />
            ) : (
              <div className="space-y-3">
                {/* Navigation des sous-sections - Mobile First */}
                <div className="flex bg-muted p-0.5 rounded-lg">
                  <button
                    className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors ${
                      obligationsTab === 'taxes' ? 'bg-background shadow-sm text-primary' : 'hover:bg-background/50'
                    }`}
                    onClick={() => setObligationsTab('taxes')}
                  >
                    <Receipt className="h-3 w-3 inline mr-1" />
                    Taxes
                  </button>
                  <button
                    className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors ${
                      obligationsTab === 'mortgages' ? 'bg-background shadow-sm text-primary' : 'hover:bg-background/50'
                    }`}
                    onClick={() => setObligationsTab('mortgages')}
                  >
                    <CreditCard className="h-3 w-3 inline mr-1" />
                    Hypothèques
                  </button>
                </div>

                {/* Section Taxes foncières - Mobile First */}
                {obligationsTab === 'taxes' && (
                  <Card className="border-0 bg-gradient-to-br from-background to-primary/5">
                    <CardContent className="p-3">
                      <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-primary">
                        <Receipt className="h-3 w-3" />
                        Taxes Foncières
                      </h4>
                      {tax_history.length > 0 ? (
                        <div className="space-y-2">
                           {tax_history.map((tax) => (
                             <div key={tax.id} className="p-2 bg-muted/30 rounded">
                               <div className="flex items-start justify-between gap-2 mb-1">
                                 <div className="flex items-start gap-1.5">
                                   {getPaymentStatusIcon(tax.payment_status)}
                                   <div className="flex-1">
                                     <div className="text-xs font-medium break-words">Taxe {tax.tax_year}</div>
                                     <div className="text-[10px] text-muted-foreground">
                                       ${tax.amount_usd.toLocaleString()} USD
                                     </div>
                                   </div>
                                 </div>
                                 <Badge variant={getPaymentStatusBadge(tax.payment_status)} className="text-[9px] px-1 py-0 h-4 flex-shrink-0">
                                   {translatePaymentStatus(tax.payment_status)}
                                 </Badge>
                               </div>
                               {tax.payment_date && (
                                 <div className="text-[10px] text-primary">
                                   Payé le {formatDate(tax.payment_date)}
                                 </div>
                               )}
                               <div className="mt-2 pt-2 border-t border-muted/30">
                                 <VerificationButton
                                   verificationUrl={`https://impots.cd/verification-taxe-fonciere/${parcel.parcel_number}?annee=${tax.tax_year}`}
                                   documentType="du document fiscal"
                                 />
                               </div>
                                
                                {/* Pièce jointe: Reçu fiscal */}
                                {tax.receipt_document_url && (
                                  <div className="mt-2 pt-2 border-t border-muted/30">
                                    <DocumentAttachment 
                                      documentUrl={tax.receipt_document_url}
                                      label="Reçu de paiement"
                                      description={`Reçu fiscal ${tax.tax_year}`}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                         </div>
                      ) : (
                        <div className="text-center text-xs text-muted-foreground py-2">
                          Aucun historique disponible
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Section Hypothèques - Mobile First */}
                {obligationsTab === 'mortgages' && (
                  <Card className="border-0 bg-gradient-to-br from-background to-secondary/5">
                    <CardContent className="p-3">
                      <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-primary">
                        <CreditCard className="h-3 w-3" />
                        Statut Hypothécaire
                      </h4>
                      {mortgage_history.length > 0 ? (
                        <div className="space-y-2">
                          {/* Indicateur d'hypothèque active */}
                          <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div>
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                              Parcelle avec hypothèque active
                            </span>
                          </div>
                          
                           {mortgage_history.map((mortgage) => {
                             const totalPaid = mortgage.payments.reduce((sum, payment) => sum + payment.payment_amount_usd, 0);
                             const remainingAmount = mortgage.mortgage_amount_usd - totalPaid;
                             const isActive = ['active', 'Active', 'En cours'].includes(mortgage.mortgage_status);
                             
                             return (
                               <div key={mortgage.id} className="p-2 bg-muted/30 rounded">
                                 {/* Numéro de référence en évidence pour les hypothèques actives */}
                                 {mortgage.reference_number && isActive && (
                                   <div className="flex items-center gap-1.5 mb-2 p-1.5 bg-amber-100 dark:bg-amber-900/40 rounded-lg border border-amber-300 dark:border-amber-700">
                                     <div className="flex items-center gap-1 text-amber-700 dark:text-amber-300">
                                       <Hash className="h-3 w-3" />
                                       <span className="text-[9px] font-medium">Réf. Hypothèque:</span>
                                       <span className="text-[11px] font-mono font-bold tracking-wide bg-amber-200 dark:bg-amber-800 px-1.5 py-0.5 rounded">{mortgage.reference_number}</span>
                                     </div>
                                     <Tooltip>
                                       <TooltipTrigger asChild>
                                         <button className="ml-auto p-0.5 hover:bg-amber-200 dark:hover:bg-amber-800 rounded transition-colors">
                                           <Info className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                         </button>
                                       </TooltipTrigger>
                                       <TooltipContent side="top" className="max-w-xs">
                                         <p className="text-xs">Ce numéro de référence est requis pour toute demande de radiation d'hypothèque. Conservez-le précieusement.</p>
                                       </TooltipContent>
                                     </Tooltip>
                                   </div>
                                 )}
                                 
                                 <div className="flex items-start justify-between gap-2 mb-1">
                                   <div className="flex items-start gap-1.5">
                                     <Landmark className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                                     <div>
                                       <div className="text-xs font-medium">
                                         ${mortgage.mortgage_amount_usd.toLocaleString()} USD
                                       </div>
                                       <div className="text-[10px] text-muted-foreground break-words">
                                         {mortgage.creditor_name}
                                       </div>
                                     </div>
                                   </div>
                                   <Badge variant={
                                     ['paid_off', 'Éteinte'].includes(mortgage.mortgage_status) ? 'default' :
                                     isActive ? 'secondary' : 'destructive'
                                   } className="text-[9px] px-1 py-0 h-4 flex-shrink-0">
                                     {['paid_off', 'Éteinte'].includes(mortgage.mortgage_status) ? 'Éteinte' :
                                      isActive ? 'Active' : 'Défaillante'}
                                   </Badge>
                                 </div>

                                 <div className="grid grid-cols-3 gap-2 my-1">
                                   <div>
                                     <div className="text-[9px] text-muted-foreground">Durée</div>
                                     <div className="text-xs font-medium">{mortgage.duration_months}m</div>
                                   </div>
                                   <div>
                                     <div className="text-[9px] text-muted-foreground">Payé</div>
                                     <div className="text-xs font-medium text-green-600">
                                       ${totalPaid.toLocaleString()}
                                     </div>
                                   </div>
                                   <div>
                                     <div className="text-[9px] text-muted-foreground">Restant</div>
                                     <div className="text-xs font-medium text-red-600">
                                       ${remainingAmount.toLocaleString()}
                                     </div>
                                   </div>
                                 </div>

                                 <div className="text-[10px] text-muted-foreground border-t border-muted/30 pt-1">
                                   Contrat: {formatDate(mortgage.contract_date)}
                                 </div>

                                 {mortgage.payments.length > 0 && (
                                   <div className="mt-1 pt-1 border-t border-muted/30">
                                     <div className="text-[10px] font-medium mb-1">Paiements récents:</div>
                                     <div className="space-y-1 max-h-16 overflow-y-auto">
                                       {mortgage.payments.slice(0, 2).map((payment) => (
                                         <div key={payment.id} className="flex justify-between items-center text-[10px] bg-muted/20 rounded px-1 py-0.5">
                                           <span>${payment.payment_amount_usd.toLocaleString()}</span>
                                           <span className="text-muted-foreground">
                                             {formatDate(payment.payment_date)}
                                           </span>
                                         </div>
                                       ))}
                                     </div>
                                   </div>
                                 )}

                                 <div className="mt-2 pt-2 border-t border-muted/30">
                                   <div className="flex items-center gap-1">
                                     <Button
                                       variant="ghost"
                                       size="sm"
                                       className="flex-1 h-6 text-[10px] font-medium group relative overflow-hidden bg-gradient-to-r from-primary/5 to-primary/8 hover:from-primary/10 hover:to-primary/15 border border-primary/15 hover:border-primary/25 text-primary hover:text-primary transition-all duration-300 hover:scale-[1.02] hover:shadow-sm rounded-md px-2 py-0.5"
                                       onClick={() => {
                                         const mortgageVerificationUrl = `https://hypotheques.cd/verification-hypotheque/${parcel.parcel_number}?creancier=${encodeURIComponent(mortgage.creditor_name)}&contrat=${mortgage.contract_date}`;
                                         window.open(mortgageVerificationUrl, '_blank');
                                       }}
                                     >
                                       <ExternalLink className="h-2.5 w-2.5 mr-1 group-hover:scale-110 transition-transform duration-200" />
                                       <span className="hidden xs:inline">Vérifier</span>
                                       <span className="xs:hidden">Vérif.</span>
                                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-out" />
                                     </Button>
                                     
                                     <Popover>
                                       <PopoverTrigger asChild>
                                         <Button
                                           variant="ghost"
                                           size="sm"
                                           className="h-6 w-6 p-0 text-primary/70 hover:text-primary hover:bg-primary/10 transition-all duration-200 rounded-md"
                                         >
                                           <Info className="h-3 w-3" />
                                         </Button>
                                       </PopoverTrigger>
                                        <PopoverContent side="top" className="w-72 p-3" align="end">
                                          <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                                              <p className="font-medium text-sm text-blue-600">Vérification d'authenticité</p>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                              Vérifie et consulte l'authenticité du document d'hypothèque signé 
                                              auprès du bureau de la circonscription foncière.
                                            </p>
                                          </div>
                                        </PopoverContent>
                                     </Popover>
                                   </div>
                                 </div>
                               </div>
                             );
                           })}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <div>
                            <span className="text-xs font-medium text-green-700 dark:text-green-300 block">
                              Aucune hypothèque enregistrée
                            </span>
                            <span className="text-[10px] text-green-600 dark:text-green-400">
                              Parcelle libre de charges hypothécaires
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Onglet Litiges */}
          <TabsContent value="disputes" className="mt-3 space-y-3 animate-fade-in">
            {!hasServiceAccess('land_disputes') ? (
              <LockedServiceOverlay
                icon={<Scale className="h-6 w-6 text-primary" />}
                title="Service Premium"
                description="Accédez aux informations sur les litiges fonciers"
                onUnlock={() => { setPreselectServiceId('land_disputes'); setShowBillingPanel(true); }}
                premium
              />
            ) : (
              <DisputesContent parcelNumber={parcel.parcel_number} />
            )}
          </TabsContent>
        </Tabs>

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-muted">
          <div className="text-xs text-muted-foreground leading-relaxed">
            <p className="mb-2">
              <strong>Avis de non-responsabilité :</strong> Le Bureau de l'Immobilier du Congo (BIC) n'assume aucune responsabilité quant à l'exactitude des données affichées, 
              car elles proviennent des archives du Ministère des Affaires Foncières. BIC agit de bonne foi dans son travail de compilation et de présentation de ces informations.
            </p>
            <p>
              Si vous n'êtes pas satisfait des informations affichées, veuillez contacter le bureau des Affaires Foncières le plus proche de vous 
              pour solliciter une mise à jour des informations concernant le numéro {parcel.parcel_number}.
            </p>
          </div>
        </div>

        {/* Facture */}
        <CadastralInvoice
          isOpen={showInvoice}
          onClose={() => setShowInvoice(false)}
          result={result}
          paidServices={paidServices}
          onDownloadPDF={handleDownloadPDF}
        />
      </CardContent>
    </Card>
    </TooltipProvider>
  );
};

export default CadastralResultCard;
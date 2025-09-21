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
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import { useCadastralBilling } from '@/hooks/useCadastralBilling';
import { useAuth } from '@/hooks/useAuth';
import CadastralMap from './CadastralMap';
import CadastralBillingPanel from './CadastralBillingPanel';
import CadastralInvoice from './CadastralInvoice';

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
  const lastScrollYRef = useRef(0);
  const { parcel, ownership_history, tax_history, mortgage_history, boundary_history } = result;
  const { checkServiceAccess } = useCadastralBilling();
  const { user } = useAuth();

  // Logique de scroll pour masquer/afficher l'en-tête
  useEffect(() => {
    const handleScroll = (event: Event) => {
      const scrollContainer = event.currentTarget as HTMLElement;
      const currentScrollY = scrollContainer.scrollTop || 0;

      const scrollDirection = currentScrollY > lastScrollYRef.current ? 'down' : 'up';
      
      // Masquer l'en-tête si on scroll vers le bas (plus de 50px) ou l'afficher si on remonte
      if (scrollDirection === 'down' && currentScrollY > 50) {
        setIsHeaderHidden(true);
      } else if (scrollDirection === 'up' && currentScrollY <= 30) {
        setIsHeaderHidden(false);
      }
      
      lastScrollYRef.current = currentScrollY;
    };

    // Trouver le conteneur scrollable parent - celui avec overflow-auto dans CadastralResultsDialog
    const findScrollContainer = () => {
      // Chercher le div avec overflow-auto qui est le parent scrollable du dialogue
      const scrollableDiv = document.querySelector('.overflow-auto') as HTMLElement;
      return scrollableDiv;
    };

    const scrollContainer = findScrollContainer();
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  // Check user access to different services on mount
  React.useEffect(() => {
    const checkAllServices = async () => {
      if (!user) return;
      
      const services = ['information', 'location_history', 'history', 'obligations'];
      const accessPromises = services.map(service => 
        checkServiceAccess(parcel.parcel_number, service)
      );
      
      const accessResults = await Promise.all(accessPromises);
      const paidServicesList = services.filter((_, index) => accessResults[index]);
      
      if (paidServicesList.length > 0) {
        setPaidServices(paidServicesList);
        setShowBillingPanel(false);
      }
    };

    checkAllServices();
  }, [user, parcel.parcel_number, checkServiceAccess]);

  const handlePaymentSuccess = (services: string[]) => {
    // En mode test: ajouter les nouveaux services aux services déjà payés
    const updatedServices = [...new Set([...paidServices, ...services])];
    setPaidServices(updatedServices);
    setShowBillingPanel(false);
    
    // Afficher automatiquement la facture
    setShowInvoice(true);
    
    // Définir l'onglet par défaut selon les services nouvellement sélectionnés
    if (services.includes('information')) setActiveTab('general');
    else if (services.includes('location_history')) setActiveTab('location');
    else if (services.includes('history')) setActiveTab('history');
    else if (services.includes('obligations')) setActiveTab('obligations');
    
    // Notifier le parent avec tous les services payés
    if (onPaymentSuccess) {
      onPaymentSuccess(updatedServices);
    }
  };

  // Check if user has access to a specific service
  const hasServiceAccess = (serviceType: string) => {
    return paidServices.includes(serviceType);
  };

  // Gérer le téléchargement PDF de la facture
  const handleDownloadPDF = () => {
    // Calculer le total correct basé sur les services sélectionnés
    import('@/hooks/useCadastralBilling').then(({ CADASTRAL_SERVICES }) => {
      const selectedServicesList = CADASTRAL_SERVICES.filter(s => paidServices.includes(s.id));
      const subtotal = selectedServicesList.reduce((sum, service) => sum + Number(service.price), 0);
      
      // Générer le même numéro de facture que dans l'affichage à l'écran (stable)
      const parcelId = result.parcel.parcel_number.replace(/[^0-9]/g, '').slice(-4);
      const stableHash = result.parcel.parcel_number.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const stableTimestamp = Math.abs(stableHash).toString().slice(-6);
      const invoiceNumber = `INV-SU-GOMA-${parcelId}-${stableTimestamp}`;
      
      // Créer une facture avec les données identiques à l'écran
      const discountAmount = 0; // Pas de remise pour l'instant
      const tvaRate = 0.16; // 16% TVA en RDC
      const netAmount = subtotal - discountAmount;
      const tvaAmount = netAmount * tvaRate;
      const total = netAmount + tvaAmount;
      
      const invoice = {
        id: `temp-${Date.now()}`,
        user_id: user?.id || null,
        invoice_number: invoiceNumber,
        parcel_number: result.parcel.parcel_number,
        selected_services: paidServices,
        search_date: new Date().toISOString(),
        total_amount_usd: total, // Total avec TVA
        status: 'paid',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        client_name: user?.user_metadata?.full_name || null,
        client_email: user?.email || null,
        client_organization: user?.user_metadata?.organization || null,
        geographical_zone: `${result.parcel.commune}, ${result.parcel.quartier}`,
        discount_amount_usd: discountAmount,
        original_amount_usd: subtotal,
        payment_method: 'visa' // Méthode de paiement par défaut
      };

      // Génère un PDF selon le format sélectionné
      import('@/lib/pdf').then(({ generateInvoicePDF }) => {
        generateInvoicePDF(invoice, CADASTRAL_SERVICES, invoiceFormat);
      });
    });
  };

  // Gérer le téléchargement du rapport cadastral complet
  const handleDownloadReport = () => {
    // Génère un rapport cadastral PDF A4 complet avec toutes les données
    import('@/lib/pdf').then(({ generateCadastralReport }) => {
      import('@/hooks/useCadastralBilling').then(({ CADASTRAL_SERVICES }) => {
        generateCadastralReport(result, paidServices, CADASTRAL_SERVICES);
      });
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

  // Calculer la surface à partir des bornes (formule de Shoelace)
  const calculateSurfaceFromBounds = () => {
    if (!parcel.gps_coordinates || parcel.gps_coordinates.length < 3) return null;
    
    let area = 0;
    const coords = parcel.gps_coordinates;
    const n = coords.length;
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += coords[i].lat * coords[j].lng;
      area -= coords[j].lat * coords[i].lng;
    }
    
    return Math.abs(area) / 2 * 111319.5 * 111319.5; // Conversion approximative en m²
  };

  const taxStatus = getOverallTaxStatus();

  // Show billing panel if user requests it or hasn't paid any services initially
  if (showBillingPanel) {
    return <CadastralBillingPanel 
      searchResult={result} 
      onPaymentSuccess={(services) => handlePaymentSuccess(services)} 
      preselectServiceId={preselectServiceId}
      onClose={() => setShowBillingPanel(false)}
    />;
  }

  return (
    <Card className="w-full shadow-2xl border-0 bg-gradient-to-br from-background via-background to-primary/5 overflow-visible">
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
              onClick={handleDownloadReport}
              className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all duration-200"
              title="Imprimer le rapport (génère un PDF identique au téléchargement)"
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
          <TabsList className={`sticky z-10 grid w-full grid-cols-4 h-auto bg-muted/50 p-1 rounded-xl shadow-inner backdrop-blur-md bg-background/95 border border-border/50 transition-all duration-500 ease-out ${isHeaderHidden ? 'top-0 shadow-lg' : 'top-[120px]'}`}>
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
          </TabsList>

          {/* Contenu masqué - Design premium */}
          {!hasServiceAccess('information') && !hasServiceAccess('location_history') && 
           !hasServiceAccess('history') && !hasServiceAccess('obligations') && (
            <div className="mt-4 p-6 text-center border-2 border-dashed border-primary/20 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 shadow-lg">
              <div className="space-y-4 animate-fade-in">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl flex items-center justify-center shadow-md">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Contenu Premium
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Accédez aux données détaillées avec nos services cadastraux professionnels
                  </p>
                </div>
                <Button 
                  onClick={() => setShowBillingPanel(true)} 
                  className="mt-4 px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-primary to-primary/80"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Débloquer l'accès
                </Button>
              </div>
            </div>
          )}

          {/* Onglet Informations générales - Mobile First */}
          <TabsContent value="general" className="mt-3 space-y-3 animate-fade-in">
            {!hasServiceAccess('information') ? (
              <div className="p-4 text-center border-2 border-dashed border-primary/20 rounded-lg bg-gradient-to-br from-primary/5 to-secondary/5">
                <div className="space-y-3">
                  <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl flex items-center justify-center">
                    <Building className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      Service Premium
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Accédez aux informations détaillées
                    </p>
                  </div>
                  <Button 
                    onClick={() => { setPreselectServiceId('information'); setShowBillingPanel(true); }} 
                    size="sm"
                    className="text-xs bg-gradient-to-r from-primary to-primary/80"
                  >
                    <CreditCard className="h-3 w-3 mr-1" />
                    Débloquer
                  </Button>
                </div>
              </div>
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
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">Type:</span>
                        <span className="text-xs font-medium bg-primary/10 px-1.5 py-0.5 rounded text-right">{parcel.property_title_type}</span>
                      </div>
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
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Onglet Localisation - Mobile First */}
          <TabsContent value="location" className="mt-3 space-y-3">
            {!hasServiceAccess('location_history') ? (
              <div className="p-4 text-center border-2 border-dashed border-muted-foreground/30 rounded-lg">
                <div className="space-y-3">
                  <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Contenu verrouillé</h3>
                    <p className="text-xs text-muted-foreground">
                      Informations de localisation détaillées
                    </p>
                  </div>
                  <Button onClick={() => { setPreselectServiceId('location_history'); setShowBillingPanel(true); }} size="sm" className="text-xs">
                    <CreditCard className="h-3 w-3 mr-1" />
                    Débloquer
                  </Button>
                </div>
              </div>
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
                <div className="relative z-0">
                  <CadastralMap 
                    coordinates={parcel.gps_coordinates}
                    center={{ lat: parcel.latitude, lng: parcel.longitude }}
                    parcelNumber={parcel.parcel_number}
                  />
                </div>

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
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="flex-1 h-6 text-[10px] font-medium group relative overflow-hidden bg-gradient-to-r from-primary/5 to-primary/8 hover:from-primary/10 hover:to-primary/15 border border-primary/15 hover:border-primary/25 text-primary hover:text-primary transition-all duration-300 hover:scale-[1.02] hover:shadow-sm rounded-md px-2 py-0.5"
                                      onClick={() => {
                                        // Redirection vers le bureau de la circonscription foncière
                                        const landRegistryUrl = `https://circonscription-fonciere.cd/verification-pv/${boundary.pv_reference_number}?parcelle=${parcel.parcel_number}&location=${encodeURIComponent(parcel.location)}`;
                                        window.open(landRegistryUrl, '_blank');
                                      }}
                                    >
                                      <ExternalLink className="h-2.5 w-2.5 mr-1 group-hover:scale-110 transition-transform duration-200" />
                                      <span className="hidden xs:inline">Vérifier PV</span>
                                      <span className="xs:hidden">Vérifier</span>
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
                                             Vérifie et consulte l'authenticité du titre ou document signé 
                                             auprès du bureau de la circonscription foncière.
                                           </p>
                                         </div>
                                       </PopoverContent>
                                    </Popover>
                                  </div>
                                </div>
                             </div>
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
              <div className="p-4 text-center border-2 border-dashed border-muted-foreground/30 rounded-lg">
                <div className="space-y-3">
                  <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Contenu verrouillé</h3>
                    <p className="text-xs text-muted-foreground">
                      Historique des propriétaires
                    </p>
                  </div>
                  <Button onClick={() => { setPreselectServiceId('history'); setShowBillingPanel(true); }} size="sm" className="text-xs">
                    <CreditCard className="h-3 w-3 mr-1" />
                    Débloquer
                  </Button>
                </div>
              </div>
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
                           <div className="flex items-center gap-1">
                             <Button
                               variant="ghost"
                               size="sm"
                               className="flex-1 h-6 text-[10px] font-medium group relative overflow-hidden bg-gradient-to-r from-primary/5 to-primary/8 hover:from-primary/10 hover:to-primary/15 border border-primary/15 hover:border-primary/25 text-primary hover:text-primary transition-all duration-300 hover:scale-[1.02] hover:shadow-sm rounded-md px-2 py-0.5"
                               onClick={() => {
                                 const ownerVerificationUrl = `https://cadastre.cd/verification-proprietaire/${encodeURIComponent(parcel.current_owner_name)}?parcelle=${parcel.parcel_number}`;
                                 window.open(ownerVerificationUrl, '_blank');
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
                                      Vérifie et consulte l'authenticité du document de propriété signé 
                                      auprès du bureau de la circonscription foncière.
                                    </p>
                                  </div>
                                </PopoverContent>
                             </Popover>
                           </div>
                         </div>
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
                                 <div className="flex items-center gap-1">
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     className="flex-1 h-6 text-[10px] font-medium group relative overflow-hidden bg-gradient-to-r from-primary/5 to-primary/8 hover:from-primary/10 hover:to-primary/15 border border-primary/15 hover:border-primary/25 text-primary hover:text-primary transition-all duration-300 hover:scale-[1.02] hover:shadow-sm rounded-md px-2 py-0.5"
                                     onClick={() => {
                                       const ownerVerificationUrl = `https://cadastre.cd/verification-proprietaire/${encodeURIComponent(owner.owner_name)}?parcelle=${parcel.parcel_number}&periode=${owner.ownership_start_date}-${owner.ownership_end_date}`;
                                       window.open(ownerVerificationUrl, '_blank');
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
                                            Vérifie et consulte l'authenticité du document de propriété signé 
                                            auprès du bureau de la circonscription foncière.
                                          </p>
                                        </div>
                                      </PopoverContent>
                                   </Popover>
                                 </div>
                               </div>
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
              <div className="p-4 text-center border-2 border-dashed border-muted-foreground/30 rounded-lg">
                <div className="space-y-3">
                  <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                    <Calculator className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Contenu verrouillé</h3>
                    <p className="text-xs text-muted-foreground">
                      Obligations fiscales et hypothécaires
                    </p>
                  </div>
                  <Button onClick={() => { setPreselectServiceId('obligations'); setShowBillingPanel(true); }} size="sm" className="text-xs">
                    <CreditCard className="h-3 w-3 mr-1" />
                    Débloquer
                  </Button>
                </div>
              </div>
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
                                 <div className="flex items-center gap-1">
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     className="flex-1 h-6 text-[10px] font-medium group relative overflow-hidden bg-gradient-to-r from-primary/5 to-primary/8 hover:from-primary/10 hover:to-primary/15 border border-primary/15 hover:border-primary/25 text-primary hover:text-primary transition-all duration-300 hover:scale-[1.02] hover:shadow-sm rounded-md px-2 py-0.5"
                                     onClick={() => {
                                       const taxVerificationUrl = `https://impots.cd/verification-taxe-fonciere/${parcel.parcel_number}?annee=${tax.tax_year}`;
                                       window.open(taxVerificationUrl, '_blank');
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
                                            Vérifie et consulte l'authenticité du document fiscal signé 
                                            auprès du bureau de la circonscription foncière.
                                          </p>
                                        </div>
                                      </PopoverContent>
                                   </Popover>
                                 </div>
                               </div>
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
                        Hypothèques
                      </h4>
                      {mortgage_history.length > 0 ? (
                        <div className="space-y-2">
                           {mortgage_history.map((mortgage) => {
                             const totalPaid = mortgage.payments.reduce((sum, payment) => sum + payment.payment_amount_usd, 0);
                             const remainingAmount = mortgage.mortgage_amount_usd - totalPaid;
                             
                             return (
                               <div key={mortgage.id} className="p-2 bg-muted/30 rounded">
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
                                     mortgage.mortgage_status === 'paid_off' ? 'default' :
                                     mortgage.mortgage_status === 'active' ? 'secondary' : 'destructive'
                                   } className="text-[9px] px-1 py-0 h-4 flex-shrink-0">
                                     {mortgage.mortgage_status === 'paid_off' ? 'Éteinte' :
                                      mortgage.mortgage_status === 'active' ? 'Active' : 'Défaillante'}
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
                        <div className="text-center text-xs text-muted-foreground py-2">
                          Aucun historique disponible
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
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
  );
};

export default CadastralResultCard;
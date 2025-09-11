import React, { useState } from 'react';
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
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import { useCadastralBilling } from '@/hooks/useCadastralBilling';
import { useAuth } from '@/hooks/useAuth';
import CadastralMap from './CadastralMap';
import CadastralBillingPanel from './CadastralBillingPanel';
import CadastralInvoice from './CadastralInvoice';
import DeedVerificationPanel from './DeedVerificationPanel';

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
  const { parcel, ownership_history, tax_history, mortgage_history, boundary_history } = result;
  const { checkServiceAccess } = useCadastralBilling();
  const { user } = useAuth();

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
    // Génère un rapport cadastral PDF A4 complet
    import('@/lib/pdf').then(({ generateCadastralReport }) => {
      import('@/hooks/useCadastralBilling').then(({ CADASTRAL_SERVICES }) => {
        generateCadastralReport(result.parcel, paidServices, CADASTRAL_SERVICES);
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
      <CardHeader className="sticky top-0 z-20 pb-3 p-4 md:p-5 bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-border/50 backdrop-blur-md bg-background/95">
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
          <div className="flex flex-col gap-2">
            {/* Sélecteur de format de facture */}
            <div className="flex items-center gap-2">
              <Select value={invoiceFormat} onValueChange={(value: 'mini' | 'a4') => setInvoiceFormat(value)}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mini">Mini-facture</SelectItem>
                  <SelectItem value="a4">Format A4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Boutons de téléchargement */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadPDF}
                className="h-9 w-9 p-0 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                title={`Télécharger la facture PDF (${invoiceFormat === 'mini' ? 'Mini-facture' : 'Format A4'})`}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadReport}
                className="h-9 w-9 p-0 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                title="Télécharger le rapport cadastral complet"
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.print()} 
                className="h-9 w-9 p-0 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                title="Imprimer"
              >
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClose} 
              className="h-9 w-9 p-0 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Optimisation mobile : tous les onglets côte à côte avec texte adaptatif */}
          <TabsList className="grid w-full grid-cols-4 h-auto bg-muted/50 p-1 rounded-xl shadow-inner">
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

          {/* Onglet Informations générales - Design premium */}
          <TabsContent value="general" className="mt-6 space-y-4 animate-fade-in">
            {!hasServiceAccess('information') ? (
              <div className="p-6 text-center border-2 border-dashed border-primary/20 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 shadow-lg">
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl flex items-center justify-center shadow-md">
                    <Building className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      Service Premium
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                      Accédez aux informations détaillées de la parcelle
                    </p>
                  </div>
                  <Button 
                    onClick={() => { setPreselectServiceId('information'); setShowBillingPanel(true); }} 
                    className="mt-4 px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-primary to-primary/80"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Débloquer
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Informations de propriété - Design premium */}
                  <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-background to-primary/5">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-primary">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <Building className="h-4 w-4" />
                        </div>
                        Titre de Propriété
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Type:</span>
                          <span className="text-sm font-medium bg-primary/10 px-2 py-1 rounded-md">{parcel.property_title_type}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Surface:</span>
                          <span className="text-sm font-medium text-primary">{formatArea(parcel.area_sqm)}</span>
                        </div>
                        {parcel.area_hectares > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Hectares:</span>
                            <span className="text-sm font-medium text-secondary-foreground">{parcel.area_hectares.toFixed(2)} ha</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Propriétaire actuel - Design premium */}
                  <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-background to-secondary/5">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-primary">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <User className="h-4 w-4" />
                        </div>
                        Propriétaire Actuel
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-xs text-muted-foreground">Nom:</span>
                          <span className="text-sm font-medium text-right max-w-[60%] break-words">{parcel.current_owner_name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Statut:</span>
                          <span className="text-sm font-medium bg-secondary/10 px-2 py-1 rounded-md">{parcel.current_owner_legal_status}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Depuis:</span>
                          <span className="text-sm font-medium text-primary">{formatDate(parcel.current_owner_since)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Circonscription foncière - Design premium */}
                  <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-background to-accent/5">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-primary">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <Landmark className="h-4 w-4" />
                        </div>
                        Circonscription Foncière
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-xs text-muted-foreground">Rattachée à:</span>
                          <span className="text-sm font-medium text-right max-w-[60%] break-words bg-accent/10 px-2 py-1 rounded-md">
                            {parcel.circonscription_fonciere || 'Circonscription Foncière de Goma'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Statut fiscal - Design premium */}
                <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-background to-accent/5">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-primary">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      Statut Fiscal
                    </h4>
                    <div className="flex items-center gap-2">
                      {taxStatus.status === 'up_to_date' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {taxStatus.status === 'pending' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                      {taxStatus.status === 'overdue' && <XCircle className="h-5 w-5 text-red-500" />}
                      <span className="text-sm font-medium">
                        {taxStatus.status === 'up_to_date' && 'À jour'}
                        {taxStatus.status === 'pending' && `${taxStatus.count} en attente`}
                        {taxStatus.status === 'overdue' && `${taxStatus.count} en retard`}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Onglet Localisation - Mobile optimized */}
          <TabsContent value="location" className="mt-3 md:mt-4 space-y-3 md:space-y-4">
            {!hasServiceAccess('location_history') ? (
              <div className="p-4 md:p-8 text-center border-2 border-dashed border-muted-foreground/30 rounded-lg">
                <div className="space-y-3 md:space-y-4">
                  <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-muted rounded-full flex items-center justify-center">
                    <MapPin className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="responsive-subtitle font-semibold mb-2">Contenu verrouillé</h3>
                    <p className="responsive-body text-muted-foreground">
                      Les informations de localisation détaillées nécessitent un paiement pour être accessibles.
                    </p>
                  </div>
                  <Button onClick={() => { setPreselectServiceId('location_history'); setShowBillingPanel(true); }} className="mt-4 btn-responsive">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Payer pour accéder à ce service
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Informations de localisation détaillées - Mobile optimized */}
                <Card>
                  <CardHeader className="pb-3 p-3 md:pb-4 md:p-4">
                    <CardTitle className="responsive-body flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Localisation Géographique
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 md:p-4 pt-0">
                    <div className="space-y-3 md:space-y-4 md:grid md:grid-cols-2 md:gap-4">
                      <div className="space-y-2 responsive-caption">
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                          <span className="text-muted-foreground">Province :</span>
                          <span className="font-medium">{parcel.province}</span>
                        </div>
                        
                        {parcel.parcel_type === 'SU' ? (
                          <>
                            {parcel.ville && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Ville :</span>
                                <span className="font-medium">{parcel.ville}</span>
                              </div>
                            )}
                            {parcel.commune && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Commune :</span>
                                <span className="font-medium">{parcel.commune}</span>
                              </div>
                            )}
                            {parcel.quartier && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Quartier :</span>
                                <span className="font-medium">{parcel.quartier}</span>
                              </div>
                            )}
                            {parcel.avenue && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Avenue :</span>
                                <span className="font-medium">{parcel.avenue}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {parcel.territoire && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Territoire/District :</span>
                                <span className="font-medium">{parcel.territoire}</span>
                              </div>
                            )}
                            {parcel.collectivite && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Collectivité :</span>
                                <span className="font-medium">{parcel.collectivite}</span>
                              </div>
                            )}
                            {parcel.groupement && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Groupement :</span>
                                <span className="font-medium">{parcel.groupement}</span>
                              </div>
                            )}
                            {parcel.village && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Village :</span>
                                <span className="font-medium">{parcel.village}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type de parcelle :</span>
                          <span className="font-medium">
                            {parcel.parcel_type === 'SU' ? 'Section Urbaine' : 'Section Rurale'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Localisation :</span>
                          <span className="font-medium">{parcel.location}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Carte cadastrale */}
                <CadastralMap 
                  coordinates={parcel.gps_coordinates}
                  center={{ lat: parcel.latitude, lng: parcel.longitude }}
                  parcelNumber={parcel.parcel_number}
                />

                {/* Informations sur le bornage */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Surveyor className="h-4 w-4" />
                      Information sur le Bornage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {boundary_history.length > 0 ? (
                      <div className="space-y-4">
                        {boundary_history.map((boundary) => (
                          <div key={boundary.id} className="p-4 border rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <span className="text-xs text-muted-foreground">N° de référence PV</span>
                                <div className="font-medium">{boundary.pv_reference_number}</div>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground">Objet du bornage</span>
                                <div className="font-medium">{boundary.boundary_purpose}</div>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground">Géomètre</span>
                                <div className="font-medium">{boundary.surveyor_name}</div>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              Date de mesurage : {formatDate(boundary.survey_date)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-4">
                        Aucun historique de bornage disponible
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Onglet Historique */}
          <TabsContent value="history" className="mt-4">
            {!hasServiceAccess('history') ? (
              <div className="p-8 text-center border-2 border-dashed border-muted-foreground/30 rounded-lg">
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Contenu verrouillé</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      L'historique des propriétaires nécessite un paiement pour être accessible.
                    </p>
                  </div>
                  <Button onClick={() => { setPreselectServiceId('history'); setShowBillingPanel(true); }} className="mt-4">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Payer pour accéder à ce service
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Historique des Propriétaires
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Propriétaire actuel */}
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{parcel.current_owner_name}</span>
                            <Badge variant="default">Propriétaire actuel</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {parcel.current_owner_legal_status} • Depuis {formatDate(parcel.current_owner_since)}
                          </div>
                        </div>
                      </div>

                      {/* Anciens propriétaires */}
                      {ownership_history.length > 0 && <Separator />}
                      {ownership_history.map((owner, index) => (
                        <div key={owner.id} className="flex items-start gap-3 p-3 rounded-lg">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full mt-2" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{owner.owner_name}</span>
                              {owner.mutation_type && (
                                <Badge variant="outline">{owner.mutation_type}</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {owner.legal_status} • 
                              Du {formatDate(owner.ownership_start_date)} au {formatDate(owner.ownership_end_date)}
                            </div>
                          </div>
                        </div>
                      ))}

                      {ownership_history.length === 0 && (
                        <div className="text-center text-muted-foreground py-4">
                          Aucun historique de propriétaire disponible
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Vérification d'acte foncier */}
                <DeedVerificationPanel 
                  parcelNumber={parcel.parcel_number}
                  landRegistryDistrict={parcel.circonscription_fonciere || 'Circonscription Foncière de Goma'}
                />
              </div>
            )}
          </TabsContent>

          {/* Onglet Obligations */}
          <TabsContent value="obligations" className="mt-4">
            {!hasServiceAccess('obligations') ? (
              <div className="p-8 text-center border-2 border-dashed border-muted-foreground/30 rounded-lg">
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <Calculator className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Contenu verrouillé</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Les obligations fiscales et hypothécaires nécessitent un paiement pour être accessibles.
                    </p>
                  </div>
                  <Button onClick={() => { setPreselectServiceId('obligations'); setShowBillingPanel(true); }} className="mt-4">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Payer pour accéder à ce service
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Navigation des sous-sections */}
                <div className="flex space-x-1 bg-muted p-1 rounded-lg">
                  <button
                    className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                      obligationsTab === 'taxes' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                    }`}
                    onClick={() => setObligationsTab('taxes')}
                  >
                    <Receipt className="h-4 w-4 inline mr-2" />
                    Taxes foncières
                  </button>
                  <button
                    className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                      obligationsTab === 'mortgages' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                    }`}
                    onClick={() => setObligationsTab('mortgages')}
                  >
                    <CreditCard className="h-4 w-4 inline mr-2" />
                    Hypothèques
                  </button>
                </div>

                {/* Section Taxes foncières */}
                {obligationsTab === 'taxes' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Historique des Taxes Foncières
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {tax_history.length > 0 ? (
                        <div className="space-y-3">
                          {tax_history.map((tax) => (
                            <div key={tax.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center gap-3">
                                {getPaymentStatusIcon(tax.payment_status)}
                                <div>
                                  <div className="font-medium">Taxe foncière annuelle - {tax.tax_year}</div>
                                  <div className="text-sm text-muted-foreground">
                                    Montant dû: ${tax.amount_usd.toLocaleString()} USD
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Période: Année fiscale {tax.tax_year}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant={getPaymentStatusBadge(tax.payment_status)}>
                                  {translatePaymentStatus(tax.payment_status)}
                                </Badge>
                                {tax.payment_date && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Payé le {formatDate(tax.payment_date)}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground py-4">
                          Aucun historique de taxes disponible
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Section Hypothèques */}
                {obligationsTab === 'mortgages' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Historique des Hypothèques
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {mortgage_history.length > 0 ? (
                        <div className="space-y-4">
                          {mortgage_history.map((mortgage) => {
                            const totalPaid = mortgage.payments.reduce((sum, payment) => sum + payment.payment_amount_usd, 0);
                            const remainingAmount = mortgage.mortgage_amount_usd - totalPaid;
                            
                            return (
                              <div key={mortgage.id} className="border rounded-lg p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <Landmark className="h-5 w-5 text-blue-500" />
                                    <div>
                                      <div className="font-medium text-lg">
                                        ${mortgage.mortgage_amount_usd.toLocaleString()} USD
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {mortgage.creditor_name} • {mortgage.creditor_type}
                                      </div>
                                    </div>
                                  </div>
                                  <Badge variant={
                                    mortgage.mortgage_status === 'paid_off' ? 'default' :
                                    mortgage.mortgage_status === 'active' ? 'secondary' : 'destructive'
                                  }>
                                    {mortgage.mortgage_status === 'paid_off' ? 'Éteinte' :
                                     mortgage.mortgage_status === 'active' ? 'Active' : 'Défaillante'}
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  <div>
                                    <span className="text-xs text-muted-foreground">Durée</span>
                                    <div className="font-medium">{mortgage.duration_months} mois</div>
                                  </div>
                                  <div>
                                    <span className="text-xs text-muted-foreground">Montant payé</span>
                                    <div className="font-medium text-green-600">
                                      ${totalPaid.toLocaleString()} USD
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-xs text-muted-foreground">Montant restant</span>
                                    <div className="font-medium text-red-600">
                                      ${remainingAmount.toLocaleString()} USD
                                    </div>
                                  </div>
                                </div>

                                <div className="text-xs text-muted-foreground mb-3">
                                  Contrat signé le {formatDate(mortgage.contract_date)}
                                </div>

                                {mortgage.payments.length > 0 && (
                                  <div>
                                    <h5 className="font-medium text-sm mb-2">Historique des paiements</h5>
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                      {mortgage.payments.map((payment) => (
                                        <div key={payment.id} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                                          <span>${payment.payment_amount_usd.toLocaleString()} USD</span>
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline">
                                              {payment.payment_type === 'total' ? 'Paiement total' : 'Paiement partiel'}
                                            </Badge>
                                            <span className="text-muted-foreground">
                                              {formatDate(payment.payment_date)}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground py-4">
                          Aucun historique d'hypothèques disponible
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
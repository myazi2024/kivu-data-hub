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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  
  // States pour contrôler la modal de confirmation
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
    description: string;
    location: string;
  }>({
    isOpen: false,
    url: '',
    title: '',
    description: '',
    location: ''
  });
  
  const lastScrollYRef = useRef(0);
  const { parcel, ownership_history, tax_history, mortgage_history, boundary_history } = result;
  const { checkServiceAccess } = useCadastralBilling();
  const { user } = useAuth();

  // Fonction pour ouvrir la modal de confirmation
  const openConfirmationModal = (url: string, title: string, description: string, location: string) => {
    setConfirmationModal({
      isOpen: true,
      url,
      title,
      description,
      location
    });
  };

  // Fonction pour fermer la modal de confirmation
  const closeConfirmationModal = () => {
    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
  };

  // Fonction pour confirmer et rediriger
  const confirmRedirect = () => {
    window.open(confirmationModal.url, '_blank');
    closeConfirmationModal();
  };

  useEffect(() => {
    const handleScroll = (event: Event) => {
      const scrollContainer = event.currentTarget as HTMLElement;
      const currentScrollY = scrollContainer.scrollTop || 0;

      const scrollDirection = currentScrollY > lastScrollYRef.current ? 'down' : 'up';
      
      if (scrollDirection === 'down' && currentScrollY > 50) {
        setIsHeaderHidden(true);
      } else if (scrollDirection === 'up' && currentScrollY <= 30) {
        setIsHeaderHidden(false);
      }
      
      lastScrollYRef.current = currentScrollY;
    };

    const findScrollContainer = () => {
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
    const updatedServices = [...new Set([...paidServices, ...services])];
    setPaidServices(updatedServices);
    setShowBillingPanel(false);
    
    setShowInvoice(true);
    
    if (services.includes('information')) setActiveTab('general');
    else if (services.includes('location_history')) setActiveTab('location');
    else if (services.includes('history')) setActiveTab('history');
    else if (services.includes('obligations')) setActiveTab('obligations');
    
    if (onPaymentSuccess) {
      onPaymentSuccess(updatedServices);
    }
  };

  const hasServiceAccess = (serviceType: string) => {
    return paidServices.includes(serviceType);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatArea = (sqm: number) => {
    if (sqm >= 10000) {
      return `${(sqm / 10000).toFixed(2)} ha (${sqm.toLocaleString()} m²)`;
    }
    return `${sqm.toLocaleString()} m²`;
  };

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

  const getOverallTaxStatus = () => {
    const overdueTaxes = tax_history.filter(tax => tax.payment_status === 'overdue');
    const pendingTaxes = tax_history.filter(tax => tax.payment_status === 'pending');
    
    if (overdueTaxes.length > 0) return { status: 'overdue', count: overdueTaxes.length };
    if (pendingTaxes.length > 0) return { status: 'pending', count: pendingTaxes.length };
    return { status: 'up_to_date', count: 0 };
  };

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
    
    return Math.abs(area) / 2 * 111319.5 * 111319.5;
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
    <>
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
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  import('@/lib/pdf').then(({ generateCadastralReport }) => {
                    import('@/hooks/useCadastralBilling').then(({ CADASTRAL_SERVICES }) => {
                      generateCadastralReport(result.parcel, paidServices, CADASTRAL_SERVICES);
                    });
                  });
                }}
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

            {/* Onglet Informations générales */}
            <TabsContent value="general" className="mt-3 space-y-3 animate-fade-in">
              {!hasServiceAccess('information') ? (
                <div className="p-4 text-center border-2 border-dashed border-primary/20 rounded-lg bg-gradient-to-br from-primary/5 to-secondary/5">
                  <div className="space-y-3">
                    <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl flex items-center justify-center">
                      <Building className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        Informations générales
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Propriétaire, superficie, usage...
                      </p>
                    </div>
                    <Button 
                      onClick={() => {
                        setPreselectServiceId('information');
                        setShowBillingPanel(true);
                      }}
                      size="sm" 
                      className="text-xs px-3 py-1 h-7 bg-gradient-to-r from-primary to-primary/80"
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      Débloquer
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Informations générales content */}
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Building className="h-4 w-4 text-primary" />
                        Informations de la Parcelle
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-muted-foreground">Propriétaire:</span>
                          <div className="font-semibold">{parcel.owner}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Superficie:</span>
                          <div className="font-semibold">{formatArea(parcel.area_sqm)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Type d'usage:</span>
                          <div className="font-semibold">{parcel.property_type}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date d'enregistrement:</span>
                          <div className="font-semibold">{formatDate(parcel.registration_date)}</div>
                        </div>
                      </div>
                      
                      {/* Bouton de vérification pour la parcelle */}
                      <div className="flex justify-end pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openConfirmationModal(
                            'https://cadastre.cd/verify',
                            'Vérification d\'authenticité',
                            'Vérifier l\'authenticité du titre de propriété signé auprès du bureau de la circonscription foncière',
                            `Circonscription de ${parcel.location}`
                          )}
                          className="relative group overflow-hidden text-xs px-2 py-1 h-7 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-300"
                        >
                          <ExternalLink className="h-2.5 w-2.5 mr-1 group-hover:scale-110 transition-transform duration-200" />
                          <span className="hidden xs:inline">Vérifier</span>
                          <span className="xs:hidden">Vérif.</span>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-out" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Onglet Localisation */}
            <TabsContent value="location" className="mt-3 space-y-3">
              {!hasServiceAccess('location_history') ? (
                <div className="p-4 text-center border-2 border-dashed border-muted-foreground/30 rounded-lg">
                  <div className="space-y-3">
                    <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                      <Map className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-1">Contenu verrouillé</h3>
                      <p className="text-xs text-muted-foreground">
                        Carte et coordonnées GPS
                      </p>
                    </div>
                    <Button 
                      onClick={() => {
                        setPreselectServiceId('location_history');
                        setShowBillingPanel(true);
                      }}
                      size="sm" 
                      className="text-xs"
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      Débloquer
                    </Button>
                  </div>
                </div>
              ) : (
                <CadastralMap parcel={parcel} />
              )}
            </TabsContent>

            {/* Onglet Historique */}
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
                        Historique des propriétaires et modifications
                      </p>
                    </div>
                    <Button 
                      onClick={() => {
                        setPreselectServiceId('history');
                        setShowBillingPanel(true);
                      }}
                      size="sm" 
                      className="text-xs"
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      Débloquer
                    </Button>
                  </div>
                </div>
              ) : (
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Historique des Propriétaires
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ownership_history && ownership_history.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground mb-2">Propriétaire actuel</div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="h-3 w-3 text-green-600" />
                                <span className="text-xs font-semibold text-green-700">{parcel.owner}</span>
                              </div>
                              <div className="text-xs text-green-600">
                                Depuis: {formatDate(parcel.registration_date)}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openConfirmationModal(
                                'https://cadastre.cd/verify',
                                'Vérification d\'authenticité',
                                'Vérifier l\'authenticité du titre de propriété signé pour le propriétaire actuel',
                                `Circonscription de ${parcel.location}`
                              )}
                              className="relative group overflow-hidden text-xs px-2 py-1 h-6 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-300"
                            >
                              <ExternalLink className="h-2.5 w-2.5 mr-1 group-hover:scale-110 transition-transform duration-200" />
                              <span className="hidden xs:inline">Vérifier</span>
                              <span className="xs:hidden">Vérif.</span>
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-out" />
                            </Button>
                          </div>
                        </div>
                        
                        {ownership_history.length > 0 && (
                          <>
                            <div className="text-xs font-medium text-muted-foreground mt-4 mb-2">Anciens propriétaires</div>
                            {ownership_history.map((owner, index) => (
                              <div key={index} className="border rounded-lg p-3 bg-muted/30">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <User className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-xs font-semibold">{owner.owner_name}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {formatDate(owner.start_date)} - {formatDate(owner.end_date)}
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openConfirmationModal(
                                      'https://cadastre.cd/verify',
                                      'Vérification d\'authenticité',
                                      'Vérifier l\'authenticité du titre de propriété signé pour cet ancien propriétaire',
                                      `Circonscription de ${parcel.location}`
                                    )}
                                    className="relative group overflow-hidden text-xs px-2 py-1 h-6 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-300"
                                  >
                                    <ExternalLink className="h-2.5 w-2.5 mr-1 group-hover:scale-110 transition-transform duration-200" />
                                    <span className="hidden xs:inline">Vérifier</span>
                                    <span className="xs:hidden">Vérif.</span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-out" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-xs text-muted-foreground py-2">
                        Aucun historique disponible
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Onglet Obligations */}
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
                    <Button 
                      onClick={() => {
                        setPreselectServiceId('obligations');
                        setShowBillingPanel(true);
                      }}
                      size="sm" 
                      className="text-xs"
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      Débloquer
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Tabs value={obligationsTab} onValueChange={setObligationsTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="taxes" className="text-xs">
                        <Receipt className="h-3 w-3 mr-1" />
                        Taxes
                      </TabsTrigger>
                      <TabsTrigger value="mortgages" className="text-xs">
                        <Landmark className="h-3 w-3 mr-1" />
                        Hypothèques
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="taxes" className="mt-3">
                      <Card className="border shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-primary" />
                            Historique des Taxes
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {tax_history && tax_history.length > 0 ? (
                            <div className="space-y-2">
                              {tax_history.map((tax, index) => (
                                <div key={index} className="border rounded-lg p-3 bg-background">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        {getPaymentStatusIcon(tax.payment_status)}
                                        <span className="text-xs font-semibold">{tax.tax_type}</span>
                                        <Badge 
                                          variant={getPaymentStatusBadge(tax.payment_status)}
                                          className="text-xs px-1 py-0"
                                        >
                                          {translatePaymentStatus(tax.payment_status)}
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Montant: {tax.amount.toLocaleString()} FC - Année: {tax.year}
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openConfirmationModal(
                                        'https://impots.cd/verify',
                                        'Vérification d\'authenticité',
                                        'Vérifier l\'authenticité du document de taxe signé auprès des services fiscaux',
                                        `Services des Impôts de ${parcel.location}`
                                      )}
                                      className="relative group overflow-hidden text-xs px-2 py-1 h-6 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-300"
                                    >
                                      <ExternalLink className="h-2.5 w-2.5 mr-1 group-hover:scale-110 transition-transform duration-200" />
                                      <span className="hidden xs:inline">Vérifier</span>
                                      <span className="xs:hidden">Vérif.</span>
                                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-out" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center text-xs text-muted-foreground py-2">
                              Aucun historique fiscal disponible
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="mortgages" className="mt-3">
                      <Card className="border shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Landmark className="h-4 w-4 text-primary" />
                            Hypothèques
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {mortgage_history && mortgage_history.length > 0 ? (
                            <div className="space-y-2">
                              {mortgage_history.map((mortgage, index) => (
                                <div key={index} className="border rounded-lg p-3 bg-background">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Landmark className="h-3 w-3 text-primary" />
                                        <span className="text-xs font-semibold">{mortgage.lender}</span>
                                        <Badge 
                                          variant={mortgage.status === 'active' ? 'destructive' : 'default'}
                                          className="text-xs px-1 py-0"
                                        >
                                          {mortgage.status === 'active' ? 'Active' : 'Clôturée'}
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Montant: {mortgage.amount.toLocaleString()} FC - Date: {formatDate(mortgage.start_date)}
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openConfirmationModal(
                                        'https://hypotheques.cd/verify',
                                        'Vérification d\'authenticité',
                                        'Vérifier l\'authenticité du document d\'hypothèque signé auprès du bureau des hypothèques',
                                        `Bureau des Hypothèques de ${parcel.location}`
                                      )}
                                      className="relative group overflow-hidden text-xs px-2 py-1 h-6 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-300"
                                    >
                                      <ExternalLink className="h-2.5 w-2.5 mr-1 group-hover:scale-110 transition-transform duration-200" />
                                      <span className="hidden xs:inline">Vérifier</span>
                                      <span className="xs:hidden">Vérif.</span>
                                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-out" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center text-xs text-muted-foreground py-2">
                              Aucune hypothèque enregistrée
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
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
                Pour toute vérification officielle, veuillez vous adresser directement aux bureaux compétents de votre circonscription foncière.
              </p>
            </div>
          </div>

          {/* Show invoice if requested */}
          {showInvoice && (
            <CadastralInvoice 
              result={result}
              services={paidServices} 
              onClose={() => setShowInvoice(false)}
              onFormatChange={(format) => setInvoiceFormat(format)}
              onDownload={() => {
                import('@/hooks/useCadastralBilling').then(({ CADASTRAL_SERVICES }) => {
                  const invoice = {
                    id: `INV-${Date.now()}`,
                    parcel_number: result.parcel.parcel_number,
                    services: paidServices,
                    total_amount: paidServices.reduce((sum, serviceId) => {
                      const service = CADASTRAL_SERVICES.find(s => s.id === serviceId);
                      return sum + (service?.price || 0);
                    }, 0),
                    created_at: new Date().toISOString(),
                    payment_status: 'paid'
                  };
                  
                  import('@/lib/pdf').then(({ generateInvoicePDF }) => {
                    generateInvoicePDF(invoice, CADASTRAL_SERVICES, invoiceFormat);
                  });
                });
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Modal de confirmation pour redirection */}
      <Dialog open={confirmationModal.isOpen} onOpenChange={closeConfirmationModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-foreground">
                  {confirmationModal.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Redirection vers un site externe
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-foreground">Destination :</span>
                  <div className="text-muted-foreground break-all">{confirmationModal.url}</div>
                </div>
                <div>
                  <span className="font-medium text-foreground">Objet :</span>
                  <div className="text-muted-foreground">{confirmationModal.description}</div>
                </div>
                <div>
                  <span className="font-medium text-foreground">Bureau :</span>
                  <div className="text-muted-foreground">{confirmationModal.location}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Vous êtes sur le point de quitter notre application et d'être dirigé vers le site officiel 
                  pour vérifier l'authenticité des documents cadastraux.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              onClick={closeConfirmationModal}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button
              onClick={confirmRedirect}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Continuer vers le site officiel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CadastralResultCard;

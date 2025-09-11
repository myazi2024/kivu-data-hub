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
import { DeedVerificationPanel } from './DeedVerificationPanel';

interface CadastralResultCardProps {
  result: CadastralSearchResult;
  onClose: () => void;
  selectedServices?: string[];
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
          <TabsList className="grid w-full grid-cols-4 h-auto bg-muted/50 p-1 rounded-xl shadow-inner">
            <TabsTrigger value="general" className="text-xs font-medium p-2 md:p-3">
              <div className="flex flex-col items-center gap-1">
                <span className="hidden sm:inline">Informations</span>
                <span className="sm:hidden">Info</span>
                {!hasServiceAccess('information') && <span className="text-xs opacity-60">🔒</span>}
              </div>
            </TabsTrigger>
            <TabsTrigger value="location" className="text-xs font-medium p-2 md:p-3">
              <div className="flex flex-col items-center gap-1">
                <span className="hidden sm:inline">Localisation</span>
                <span className="sm:hidden">Lieu</span>
                {!hasServiceAccess('location_history') && <span className="text-xs opacity-60">🔒</span>}
              </div>
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs font-medium p-2 md:p-3">
              <div className="flex flex-col items-center gap-1">
                <span className="hidden sm:inline">Historique</span>
                <span className="sm:hidden">Hist.</span>
                {!hasServiceAccess('history') && <span className="text-xs opacity-60">🔒</span>}
              </div>
            </TabsTrigger>
            <TabsTrigger value="obligations" className="text-xs font-medium p-2 md:p-3">
              <div className="flex flex-col items-center gap-1">
                <span className="hidden sm:inline">Obligations</span>
                <span className="sm:hidden">Oblig.</span>
                {!hasServiceAccess('obligations') && <span className="text-xs opacity-60">🔒</span>}
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Contenu masqué si aucun service n'est payé */}
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
                  {/* Informations de propriété */}
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
                      </div>
                    </CardContent>
                  </Card>

                  {/* Propriétaire actuel */}
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
                </div>

                {/* Circonscription foncière - Nouvelle section */}
                {parcel.circonscription_fonciere && (
                  <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-background to-secondary/5">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-primary">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <Landmark className="h-4 w-4" />
                        </div>
                        Circonscription Foncière
                      </h4>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Rattachée à:</span>
                        <span className="text-sm font-medium bg-secondary/10 px-3 py-1.5 rounded-md text-secondary-foreground">
                          {parcel.circonscription_fonciere}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
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
              <div className="space-y-4">
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

                {/* Composant de vérification d'actes */}
                <DeedVerificationPanel
                  parcelNumber={parcel.parcel_number}
                  currentOwner={parcel.current_owner_name}
                  circonscriptionFonciere={parcel.circonscription_fonciere}
                />
              </div>
            )}
          </TabsContent>

          {/* Autres onglets simplifiés */}
          <TabsContent value="location" className="mt-4">
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Localisation</h3>
              <p className="text-muted-foreground">Informations de localisation disponibles pour les utilisateurs premium</p>
            </div>
          </TabsContent>

          <TabsContent value="obligations" className="mt-4">
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Obligations fiscales</h3>
              <p className="text-muted-foreground">Historique des taxes et obligations pour les utilisateurs premium</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CadastralResultCard;
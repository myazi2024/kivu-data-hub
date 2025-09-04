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
  MapPin as Surveyor
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
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
    // Simuler le téléchargement PDF
    const element = document.createElement('a');
    const content = `Facture BIC - Parcelle ${result.parcel.parcel_number} - Services: ${paidServices.join(', ')}`;
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `facture-bic-${result.parcel.parcel_number}-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
    />;
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="pb-3 md:pb-4 p-3 md:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center gap-2 responsive-subtitle">
              <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
              <span className="truncate">Parcelle {parcel.parcel_number}</span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant={parcel.parcel_type === 'SU' ? 'default' : 'secondary'} className="text-xs">
                {parcel.parcel_type === 'SU' ? 'Section Urbaine' : 'Section Rurale'}
              </Badge>
              <Badge variant="outline" className="text-xs truncate max-w-32 md:max-w-none">{parcel.location}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 shrink-0">
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3 md:p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
            <TabsTrigger value="general" className="text-xs md:text-sm p-2 md:p-3">
              <span className="hidden sm:inline">Informations</span>
              <span className="sm:hidden">Info</span>
              {!hasServiceAccess('information') && <span className="ml-1">🔒</span>}
            </TabsTrigger>
            <TabsTrigger value="location" className="text-xs md:text-sm p-2 md:p-3">
              <span className="hidden sm:inline">Localisation</span>
              <span className="sm:hidden">Lieu</span>
              {!hasServiceAccess('location_history') && <span className="ml-1">🔒</span>}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs md:text-sm p-2 md:p-3 hidden md:flex">
              Historique {!hasServiceAccess('history') && '🔒'}
            </TabsTrigger>
            <TabsTrigger value="obligations" className="text-xs md:text-sm p-2 md:p-3 hidden md:flex">
              Obligations {!hasServiceAccess('obligations') && '🔒'}
            </TabsTrigger>
          </TabsList>
          
          {/* Mobile: Additional tabs in dropdown or secondary row */}
          <div className="md:hidden mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="history" className="text-xs p-2">
                Historique {!hasServiceAccess('history') && '🔒'}
              </TabsTrigger>
              <TabsTrigger value="obligations" className="text-xs p-2">
                Obligations {!hasServiceAccess('obligations') && '🔒'}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Contenu masqué si pas d'accès - Mobile optimized */}
          {!hasServiceAccess('information') && !hasServiceAccess('location_history') && 
           !hasServiceAccess('history') && !hasServiceAccess('obligations') && (
            <div className="mt-4 p-4 md:p-8 text-center border-2 border-dashed border-muted-foreground/30 rounded-lg">
              <div className="space-y-3 md:space-y-4">
                <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-muted rounded-full flex items-center justify-center">
                  <FileText className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="responsive-subtitle font-semibold mb-2">Contenu verrouillé</h3>
                  <p className="responsive-body text-muted-foreground">
                    Le contenu détaillé de cette parcelle est accessible via paiement. 
                    Veuillez sélectionner et payer les services souhaités pour accéder aux informations.
                  </p>
                </div>
                <Button onClick={() => setShowBillingPanel(true)} className="mt-4 btn-responsive">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Accéder aux services payants
                </Button>
              </div>
            </div>
          )}

          {/* Onglet Informations générales - Mobile optimized */}
          <TabsContent value="general" className="mt-3 md:mt-4 space-y-3 md:space-y-4">
            {!hasServiceAccess('information') ? (
              <div className="p-4 md:p-8 text-center border-2 border-dashed border-muted-foreground/30 rounded-lg">
                <div className="space-y-3 md:space-y-4">
                  <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-muted rounded-full flex items-center justify-center">
                    <Building className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="responsive-subtitle font-semibold mb-2">Contenu verrouillé</h3>
                    <p className="responsive-body text-muted-foreground">
                      Les informations générales de cette parcelle nécessitent un paiement pour être accessibles.
                    </p>
                  </div>
                  <Button onClick={() => { setPreselectServiceId('information'); setShowBillingPanel(true); }} className="mt-4 btn-responsive">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Payer pour accéder à ce service
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3 md:space-y-4 md:grid md:grid-cols-2 md:gap-4">
                  {/* Informations de propriété - Mobile stacked */}
                  <Card>
                    <CardContent className="p-3 md:p-4">
                      <h4 className="responsive-body font-semibold mb-3 flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Titre de Propriété
                      </h4>
                      <div className="space-y-2 responsive-caption">
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                          <span className="text-muted-foreground">Type :</span>
                          <span className="font-medium">{parcel.property_title_type}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                          <span className="text-muted-foreground">Superficie :</span>
                          <span className="font-medium">{formatArea(parcel.area_sqm)}</span>
                        </div>
                        {parcel.area_hectares > 0 && (
                          <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                            <span className="text-muted-foreground">En hectares :</span>
                            <span className="font-medium">{parcel.area_hectares.toFixed(2)} ha</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Propriétaire actuel - Mobile stacked */}
                  <Card>
                    <CardContent className="p-3 md:p-4">
                      <h4 className="responsive-body font-semibold mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Propriétaire Actuel
                      </h4>
                      <div className="space-y-2 responsive-caption">
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                          <span className="text-muted-foreground">Nom :</span>
                          <span className="font-medium break-words">{parcel.current_owner_name}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                          <span className="text-muted-foreground">Statut :</span>
                          <span className="font-medium">{parcel.current_owner_legal_status}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                          <span className="text-muted-foreground">Depuis :</span>
                          <span className="font-medium">{formatDate(parcel.current_owner_since)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Statut fiscal - Mobile optimized */}
                <Card>
                  <CardContent className="p-3 md:p-4">
                    <h4 className="responsive-body font-semibold mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Statut Fiscal
                    </h4>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        {taxStatus.status === 'up_to_date' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {taxStatus.status === 'pending' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                        {taxStatus.status === 'overdue' && <XCircle className="h-4 w-4 text-red-500" />}
                        <span className="responsive-caption">
                          {taxStatus.status === 'up_to_date' && 'À jour'}
                          {taxStatus.status === 'pending' && `${taxStatus.count} paiement(s) en attente`}
                          {taxStatus.status === 'overdue' && `${taxStatus.count} paiement(s) en retard`}
                        </span>
                      </div>
                      <Button variant="outline" size="sm" className="w-full sm:w-auto btn-responsive-sm">
                        <Download className="h-3 w-3 mr-1" />
                        Export PDF
                      </Button>
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
import React, { useState } from 'react';
import { 
  CreditCard, 
  CheckCircle, 
  FileText, 
  DollarSign,
  Lock,
  Receipt,
  X,
  MapPin,
  History,
  Shield,
  Building2,
  ChevronDown,
  ChevronRight,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCadastralBilling } from '@/hooks/useCadastralBilling';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import CadastralPaymentDialog from './CadastralPaymentDialog';
import DiscountCodeInput from './DiscountCodeInput';

interface CadastralBillingPanelProps {
  searchResult: CadastralSearchResult;
  onPaymentSuccess: (selectedServices: string[]) => void;
  preselectServiceId?: string;
  onClose?: () => void;
  onRequestContribution?: () => void;
}

// Icône pour chaque service
const getServiceIcon = (serviceId: string) => {
  switch (serviceId) {
    case 'information':
      return Info;
    case 'location_history':
      return MapPin;
    case 'history':
      return History;
    case 'obligations':
      return Receipt;
    default:
      return FileText;
  }
};

// Mapping des services aux données disponibles dans une parcelle
const getServiceDataAvailability = (searchResult: CadastralSearchResult) => {
  const { parcel, ownership_history, tax_history, mortgage_history, boundary_history, building_permits } = searchResult;
  
  // Service "information" - Informations générales (toujours disponible)
  const hasInformation = true;
  
  // Service "location_history" - Localisation et Historique de bornage
  const hasLocationHistory = !!(
    (parcel.province && parcel.ville) || 
    (boundary_history && boundary_history.length > 0) ||
    (parcel.gps_coordinates && Array.isArray(parcel.gps_coordinates) && parcel.gps_coordinates.length > 0)
  );
  
  // Service "history" - Historique complet des propriétaires
  const hasHistory = !!(ownership_history && ownership_history.length > 0);
  
  // Service "obligations" - Obligations fiscales et hypothécaires
  const hasObligations = !!(
    (tax_history && tax_history.length > 0) ||
    (mortgage_history && mortgage_history.length > 0)
  );
  
  return {
    'information': hasInformation,
    'location_history': hasLocationHistory,
    'history': hasHistory,
    'obligations': hasObligations
  };
};

const CadastralBillingPanel: React.FC<CadastralBillingPanelProps> = ({ 
  searchResult, 
  onPaymentSuccess,
  preselectServiceId,
  onClose,
  onRequestContribution
}) => {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    reseller_id: string;
    code_id: string;
  } | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [highlightTerms, setHighlightTerms] = useState(false);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [paymentConfig, setPaymentConfig] = useState<{
    enabled: boolean;
    bypass_payment: boolean;
    test_mode: boolean;
  } | null>(null);
  const { toast } = useToast();
  const {
    loading,
    selectedServices,
    currentInvoice,
    catalogServices, // Services réactifs du catalogue
    toggleService,
    getTotalAmount,
    createInvoice,
    setCurrentInvoice
  } = useCadastralBilling();

  // Vérifier la disponibilité des données pour chaque service
  const serviceAvailability = React.useMemo(() => 
    getServiceDataAvailability(searchResult), 
    [searchResult]
  );

  // Charger la configuration du mode de paiement
  React.useEffect(() => {
    const loadPaymentConfig = async () => {
      const { data } = await supabase
        .from('cadastral_search_config')
        .select('config_value')
        .eq('config_key', 'payment_mode')
        .eq('is_active', true)
        .maybeSingle();

      if (data?.config_value) {
        setPaymentConfig(data.config_value as any);
      }
    };
    
    loadPaymentConfig();
    
    // Écouter les changements de configuration en temps réel
    const channel = supabase
      .channel('payment-config-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cadastral_search_config',
          filter: 'config_key=eq.payment_mode'
        },
        (payload) => {
          if (payload.new.config_value) {
            setPaymentConfig(payload.new.config_value as any);
            toast({
              title: "Configuration mise à jour",
              description: "Le mode de paiement a été actualisé",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Initialiser tous les services comme déroulés par défaut
  React.useEffect(() => {
    if (catalogServices.length > 0 && expandedServices.size === 0) {
      const allServiceIds = new Set(catalogServices.map(s => s.id));
      setExpandedServices(allServiceIds);
    }
  }, [catalogServices]);

  // Pré-sélectionner un service si demandé
  React.useEffect(() => {
    if (preselectServiceId && !selectedServices.includes(preselectServiceId)) {
      toggleService(preselectServiceId);
    }
  }, [preselectServiceId]);

  const handleServiceToggle = (serviceId: string) => {
    toggleService(serviceId);
  };

  const toggleServiceExpansion = (serviceId: string) => {
    const newExpandedServices = new Set(expandedServices);
    if (newExpandedServices.has(serviceId)) {
      newExpandedServices.delete(serviceId);
    } else {
      newExpandedServices.add(serviceId);
    }
    setExpandedServices(newExpandedServices);
  };
  const handleProceedToPayment = async () => {
    if (!acceptedTerms) {
      // Déclencher l'animation de surbrillance
      setHighlightTerms(true);
      setTimeout(() => setHighlightTerms(false), 2000);
      toast({
        title: "Termes et conditions requis",
        description: "Veuillez accepter les conditions d'utilisation pour continuer",
        variant: "destructive"
      });
      return;
    }
    
    // Mode développement - bypass du paiement
    if (paymentConfig?.bypass_payment) {
      const invoice = await createInvoice(searchResult, appliedDiscount);
      if (invoice) {
        toast({
          title: "Accès accordé",
          description: "Services débloqués avec succès (mode développement)",
          duration: 3000
        });
        onPaymentSuccess(selectedServices);
      }
      return;
    }
    
    // Mode paiement activé
    if (paymentConfig?.enabled) {
      const invoice = await createInvoice(searchResult, appliedDiscount);
      if (invoice) {
        setShowPaymentDialog(true);
      }
    } else {
      // Par défaut, si aucune configuration, on affiche un message d'erreur
      toast({
        title: "Paiement non configuré",
        description: "Le système de paiement n'est pas encore configuré. Contactez l'administrateur.",
        variant: "destructive"
      });
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentDialog(false);
    onPaymentSuccess(selectedServices);
  };

  // Service icons mapping pour une meilleure identité visuelle
  const getServiceIcon = (serviceId: string) => {
    const iconMap = {
      'information': FileText,
      'location_history': MapPin,
      'history': History,
      'legal_verification': Shield
    };
    return iconMap[serviceId as keyof typeof iconMap] || Building2;
  };

  const totalAmount = getTotalAmount();
  const discountedAmount = appliedDiscount ? Math.max(0, totalAmount - appliedDiscount.amount) : totalAmount;

  return (
    <TooltipProvider>
      <Card className="w-full border-primary/20 bg-gradient-to-br from-background to-secondary/5 relative">
        {/* Bouton fermer */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2 right-2 z-10 p-1.5 rounded-md border bg-background/95 backdrop-blur-sm text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            aria-label="Fermer le catalogue"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        
        <CardHeader className="pb-3 p-3 md:p-4 pr-8">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm md:text-base truncate">
                Parcelle {searchResult.parcel.parcel_number}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {searchResult.parcel.location} • {searchResult.parcel.parcel_type === 'SU' ? 'Urbaine' : 'Rurale'}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 md:space-y-4 p-3 md:p-4">
          {/* Information douce sur les données trouvées avec code couleur animé */}
          <div 
            className={`
              flex items-start gap-3 p-3 rounded-lg border transition-all duration-300 cursor-pointer
              hover:scale-[1.01] active:scale-[0.99] active:transition-transform active:duration-75
              ${(() => {
                const availableServices = catalogServices.length;
                if (availableServices === 4) {
                  return 'bg-emerald-100/80 border-emerald-300/60 dark:bg-emerald-900/30 dark:border-emerald-700/50';
                } else if (availableServices === 3) {
                  return 'bg-blue-100/80 border-blue-300/60 dark:bg-blue-900/30 dark:border-blue-700/50';
                } else if (availableServices === 2) {
                  return 'bg-amber-100/80 border-amber-300/60 dark:bg-amber-900/30 dark:border-amber-700/50';
                } else {
                  return 'bg-slate-100/80 border-slate-300/60 dark:bg-slate-900/30 dark:border-slate-700/50';
                }
              })()}
            `}
            onClick={() => {
              // Animation subtile déjà gérée par les classes CSS
            }}
          >
            <div className="flex-shrink-0 mt-0.5">
              <CheckCircle className={`
                h-4 w-4 transition-colors duration-300
                ${(() => {
                  const availableServices = catalogServices.length;
                  if (availableServices === 4) {
                    return 'text-emerald-700 dark:text-emerald-300';
                  } else if (availableServices === 3) {
                    return 'text-blue-700 dark:text-blue-300';
                  } else if (availableServices === 2) {
                    return 'text-amber-700 dark:text-amber-300';
                  } else {
                    return 'text-slate-700 dark:text-slate-300';
                  }
                })()}
              `} />
            </div>
            <div>
              <p className={`
                text-[10px] md:text-sm leading-relaxed transition-colors duration-300
                ${(() => {
                  const availableServices = catalogServices.length;
                  if (availableServices === 4) {
                    return 'text-emerald-900 dark:text-emerald-100';
                  } else if (availableServices === 3) {
                    return 'text-blue-900 dark:text-blue-100';
                  } else if (availableServices === 2) {
                    return 'text-amber-900 dark:text-amber-100';
                  } else {
                    return 'text-slate-900 dark:text-slate-100';
                  }
                })()}
              `}>
                Bonne nouvelle : cette parcelle dispose d'informations cadastrales détaillées. Parcourez la liste ci-dessus et sélectionnez les données que vous souhaitez consulter.
              </p>
            </div>
          </div>

          {/* Catalogue de services modernisé */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base md:text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Catalogue de Services
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {catalogServices.length} services
                </Badge>
              </div>
            </div>
            
            {/* Option sélectionner tout */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-dashed">
              <div className="flex items-center gap-2">
                <Checkbox 
                  checked={selectedServices.length === catalogServices.filter(s => serviceAvailability[s.id] ?? true).length && selectedServices.length > 0}
                  onCheckedChange={(checked) => {
                    const availableServices = catalogServices.filter(s => serviceAvailability[s.id] ?? true);
                    if (checked) {
                      // Sélectionner tous les services disponibles
                      availableServices.forEach(service => {
                        if (!selectedServices.includes(service.id)) {
                          toggleService(service.id);
                        }
                      });
                    } else {
                      // Désélectionner tous les services
                      selectedServices.forEach(serviceId => {
                        toggleService(serviceId);
                      });
                    }
                  }}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Tout sélectionner</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {catalogServices.filter(s => serviceAvailability[s.id] ?? true).length} disponible(s)
              </Badge>
            </div>
            
            {/* Services simplifiés avec détails masquables */}
            <div className="space-y-3">
              {catalogServices.map((service) => {
                const IconComponent = getServiceIcon(service.id);
                const isSelected = selectedServices.includes(service.id);
                const isExpanded = expandedServices.has(service.id);
                const hasData = serviceAvailability[service.id] ?? true;
                const isDisabled = !hasData;
                
                return (
                  <div 
                    key={service.id}
                    className={`
                      rounded-lg border transition-all duration-200
                      ${isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border bg-background hover:border-primary/30'
                      }
                      ${isDisabled ? 'opacity-60 bg-muted/30' : ''}
                    `}
                  >
                    <div className="flex items-start gap-3 p-4">
                      {/* Icône du service */}
                      <div className={`
                        p-2 rounded-lg shrink-0 transition-colors
                        ${isSelected 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                        }
                        ${isDisabled ? 'opacity-50' : ''}
                      `}>
                        <IconComponent className="h-4 w-4" />
                      </div>

                      {/* Détails du service alignés à gauche */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-xs sm:text-sm leading-tight mb-1 text-left">
                            {service.name}
                          </h4>
                          {isDisabled && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 shrink-0">
                              Données manquantes
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Bouton pour dérouler/masquer les détails */}
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleServiceExpansion(service.id);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                      </Collapsible>

                      {/* Prix et Checkbox */}
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          ${service.price}
                        </Badge>
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={() => !isDisabled && handleServiceToggle(service.id)}
                          disabled={isDisabled}
                          className="h-4 w-4"
                        />
                      </div>
                    </div>

                    {/* Détails déroulants */}
                    <Collapsible open={isExpanded}>
                      <CollapsibleContent className="px-4 pb-4">
                        <div className="space-y-2 text-left">
                          <p className="text-xs md:text-sm text-foreground/80 leading-relaxed text-left">
                            {service.description}
                          </p>
                          {isDisabled && (
                            <Alert className="mt-3">
                              <Info className="h-4 w-4" />
                              <AlertDescription className="text-xs space-y-2">
                                <p>Ces données n'ont pas encore été ajoutées pour cette parcelle.</p>
                                {onRequestContribution && (
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRequestContribution();
                                    }}
                                    size="sm"
                                    variant="outline"
                                    className="w-full mt-2"
                                  >
                                    Compléter les données
                                  </Button>
                                )}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Code de remise modernisé */}
          {selectedServices.length > 0 && (
            <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-background via-background to-secondary/10">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-50" />
              <div className="relative p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Receipt className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground/80">Code de remise</span>
                  <Badge variant="outline" className="text-xs px-2">Optionnel</Badge>
                </div>
                <DiscountCodeInput
                  invoiceAmount={totalAmount}
                  onDiscountApplied={setAppliedDiscount}
                  className="bg-background/50 backdrop-blur-sm border-border/50 focus-within:border-primary/50 transition-all duration-200"
                />
              </div>
            </div>
          )}

          {/* Total avec TVA */}
          {selectedServices.length > 0 && (
            <div className="space-y-3">
              {/* Sous-total et TVA */}
              <div className="space-y-2 px-4 py-3 bg-muted/20 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total services</span>
                  <span className="font-medium">
                    ${(appliedDiscount ? Math.max(0, totalAmount - appliedDiscount.amount) : totalAmount).toFixed(2)} USD
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>TVA (16%)</span>
                  <span>
                    ${((appliedDiscount ? Math.max(0, totalAmount - appliedDiscount.amount) : totalAmount) * 0.16).toFixed(2)} USD
                  </span>
                </div>
              </div>
              
              {/* Total final */}
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                <span className="font-semibold">Total à payer</span>
                <div className="text-right">
                  <div className="text-xl font-bold text-primary">
                    ${((appliedDiscount ? Math.max(0, totalAmount - appliedDiscount.amount) : totalAmount) * 1.16).toFixed(2)} USD
                  </div>
                  {appliedDiscount && (
                    <div className="text-xs text-green-600 dark:text-green-400">
                      Économie: ${appliedDiscount.amount.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Conditions d'utilisation modernisées */}
          {selectedServices.length > 0 && (
            <div className={`
              p-4 rounded-xl border-2 transition-all duration-500
              ${highlightTerms 
                ? 'border-destructive bg-destructive/5 ring-4 ring-destructive/20 animate-pulse' 
                : 'border-border bg-gradient-to-br from-muted/30 to-background hover:border-primary/30'
              }
            `}>
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  className={`
                    mt-1 h-5 w-5 transition-all duration-300
                    ${highlightTerms ? 'ring-2 ring-destructive ring-offset-2' : 'hover:ring-2 hover:ring-primary/20'}
                  `}
                />
                <div className="flex-1">
                  <label 
                    htmlFor="terms" 
                    className={`
                      text-sm leading-relaxed cursor-pointer block
                      ${highlightTerms ? 'text-destructive font-medium' : 'text-foreground'}
                    `}
                  >
                    J'accepte les{" "}
                    <a 
                      href="/legal" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline font-medium transition-colors"
                    >
                      conditions d'utilisation BIC
                    </a>
                    {" "}et confirme la commande des services sélectionnés.
                  </label>
                  <p className="text-xs text-muted-foreground mt-2">
                    En cochant cette case, vous autorisez le traitement de vos données cadastrales conformément à notre politique de confidentialité.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bouton d'accès direct modernisé */}
          <div className="space-y-4">
            <Button 
              onClick={handleProceedToPayment}
              disabled={selectedServices.length === 0 || loading}
              className={`
                w-full h-12 md:h-14 text-base md:text-lg font-semibold
                rounded-xl transition-all duration-300 ease-out touch-target
                ${selectedServices.length > 0 && acceptedTerms 
                  ? `
                    bg-gradient-to-r from-primary via-primary to-primary/90 
                    hover:from-primary/90 hover:via-primary hover:to-primary 
                    shadow-elegant hover:shadow-hover hover:scale-[1.02] 
                    active:scale-[0.98] ring-2 ring-primary/20 ring-offset-2
                  ` 
                  : selectedServices.length > 0 
                  ? `
                    bg-gradient-to-r from-muted-foreground to-muted-foreground/80 
                    hover:from-muted-foreground/90 hover:to-muted-foreground/70
                  `
                  : 'opacity-50 cursor-not-allowed bg-muted'
                }
                focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30
              `}
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-background border-t-transparent" />
                  <span>Traitement en cours...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {paymentConfig?.bypass_payment ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <CreditCard className="h-5 w-5" />
                  )}
                  <span>
                    {selectedServices.length === 0 
                      ? 'Sélectionner des services' 
                      : !acceptedTerms 
                      ? 'Accepter les conditions'
                      : paymentConfig?.bypass_payment
                      ? 'Accéder aux services (Gratuit)'
                      : paymentConfig?.test_mode
                      ? 'Payer (Mode Test)'
                      : 'Payer'
                    }
                  </span>
                  {selectedServices.length > 0 && acceptedTerms && (
                    <div className="ml-auto flex items-center gap-1 text-sm opacity-90">
                      <Lock className="h-3 w-3" />
                      <span className="hidden sm:inline">Sécurisé</span>
                    </div>
                  )}
                </div>
              )}
            </Button>
            
            {/* Messages d'aide contextuels */}
            <div className="text-center space-y-2">
              {selectedServices.length === 0 && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <p className="text-sm">Choisissez les services qui vous intéressent ci-dessus</p>
                </div>
              )}
              
              {selectedServices.length > 0 && !acceptedTerms && (
                <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
                  <Shield className="h-4 w-4" />
                  <p className="text-sm">Validation des conditions requise pour continuer</p>
                </div>
              )}
              
              {selectedServices.length > 0 && acceptedTerms && (
                <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <p className="text-sm">
                    {paymentConfig?.bypass_payment 
                      ? 'Accès gratuit en mode développement' 
                      : paymentConfig?.test_mode
                      ? 'Prêt pour le paiement de test'
                      : 'Prêt pour le paiement sécurisé'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de paiement */}
      {showPaymentDialog && currentInvoice && (
        <CadastralPaymentDialog
          invoice={currentInvoice}
          onClose={() => setShowPaymentDialog(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </TooltipProvider>
  );
};

export default CadastralBillingPanel;
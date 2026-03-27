import React, { useState, useRef } from 'react';
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
  Info,
  Scale
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCadastralCart } from '@/hooks/useCadastralCart';
import { useCadastralPayment } from '@/hooks/useCadastralPayment';
import { useCadastralServices } from '@/hooks/useCadastralServices';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import { useToast } from '@/hooks/use-toast';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
import { useCurrencyConfig } from '@/hooks/useCurrencyConfig';
import CadastralPaymentDialog from './CadastralPaymentDialog';
import DiscountCodeInput from './DiscountCodeInput';
import CurrencySelector from '@/components/payment/CurrencySelector';
import { formatCurrency } from '@/utils/formatters';
import { TVA_RATE } from '@/constants/billing';

interface CadastralBillingPanelProps {
  searchResult: CadastralSearchResult;
  onPaymentSuccess: (selectedServices: string[]) => void;
  preselectServiceId?: string;
  onClose?: () => void;
  onRequestContribution?: () => void;
  alreadyPaidServices?: string[];
}

const getServiceDataAvailability = (searchResult: CadastralSearchResult) => {
  const { parcel, ownership_history, tax_history, mortgage_history, boundary_history, building_permits } = searchResult;
  
  const hasInformation = true;
  const hasLocationHistory = !!(
    (parcel.province && parcel.ville) || 
    (boundary_history && boundary_history.length > 0) ||
    (parcel.gps_coordinates && Array.isArray(parcel.gps_coordinates) && parcel.gps_coordinates.length > 0)
  );
  const hasHistory = !!(ownership_history && ownership_history.length > 0);
  const hasObligations = !!(
    (tax_history && tax_history.length > 0) ||
    (mortgage_history && mortgage_history.length > 0)
  );
  
  return {
    'information': hasInformation,
    'location_history': hasLocationHistory,
    'history': hasHistory,
    'obligations': hasObligations,
    'land_disputes': true
  } as Record<string, boolean>;
};

const CadastralBillingPanel: React.FC<CadastralBillingPanelProps> = ({ 
  searchResult, 
  onPaymentSuccess,
  preselectServiceId,
  onClose,
  onRequestContribution,
  alreadyPaidServices = []
}) => {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    reseller_id: string;
    code_id: string;
  } | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [highlightTerms, setHighlightTerms] = useState(false);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  // Fix #10: Une seule instanciation de usePaymentConfig, passée au dialog
  const { paymentMode, isPaymentRequired, availableMethods } = usePaymentConfig();
  const { services: catalogServices, loading: catalogLoading, error: catalogError } = useCadastralServices();
  const { selectedServices, addService, addServices, removeService, toggleService, getTotalAmount, setParcelNumber, isSelected, updateServicePrices } = useCadastralCart();
  const { loading, createInvoice, processMobileMoneyPayment, processStripePayment, paymentStep, resetPaymentState } = useCadastralPayment();
  const { currencies, selectedCurrency, setSelectedCurrency, convertFromUsd, exchangeRate } = useCurrencyConfig();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const serviceAvailability = React.useMemo(() => 
    getServiceDataAvailability(searchResult), 
    [searchResult]
  );

  // Fix #18: Synchroniser les prix du panier via batch update (1 seul re-render)
  React.useEffect(() => {
    if (catalogServices.length === 0 || selectedServices.length === 0) return;
    const updates = selectedServices
      .map(cartItem => {
        const catalogItem = catalogServices.find(s => s.id === cartItem.id);
        if (catalogItem && catalogItem.price !== cartItem.price) {
          return { id: catalogItem.id, price: catalogItem.price };
        }
        return null;
      })
      .filter((u): u is { id: string; price: number } => u !== null);
    
    if (updates.length > 0) {
      updateServicePrices(updates);
    }
  }, [catalogServices]);

  React.useEffect(() => {
    setParcelNumber(searchResult.parcel.parcel_number);
  }, [searchResult.parcel.parcel_number, setParcelNumber]);

  // Par défaut, seuls les services avec données disponibles sont déroulés
  React.useEffect(() => {
    if (catalogServices.length > 0 && expandedServices.size === 0) {
      const servicesWithData = new Set(
        catalogServices
          .filter(s => serviceAvailability[s.id] ?? true)
          .map(s => s.id)
      );
      setExpandedServices(servicesWithData);
    }
  }, [catalogServices, serviceAvailability]);

  React.useEffect(() => {
    if (preselectServiceId && catalogServices.length > 0 && !selectedServices.some(s => s.id === preselectServiceId)) {
      const service = catalogServices.find(s => s.id === preselectServiceId);
      if (service) {
        toggleService({
          id: service.id,
          name: service.name,
          price: service.price,
          description: service.description,
          parcel_number: searchResult.parcel.parcel_number,
          parcel_location: searchResult.parcel.location
        });
      }
    }
  }, [preselectServiceId, catalogServices]);

  const handleServiceToggle = (serviceId: string) => {
    const service = catalogServices.find(s => s.id === serviceId);
    if (service) {
      toggleService({
        id: service.id,
        name: service.name,
        price: service.price,
        description: service.description,
        parcel_number: searchResult.parcel.parcel_number,
        parcel_location: searchResult.parcel.location
      });
    }
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
    if (isSubmitting || loading) return; // Fix: double-click prevention
    
    if (!acceptedTerms) {
      setHighlightTerms(true);
      setTimeout(() => setHighlightTerms(false), 2000);
      toast({
        title: "Termes et conditions requis",
        description: "Veuillez accepter les conditions d'utilisation pour continuer",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (isPaymentRequired()) {
        const invoice = await createInvoice(appliedDiscount ?? undefined);
        if (invoice) {
          setCurrentInvoice(invoice);
          setShowPaymentDialog(true);
        }
      } else {
        // Paiement non activé — accès gratuit (comme bypass)
        const invoice = await createInvoice(appliedDiscount ?? undefined);
        if (invoice) {
          toast({
            title: "Accès accordé",
            description: "Services débloqués avec succès",
            duration: 3000
          });
          onPaymentSuccess(selectedServices.map(s => s.id));
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = (services: string[]) => {
    setShowPaymentDialog(false);
    onPaymentSuccess(services.length > 0 ? services : selectedServices.map(s => s.id));
  };

  const getServiceIcon = (serviceId: string) => {
    const iconMap: Record<string, any> = {
      'information': FileText,
      'location_history': MapPin,
      'history': History,
      'obligations': Receipt,
      'land_disputes': Scale
      // Fix #16: Supprimé 'legal_verification' qui n'existe pas dans le catalogue
    };
    return iconMap[serviceId] || Building2;
  };

  const totalAmount = getTotalAmount();
  const discountedAmount = appliedDiscount ? Math.max(0, totalAmount - appliedDiscount.amount) : totalAmount;
  const selectedServiceIds = selectedServices.map(s => s.id);

  // Fix #6: Calculer les services sélectionnables (non payés, avec données)
  const selectableServices = catalogServices.filter(
    s => (serviceAvailability[s.id] ?? true) && !alreadyPaidServices.includes(s.id)
  );
  const allSelectableSelected = selectableServices.length > 0 && 
    selectableServices.every(s => selectedServiceIds.includes(s.id));

  return (
    <TooltipProvider>
      <Card className="w-full max-w-[380px] sm:max-w-none mx-auto border-primary/20 bg-gradient-to-br from-background to-secondary/5 rounded-2xl overflow-hidden shadow-sm">
        <CardHeader className="pb-2 p-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-primary/10 shadow-sm">
              <FileText className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm font-semibold truncate">
                {searchResult.parcel.parcel_number}
              </CardTitle>
              <p className="text-xs text-muted-foreground truncate">
                {searchResult.parcel.location} • {searchResult.parcel.parcel_type === 'SU' ? 'Urbaine' : 'Rurale'}
              </p>
            </div>
            <Badge variant="outline" className="text-xs px-1.5 py-0.5 shrink-0">
              {catalogServices.length} services
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-2.5 p-3">
          {/* Message info compact */}
          <div className="flex items-start gap-2 p-2 rounded-xl bg-emerald-50/80 border border-emerald-200/60 dark:bg-emerald-900/20 dark:border-emerald-700/40">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
              Cette parcelle dispose de données cadastrales. Sélectionnez les services souhaités.
            </p>
          </div>

          {catalogLoading ? (
            <div className="flex items-center justify-center p-6">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
              <span className="ml-2 text-xs text-muted-foreground">Chargement du catalogue...</span>
            </div>
          ) : catalogError ? (
            <Alert variant="destructive" className="text-xs">
              <AlertDescription>
                Impossible de charger le catalogue de services. Veuillez réessayer.
              </AlertDescription>
            </Alert>
          ) : (
          <div className="space-y-2">
            {/* Fix #6: "Tout sélectionner" corrigé — utilise addService/removeService au lieu de toggle */}
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded-xl border border-dashed">
              <div className="flex items-center gap-2">
                <Checkbox 
                  checked={allSelectableSelected}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      // Ajouter tous les services sélectionnables non encore sélectionnés
                      selectableServices.forEach(service => {
                        if (!selectedServiceIds.includes(service.id)) {
                          addService({
                            id: service.id,
                            name: service.name,
                            price: service.price,
                            description: service.description,
                            parcel_number: searchResult.parcel.parcel_number,
                            parcel_location: searchResult.parcel.location
                          });
                        }
                      });
                    } else {
                      // Retirer tous les services sélectionnés
                      selectedServiceIds.forEach(id => removeService(id));
                    }
                  }}
                  className="h-3.5 w-3.5"
                />
                <span className="text-xs font-medium">Tout sélectionner</span>
              </div>
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                {selectableServices.length} dispo.
              </Badge>
            </div>
            
            {/* Liste des services */}
            <div className="space-y-2">
              {catalogServices.map((service) => {
                const IconComponent = getServiceIcon(service.id);
                const isServiceSelected = selectedServiceIds.includes(service.id);
                const isExpanded = expandedServices.has(service.id);
                const hasData = serviceAvailability[service.id] ?? true;
                const isAlreadyPaid = alreadyPaidServices.includes(service.id);
                const isDisabled = !hasData || isAlreadyPaid;
                
                return (
                  <div 
                    key={service.id}
                    onClick={() => !isDisabled && handleServiceToggle(service.id)}
                    className={`
                      transition-all duration-200 cursor-pointer
                      ${hasData 
                        ? 'rounded-2xl border-2 shadow-md hover:shadow-lg' 
                        : 'rounded-xl border'
                      }
                      ${isServiceSelected 
                        ? 'border-primary bg-primary/5' 
                        : hasData 
                          ? 'border-primary/40 bg-background hover:border-primary/60' 
                          : 'border-border/50 bg-muted/20'
                      }
                      ${isDisabled ? 'cursor-not-allowed' : ''}
                    `}
                  >
                    <div className={`flex items-center gap-2 ${hasData ? 'p-3' : 'p-2'}`}>
                      <div className={`
                        shrink-0 transition-colors
                        ${hasData ? 'p-2 rounded-xl' : 'p-1.5 rounded-lg'}
                        ${isServiceSelected 
                          ? 'bg-primary text-primary-foreground' 
                          : hasData 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-muted text-muted-foreground/50'
                        }
                      `}>
                        <IconComponent className={hasData ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className={`
                          font-medium leading-tight truncate
                          ${hasData 
                            ? 'text-sm text-foreground' 
                            : 'text-xs text-muted-foreground'
                          }
                        `}>
                          {service.name}
                        </h4>
                        {isAlreadyPaid ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">✓ Déjà acheté</span>
                        ) : !hasData ? (
                          <span className="text-[10px] text-muted-foreground/60">Données manquantes</span>
                        ) : null}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleServiceExpansion(service.id);
                        }}
                        className={`p-0 rounded-lg ${hasData ? 'h-7 w-7' : 'h-6 w-6'}`}
                      >
                        <ChevronDown className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${hasData ? 'h-4 w-4' : 'h-3.5 w-3.5'}`} />
                      </Button>

                      <Badge 
                        variant={hasData ? "default" : "secondary"} 
                        className={`shrink-0 ${hasData ? 'text-sm px-2 py-0.5 font-semibold' : 'text-xs px-1.5 py-0.5 opacity-60'}`}
                      >
                        ${service.price.toFixed(2)}
                      </Badge>
                      
                      <Checkbox 
                        checked={isServiceSelected}
                        disabled={isDisabled}
                        className={`pointer-events-none ${hasData ? 'h-5 w-5' : 'h-4 w-4 opacity-50'}`}
                      />
                    </div>

                    <Collapsible open={isExpanded}>
                      <CollapsibleContent className={hasData ? 'px-3 pb-3' : 'px-2.5 pb-2.5'}>
                        <div className="space-y-1.5 text-left pt-1 border-t border-border/50">
                          <p className={`leading-relaxed ${hasData ? 'text-sm text-muted-foreground' : 'text-xs text-muted-foreground/70'}`}>
                            {service.description}
                          </p>
                          {/* Fix #7: N'afficher "Compléter les données" que si le service N'EST PAS déjà payé */}
                          {!hasData && !isAlreadyPaid && onRequestContribution && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRequestContribution();
                              }}
                              size="sm"
                              variant="outline"
                              className="w-full h-7 text-xs rounded-lg"
                            >
                              Compléter les données
                            </Button>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          </div>
          )}


          {selectedServiceIds.length > 0 && (
            <div className="rounded-xl border bg-muted/20 p-2.5">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium">Code de remise</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Optionnel</Badge>
              </div>
              <DiscountCodeInput
                invoiceAmount={totalAmount}
                onDiscountApplied={setAppliedDiscount}
                className="bg-background/50 border-border/50"
              />
            </div>
          )}

          {selectedServiceIds.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Devise d'affichage</span>
                <CurrencySelector
                  currencies={currencies}
                  selectedCurrency={selectedCurrency}
                  onCurrencyChange={setSelectedCurrency}
                />
              </div>
              <div className="space-y-1 px-2.5 py-2 bg-muted/20 rounded-xl text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sous-total ({selectedServiceIds.length} service{selectedServiceIds.length > 1 ? 's' : ''})</span>
                  <span className="font-medium">{formatCurrency(convertFromUsd(totalAmount), selectedCurrency)}</span>
                </div>
                {appliedDiscount && (
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Remise ({appliedDiscount.code})</span>
                    <span>-{formatCurrency(convertFromUsd(appliedDiscount.amount), selectedCurrency)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{`TVA (${(TVA_RATE * 100).toFixed(0)}%)`}</span>
                  <span>{formatCurrency(convertFromUsd(discountedAmount * TVA_RATE), selectedCurrency)}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-2.5 bg-primary/5 rounded-xl border border-primary/20">
                <span className="text-sm font-semibold">Total TTC</span>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">
                    {formatCurrency(convertFromUsd(discountedAmount * (1 + TVA_RATE)), selectedCurrency)}
                  </div>
                  {selectedCurrency !== 'USD' && (
                    <div className="text-[10px] text-muted-foreground">
                      ≈ {formatCurrency(discountedAmount * (1 + TVA_RATE), 'USD')}
                    </div>
                  )}
                  {appliedDiscount && (
                    <div className="text-[10px] text-green-600 dark:text-green-400">
                      Économie: {formatCurrency(convertFromUsd(appliedDiscount.amount * (1 + TVA_RATE)), selectedCurrency)} TTC
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedServiceIds.length > 0 && (
            <div className={`
              p-2.5 rounded-xl border transition-all duration-300
              ${highlightTerms 
                ? 'border-destructive bg-destructive/5' 
                : 'border-border bg-muted/20'
              }
            `}>
              <div className="flex items-start gap-2">
                <Checkbox 
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  className="mt-0.5 h-4 w-4"
                />
                <label 
                  htmlFor="terms" 
                  className={`text-xs leading-relaxed cursor-pointer ${highlightTerms ? 'text-destructive' : ''}`}
                >
                  J'accepte les{" "}
                  <a href="/legal" target="_blank" className="text-primary underline">
                    conditions BIC
                  </a>
                  {" "}et confirme la commande.
                </label>
              </div>
            </div>
          )}

          {/* Bouton de paiement */}
          <Button 
            onClick={handleProceedToPayment}
            disabled={selectedServiceIds.length === 0 || loading || isSubmitting}
            className={`
              w-full h-10 text-sm font-semibold rounded-xl
              ${selectedServiceIds.length > 0 && acceptedTerms 
                ? 'bg-primary hover:bg-primary/90 shadow-sm' 
                : selectedServiceIds.length > 0 
                ? 'bg-muted-foreground/80'
                : 'opacity-50 cursor-not-allowed bg-muted'
              }
            `}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent" />
                <span>Traitement...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
              {!isPaymentRequired() ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                <span>
                  {selectedServiceIds.length === 0 
                    ? 'Sélectionner des services' 
                    : !acceptedTerms 
                    ? 'Accepter les conditions'
                    : !isPaymentRequired()
                    ? 'Accéder aux services'
                    : 'Payer'
                  }
                </span>
                {selectedServiceIds.length > 0 && acceptedTerms && (
                  <Lock className="h-3 w-3 ml-auto opacity-70" />
                )}
              </div>
            )}
          </Button>
          
          {selectedServiceIds.length === 0 && (
            <p className="text-center text-xs text-muted-foreground">
              Sélectionnez les services souhaités
            </p>
          )}
          
          {selectedServiceIds.length > 0 && !acceptedTerms && (
            <p className="text-center text-xs text-amber-600 dark:text-amber-400">
              Validation des conditions requise
            </p>
          )}
          {!isPaymentRequired() && (
            <p className="text-[10px] text-muted-foreground/60 text-right mt-1">
              Accès gratuit
            </p>
          )}
        </CardContent>
      </Card>

      {/* Fix #10: Passer availableMethods au dialog au lieu de le ré-instancier */}
      {showPaymentDialog && currentInvoice && (
        <CadastralPaymentDialog
          invoice={currentInvoice}
          onClose={() => setShowPaymentDialog(false)}
          onPaymentSuccess={handlePaymentSuccess}
          availableMethods={availableMethods}
          paymentStep={paymentStep}
          processMobileMoneyPayment={processMobileMoneyPayment}
          processStripePayment={processStripePayment}
          resetPaymentState={resetPaymentState}
          selectedCurrency={selectedCurrency}
          exchangeRate={exchangeRate}
        />
      )}
    </TooltipProvider>
  );
};

export default CadastralBillingPanel;

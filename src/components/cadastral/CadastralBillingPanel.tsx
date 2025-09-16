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
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { useCadastralBilling, CADASTRAL_SERVICES } from '@/hooks/useCadastralBilling';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import { useToast } from '@/hooks/use-toast';
import CadastralPaymentDialog from './CadastralPaymentDialog';
import DiscountCodeInput from './DiscountCodeInput';

interface CadastralBillingPanelProps {
  searchResult: CadastralSearchResult;
  onPaymentSuccess: (selectedServices: string[]) => void;
  preselectServiceId?: string;
  onClose?: () => void;
}

const CadastralBillingPanel: React.FC<CadastralBillingPanelProps> = ({ 
  searchResult, 
  onPaymentSuccess,
  preselectServiceId,
  onClose
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
  const { toast } = useToast();
  const {
    loading,
    selectedServices,
    currentInvoice,
    toggleService,
    getTotalAmount,
    createInvoice,
    setCurrentInvoice
  } = useCadastralBilling();

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
    
    const invoice = await createInvoice(searchResult, appliedDiscount);
    if (invoice) {
      // Pour les tests : accès direct sans paiement
      toast({
        title: "Accès accordé !",
        description: "Vous pouvez maintenant consulter toutes les données cadastrales sélectionnées",
      });
      onPaymentSuccess(selectedServices);
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
    <>
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
          <div className={`
            p-3 md:p-4 rounded-xl border transition-all duration-700 ease-in-out
            ${(() => {
              const availableServices = CADASTRAL_SERVICES.length;
              if (availableServices === 4) {
                return 'bg-gradient-to-br from-emerald-50 via-green-50/80 to-emerald-100/60 border-emerald-300/70 shadow-lg shadow-emerald-200/30 dark:from-emerald-950/40 dark:via-green-950/30 dark:to-emerald-900/20 dark:border-emerald-700/50 dark:shadow-emerald-900/20 animate-pulse';
              } else if (availableServices === 3) {
                return 'bg-gradient-to-br from-blue-50 via-cyan-50/80 to-blue-100/60 border-blue-300/70 shadow-lg shadow-blue-200/30 dark:from-blue-950/40 dark:via-cyan-950/30 dark:to-blue-900/20 dark:border-blue-700/50 dark:shadow-blue-900/20';
              } else if (availableServices === 2) {
                return 'bg-gradient-to-br from-amber-50 via-yellow-50/80 to-amber-100/60 border-amber-300/70 shadow-lg shadow-amber-200/30 dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-amber-900/20 dark:border-amber-700/50 dark:shadow-amber-900/20';
              } else {
                return 'bg-gradient-to-br from-slate-50 via-gray-50/80 to-slate-100/60 border-slate-300/70 shadow-lg shadow-slate-200/30 dark:from-slate-950/40 dark:via-gray-950/30 dark:to-slate-900/20 dark:border-slate-700/50 dark:shadow-slate-900/20';
              }
            })()}
          `}>
            <div className="space-y-1.5 md:space-y-2">
              <p className="text-xs md:text-sm leading-relaxed text-foreground/80">
                Informations cadastrales détaillées disponibles pour cette parcelle.
              </p>
              <p className="text-xs md:text-sm leading-relaxed text-foreground/80">
                Sélectionnez les services souhaités dans le catalogue ci-dessous.
              </p>
              <p className="text-xs md:text-sm leading-relaxed text-foreground/80">
                Données certifiées et vérifiées par nos experts.
              </p>
            </div>
            
            {/* Indicateur de complétude */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
              <span className="text-xs text-foreground/60">
                Données disponibles
              </span>
              <div className="flex items-center gap-2">
                <div className={`
                  h-1.5 w-8 rounded-full transition-all duration-500
                  ${CADASTRAL_SERVICES.length === 4 
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                    : CADASTRAL_SERVICES.length === 3
                    ? 'bg-gradient-to-r from-blue-400 to-cyan-500'
                    : CADASTRAL_SERVICES.length === 2
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
                    : 'bg-gradient-to-r from-slate-400 to-gray-500'
                  }
                `} />
                <span className={`
                  text-xs font-medium
                  ${CADASTRAL_SERVICES.length === 4 
                    ? 'text-green-600 dark:text-green-400' 
                    : CADASTRAL_SERVICES.length === 3
                    ? 'text-blue-600 dark:text-blue-400'
                    : CADASTRAL_SERVICES.length === 2
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-600 dark:text-slate-400'
                  }
                `}>
                  Complet
                </span>
              </div>
            </div>
          </div>

          {/* Catalogue de services modernisé */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base md:text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Catalogue de Services
              </h3>
              <Badge variant="outline" className="text-xs">
                {CADASTRAL_SERVICES.length} services
              </Badge>
            </div>
            
            {/* Services simplifiés avec détails masquables */}
            <div className="space-y-3">
              {CADASTRAL_SERVICES.map((service) => {
                const IconComponent = getServiceIcon(service.id);
                const isSelected = selectedServices.includes(service.id);
                const isExpanded = expandedServices.has(service.id);
                
                return (
                  <div 
                    key={service.id}
                    className={`
                      rounded-lg border transition-all duration-200
                      ${isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border bg-background hover:border-primary/30'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 p-4">
                      {/* Icône du service */}
                      <div className={`
                        p-2 rounded-lg shrink-0 transition-colors
                        ${isSelected 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                        }
                      `}>
                        <IconComponent className="h-4 w-4" />
                      </div>

                      {/* Détails du service alignés à gauche */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">
                            {service.name}
                          </h4>
                          <Badge variant="secondary" className="text-xs">
                            ${service.price}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {service.description}
                        </p>
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

                      {/* Checkbox */}
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => handleServiceToggle(service.id)}
                        className="h-4 w-4"
                      />
                    </div>

                    {/* Détails déroulants */}
                    <Collapsible open={isExpanded}>
                      <CollapsibleContent className="px-4 pb-4">
                        <div className="space-y-2">
                          <p className="text-xs md:text-sm text-foreground/80 leading-relaxed">
                            {service.description}
                          </p>
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
            <div className="p-4 bg-gradient-to-br from-secondary/30 to-muted/20 rounded-xl border">
              <DiscountCodeInput
                invoiceAmount={totalAmount}
                onDiscountApplied={setAppliedDiscount}
                className="bg-transparent"
              />
            </div>
          )}

          {/* Total simple */}
          {selectedServices.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
              <span className="font-semibold">Total à payer</span>
              <div className="text-right">
                <div className="text-xl font-bold text-primary">
                  ${discountedAmount.toFixed(2)} USD
                </div>
                {appliedDiscount && (
                  <div className="text-xs text-green-600 dark:text-green-400">
                    Économie: ${appliedDiscount.amount.toFixed(2)}
                  </div>
                )}
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

          {/* Bouton de paiement modernisé */}
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
                  <CreditCard className="h-5 w-5" />
                  <span>
                    {selectedServices.length === 0 
                      ? 'Sélectionner des services' 
                      : !acceptedTerms 
                      ? 'Accepter les conditions'
                      : `Payer ${discountedAmount.toFixed(2)} USD`
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
                  <p className="text-sm">Prêt pour le paiement sécurisé</p>
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
    </>
  );
};

export default CadastralBillingPanel;
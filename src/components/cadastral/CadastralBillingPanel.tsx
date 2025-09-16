import React, { useState } from 'react';
import { 
  CreditCard, 
  CheckCircle, 
  FileText, 
  DollarSign,
  Lock,
  Unlock,
  Receipt,
  X,
  MapPin,
  History,
  Shield,
  Building2,
  Clock,
  ChevronRight,
  Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

  // Priorité des services selon le contexte cadastral
  const getServicePriority = (serviceId: string) => {
    const priorities = {
      'information': 'essential',
      'legal_verification': 'recommended', 
      'history': 'useful',
      'location_history': 'optional'
    };
    return priorities[serviceId as keyof typeof priorities] || 'optional';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'essential': 'bg-primary/10 border-primary/20 text-primary',
      'recommended': 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/50 dark:border-orange-800 dark:text-orange-400',
      'useful': 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-400',
      'optional': 'bg-muted/50 border-border text-muted-foreground'
    };
    return colors[priority as keyof typeof colors] || colors.optional;
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      'essential': 'Essentiel',
      'recommended': 'Recommandé', 
      'useful': 'Utile',
      'optional': 'Optionnel'
    };
    return labels[priority as keyof typeof labels] || 'Optionnel';
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
          {/* Alert moderne avec meilleure visibilité */}
          <Alert className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 dark:from-amber-950/20 dark:to-orange-950/20 dark:border-amber-800 p-3 md:p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <AlertDescription className="text-sm md:text-base text-amber-800 dark:text-amber-200 font-medium">
                  Accès Premium Requis
                </AlertDescription>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Déverrouillez les données détaillées de cette parcelle
                </p>
              </div>
            </div>
          </Alert>

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
            
            {/* Services en cartes modernes */}
            <div className="grid grid-cols-1 gap-3 md:gap-4">
              {CADASTRAL_SERVICES
                .sort((a, b) => {
                  // Trier par priorité : essential > recommended > useful > optional
                  const priorities = { essential: 0, recommended: 1, useful: 2, optional: 3 };
                  return priorities[getServicePriority(a.id) as keyof typeof priorities] - 
                         priorities[getServicePriority(b.id) as keyof typeof priorities];
                })
                .map((service) => {
                  const IconComponent = getServiceIcon(service.id);
                  const priority = getServicePriority(service.id);
                  const isSelected = selectedServices.includes(service.id);
                  
                  return (
                    <div 
                      key={service.id}
                      className={`
                        group relative p-4 rounded-xl border-2 cursor-pointer
                        transition-all duration-300 ease-out hover:shadow-lg
                        ${isSelected 
                          ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-card' 
                          : 'border-border bg-gradient-to-br from-background to-secondary/20 hover:border-primary/30 hover:from-primary/2 hover:to-primary/5'
                        }
                      `}
                      onClick={() => handleServiceToggle(service.id)}
                    >
                      {/* Badge de priorité */}
                      <div className="flex items-center justify-between mb-3">
                        <Badge 
                          variant="outline" 
                          className={`text-xs px-2 py-1 ${getPriorityColor(priority)}`}
                        >
                          {getPriorityLabel(priority)}
                        </Badge>
                        {priority === 'essential' && (
                          <Star className="h-3 w-3 text-primary fill-current" />
                        )}
                      </div>

                      <div className="flex items-start gap-4">
                        {/* Icône du service */}
                        <div className={`
                          p-3 rounded-lg shrink-0 transition-all duration-300
                          ${isSelected 
                            ? 'bg-primary text-primary-foreground shadow-sm' 
                            : 'bg-muted group-hover:bg-primary/10 group-hover:text-primary'
                          }
                        `}>
                          <IconComponent className="h-5 w-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-sm md:text-base text-foreground truncate">
                              {service.name}
                            </h4>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge 
                                variant={isSelected ? "default" : "secondary"} 
                                className="text-sm px-2 py-1 font-medium"
                              >
                                ${service.price}
                              </Badge>
                              <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isSelected ? 'rotate-90 text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                            {service.description}
                          </p>
                          
                          {/* Utilité contextuelle */}
                          <div className={`
                            p-3 rounded-lg border-l-4 transition-all duration-200
                            ${isSelected 
                              ? 'bg-primary/5 border-primary' 
                              : 'bg-muted/30 border-muted-foreground/20 group-hover:bg-primary/5 group-hover:border-primary/50'
                            }
                          `}>
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground">Cas d'usage</span>
                            </div>
                            <p className="text-xs text-foreground/80 leading-tight">
                              {service.id === 'information' 
                                ? 'Idéal pour vérification rapide de propriété et première analyse'
                                : service.id === 'location_history'
                                ? 'Essentiel pour projets de construction et développement urbain'
                                : service.id === 'history'
                                ? 'Crucial pour sécuriser les transactions immobilières'
                                : 'Indispensable avant achat, prêt bancaire ou investissement'
                              }
                            </p>
                          </div>
                        </div>

                        {/* Checkbox modernisé */}
                        <div className="shrink-0 mt-1">
                          <Checkbox 
                            checked={isSelected}
                            onChange={() => handleServiceToggle(service.id)}
                            className={`
                              h-5 w-5 transition-all duration-200
                              ${isSelected ? 'ring-2 ring-primary/20 ring-offset-1' : ''}
                            `}
                          />
                        </div>
                      </div>
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

          {/* Récapitulatif modernisé */}
          {selectedServices.length > 0 && (
            <div className="space-y-4 p-4 md:p-6 bg-gradient-to-br from-secondary/20 to-background rounded-xl border-2 border-primary/10">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Receipt className="h-4 w-4 text-primary" />
                </div>
                <h4 className="font-semibold text-base">Récapitulatif</h4>
              </div>

              <div className="space-y-3">
                {/* Services sélectionnés */}
                <div className="space-y-2">
                  {CADASTRAL_SERVICES
                    .filter(service => selectedServices.includes(service.id))
                    .map(service => {
                      const IconComponent = getServiceIcon(service.id);
                      return (
                        <div key={service.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-primary/10 rounded">
                              <IconComponent className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-sm font-medium truncate">{service.name}</span>
                          </div>
                          <span className="text-sm font-semibold">${service.price}</span>
                        </div>
                      );
                    })}
                </div>

                <Separator className="my-4" />

                {/* Calculs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>Sous-total ({selectedServices.length} service{selectedServices.length > 1 ? 's' : ''})</span>
                    </div>
                    <span className="font-medium">${totalAmount.toFixed(2)} USD</span>
                  </div>
                  
                  {appliedDiscount && (
                    <div className="flex items-center justify-between text-sm text-green-600 dark:text-green-400">
                      <span>Remise ({appliedDiscount.code})</span>
                      <span className="font-medium">-${appliedDiscount.amount.toFixed(2)} USD</span>
                    </div>
                  )}
                </div>
                
                <Separator className="my-4" />
                
                {/* Total final */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border-2 border-primary/20">
                  <div>
                    <span className="text-lg font-bold text-foreground">Total à payer</span>
                    {appliedDiscount && (
                      <div className="text-xs text-muted-foreground">
                        Économie de ${appliedDiscount.amount.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      ${discountedAmount.toFixed(2)}
                    </div>
                    <div className="text-xs text-primary/70">USD</div>
                  </div>
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

          {/* Informations de confiance modernisées */}
          <div className="space-y-3 pt-6 border-t border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-primary" />
              <h5 className="font-medium text-sm">Garanties & Sécurité</h5>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2 p-2 bg-muted/20 rounded-lg">
                <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded">
                  <Shield className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Paiement sécurisé SSL</p>
                  <p className="leading-tight">Chiffrement bancaire via mobile money certifié</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2 p-2 bg-muted/20 rounded-lg">
                <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                  <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Accès immédiat</p>
                  <p className="leading-tight">Données disponibles dès validation du paiement</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2 p-2 bg-muted/20 rounded-lg">
                <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded">
                  <Receipt className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Facture officielle PDF</p>
                  <p className="leading-tight">Document avec logo BIC et mentions légales</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2 p-2 bg-muted/20 rounded-lg">
                <div className="p-1 bg-amber-100 dark:bg-amber-900/30 rounded">
                  <Building2 className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Support client BIC</p>
                  <p className="leading-tight">Assistance technique disponible 7j/7</p>
                </div>
              </div>
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
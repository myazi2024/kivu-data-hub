import React, { useState } from 'react';
import { 
  CreditCard, 
  CheckCircle, 
  FileText, 
  DollarSign,
  Lock,
  Unlock,
  Receipt,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCadastralBilling } from '@/hooks/useCadastralBilling';
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
    availableServices,
    toggleService,
    getTotalAmount,
    createInvoice,
    setCurrentInvoice,
    fetchServices
  } = useCadastralBilling();

  // Charger les services au montage
  React.useEffect(() => {
    fetchServices();
  }, []);

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
          {/* Alert compact */}
          <Alert className="border-amber-200 bg-amber-50 p-2 md:p-3">
            <Lock className="h-3 w-3 text-amber-600 mt-0.5 shrink-0" />
            <AlertDescription className="text-xs md:text-sm text-amber-800 leading-tight ml-1">
              Paiement requis pour consulter le rapport détaillé.
            </AlertDescription>
          </Alert>

          {/* Services en grille compacte */}
          <div className="space-y-2">
            <h3 className="font-medium text-xs md:text-sm flex items-center gap-1.5">
              <CheckCircle className="h-3 w-3" />
              Services disponibles
            </h3>
            
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
              {availableServices.map((service) => (
                <div 
                  key={service.id}
                  className={`p-2 rounded border cursor-pointer transition-all hover:border-primary/40 ${
                    selectedServices.includes(service.id) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border bg-background'
                  }`}
                  onClick={() => handleServiceToggle(service.id)}
                >
                  <div className="flex gap-2">
                    <Checkbox 
                      checked={selectedServices.includes(service.id)}
                      onChange={() => handleServiceToggle(service.id)}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <h4 className="font-medium text-xs leading-tight">{service.name}</h4>
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                          ${service.price}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-tight mb-1">
                        {service.description}
                      </p>
                      <div className="p-1.5 bg-muted/20 rounded border-l-2 border-primary/20">
                        <p className="text-xs text-foreground/80 line-clamp-2">
                          <span className="font-medium">Utilité:</span> {
                            service.id === 'information' 
                              ? 'Vérification rapide de propriété'
                              : service.id === 'location_history'
                              ? 'Pour projets de construction'
                              : service.id === 'history'
                              ? 'Sécuriser les transactions'
                              : 'Avant achat ou prêt bancaire'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Code de remise */}
          {selectedServices.length > 0 && (
            <DiscountCodeInput
              invoiceAmount={totalAmount}
              onDiscountApplied={setAppliedDiscount}
              className="bg-muted/10 rounded p-2 md:p-3"
            />
          )}

          {/* Total compact */}
          {selectedServices.length > 0 && (
            <div className="bg-muted/30 rounded p-2 md:p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-3 w-3 text-primary" />
                    <span className="font-medium text-xs md:text-sm">Sous-total</span>
                  </div>
                  <div className="text-xs md:text-sm font-medium">
                    ${totalAmount} USD
                  </div>
                </div>
                
                {appliedDiscount && (
                  <div className="flex items-center justify-between text-green-600">
                    <span className="text-xs md:text-sm">Remise ({appliedDiscount.code})</span>
                    <span className="text-xs md:text-sm font-medium">-${appliedDiscount.amount.toFixed(2)}</span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs md:text-sm">Total à payer</span>
                  <div className="text-right">
                    <div className="text-sm md:text-base font-bold text-primary">
                      ${discountedAmount.toFixed(2)} USD
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Case à cocher conditions d'utilisation */}
          {selectedServices.length > 0 && (
            <div className={`space-y-2 p-2 bg-muted/20 rounded-lg border transition-all duration-500 ${
              highlightTerms ? 'ring-2 ring-destructive animate-pulse bg-destructive/5 border-destructive/30' : ''
            }`}>
              <div className="flex items-start gap-2">
                <Checkbox 
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  className={`mt-0.5 transition-all duration-300 ${
                    highlightTerms ? 'ring-2 ring-destructive ring-offset-2' : ''
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <label htmlFor="terms" className="text-xs leading-tight cursor-pointer">
                    J'accepte les{" "}
                    <a 
                      href="/legal" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      conditions d'utilisation BIC
                    </a>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Bouton de paiement */}
          <div className="pt-2">
            <Button 
              onClick={handleProceedToPayment}
              disabled={selectedServices.length === 0 || loading}
              className={`
                w-full h-10 sm:h-12 text-sm sm:text-base font-medium touch-target 
                transition-all duration-300 ease-out
                ${selectedServices.length > 0 && acceptedTerms 
                  ? 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-elegant hover:shadow-hover hover:scale-[1.02] active:scale-[0.98]' 
                  : selectedServices.length > 0 
                  ? 'bg-gradient-to-r from-muted-foreground to-muted-foreground/90 hover:from-muted-foreground/90 hover:to-muted-foreground cursor-pointer'
                  : 'opacity-60 cursor-not-allowed'
                }
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
              `}
              size="lg"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-background border-t-transparent" />
                  <span className="hidden sm:inline">Création de la facture...</span>
                  <span className="sm:hidden">Traitement...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Procéder au paiement (${discountedAmount.toFixed(2)} USD)</span>
                  <span className="sm:hidden">Payer ${discountedAmount.toFixed(2)}</span>
                </div>
              )}
            </Button>
            
            {selectedServices.length === 0 && (
              <p className="text-xs text-muted-foreground text-center mt-2 leading-relaxed">
                Sélectionnez au moins un service pour continuer
              </p>
            )}
            
            {selectedServices.length > 0 && !acceptedTerms && (
              <p className="text-xs text-muted-foreground text-center mt-2 leading-relaxed">
                Veuillez accepter les conditions d'utilisation pour continuer
              </p>
            )}
          </div>

          {/* Informations légales */}
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t leading-relaxed">
            <p className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Paiement sécurisé via mobile money ou carte bancaire</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Accès aux données immédiat après paiement validé</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Facture PDF disponible avec logo BIC et mentions légales</span>
            </p>
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
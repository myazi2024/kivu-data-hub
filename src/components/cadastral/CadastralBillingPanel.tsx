import React, { useState } from 'react';
import { 
  CreditCard, 
  CheckCircle, 
  FileText, 
  DollarSign,
  Lock,
  Unlock,
  Receipt
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

interface CadastralBillingPanelProps {
  searchResult: CadastralSearchResult;
  onPaymentSuccess: (selectedServices: string[]) => void;
  preselectServiceId?: string;
}

const CadastralBillingPanel: React.FC<CadastralBillingPanelProps> = ({ 
  searchResult, 
  onPaymentSuccess,
  preselectServiceId
}) => {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
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
    const invoice = await createInvoice(searchResult);
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

  return (
    <>
      <Card className="w-full border-primary/20 bg-gradient-to-br from-background to-secondary/5">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                Consultez les détails cadastraux complets
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Référence SU/SR: <span className="font-mono font-medium">{searchResult.parcel.parcel_number}</span>
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Alert principal */}
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/10">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              Le rapport que vous souhaitez consulter est accessible moyennant une contribution. Nous vous invitons à sélectionner les informations correspondant à vos besoins, puis à finaliser le règlement afin d'en obtenir l'accès.
            </AlertDescription>
          </Alert>

          {/* Sélection des services */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Information(s) trouvée(s) pour {searchResult.parcel.parcel_number}
            </h3>
            
            <div className="grid gap-3">
              {CADASTRAL_SERVICES.map((service) => (
                <div 
                  key={service.id}
                  className={`p-3 sm:p-4 rounded-lg border transition-all cursor-pointer hover:border-primary/40 focus-visible-ring hover-interactive ${
                    selectedServices.includes(service.id) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border bg-background'
                  }`}
                  onClick={() => handleServiceToggle(service.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      checked={selectedServices.includes(service.id)}
                      onChange={() => handleServiceToggle(service.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                        <h4 className="font-medium text-sm sm:text-base">{service.name}</h4>
                        <Badge variant="secondary" className="text-xs font-medium w-fit">
                          ${service.price} USD
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2 leading-relaxed">
                        {service.description}
                      </p>
                      <div className="mt-2 p-2 sm:p-3 bg-muted/20 rounded border-l-2 border-primary/20 text-left">
                        <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">
                          <span className="font-medium text-primary">Utilité:</span> {
                            service.id === 'information' 
                              ? 'Parfait pour une vérification rapide de propriété ou pour des démarches administratives de base.'
                              : service.id === 'location_history'
                              ? 'Recommandé pour les architectes, géomètres et développeurs pour planifier des projets de construction.'
                              : service.id === 'history'
                              ? 'Essentiel pour les notaires, avocats et acheteurs soucieux de sécuriser leurs transactions immobilières.'
                              : 'Obligatoire avant tout achat immobilier, prêt bancaire ou investissement foncier pour éviter les mauvaises surprises.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Résumé du total */}
          {selectedServices.length > 0 && (
            <div className="space-y-3">
              <Separator />
              <div className="bg-muted/30 rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-semibold text-sm sm:text-base">Total à payer</span>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-xl sm:text-2xl font-bold text-primary">
                      ${totalAmount} USD
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} sélectionné{selectedServices.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bouton de paiement */}
          <div className="pt-2">
            <Button 
              onClick={handleProceedToPayment}
              disabled={selectedServices.length === 0 || loading}
              className="w-full h-10 sm:h-12 text-sm sm:text-base font-medium touch-target focus-visible-ring"
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
                  <span className="hidden sm:inline">Procéder au paiement (${totalAmount} USD)</span>
                  <span className="sm:hidden">Payer ${totalAmount}</span>
                </div>
              )}
            </Button>
            
            {selectedServices.length === 0 && (
              <p className="text-xs text-muted-foreground text-center mt-2 leading-relaxed">
                Sélectionnez au moins un service pour continuer
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
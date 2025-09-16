import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle,
  Download,
  Clock,
  Loader2,
  CreditCard
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCadastralBilling, CADASTRAL_SERVICES, CadastralInvoice } from '@/hooks/useCadastralBilling';
import MobileMoneyPayment from '@/components/payment/MobileMoneyPayment';
import { useToast } from '@/hooks/use-toast';

interface CadastralPaymentDialogProps {
  invoice: CadastralInvoice;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

const CadastralPaymentDialog: React.FC<CadastralPaymentDialogProps> = ({
  invoice,
  onClose,
  onPaymentSuccess
}) => {
  const [paymentStep, setPaymentStep] = useState<'selection' | 'processing' | 'success'>('selection');
  const [isAnimating, setIsAnimating] = useState(false);
  const { updateInvoiceStatus } = useCadastralBilling();
  const { toast } = useToast();

  // Animation sur montage du composant
  useEffect(() => {
    setIsAnimating(true);
  }, []);

  const getSelectedServices = () => {
    return CADASTRAL_SERVICES.filter(service => {
      const selectedArray = Array.isArray(invoice.selected_services) 
        ? invoice.selected_services 
        : (typeof invoice.selected_services === 'string' ? JSON.parse(invoice.selected_services) : []);
      return selectedArray.includes(service.id);
    });
  };

  const handleMobileMoneySuccess = async () => {
    await handlePaymentSuccess();
  };

  const handlePaymentSuccess = async () => {
    setPaymentStep('success');
    await updateInvoiceStatus(invoice.id, 'paid');
    
    setTimeout(() => {
      onPaymentSuccess();
      onClose();
    }, 2000);
  };

  const handleClose = () => {
    toast({ title: 'Facture fermée', duration: 1500 });
    onClose();
  };

  const generatePDFInvoice = () => {
    // Génère un reçu PDF A4 pour la facture courante
    import('@/lib/pdf').then(({ generateInvoicePDF }) => {
      generateInvoicePDF(invoice, CADASTRAL_SERVICES);
    });
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[95vh] p-0 gap-0 bg-background/95 backdrop-blur-sm border border-border/20 shadow-elegant rounded-2xl overflow-hidden">
        
        {/* Header épuré avec animation */}
        <DialogHeader className={`relative px-6 py-4 border-b border-border/10 bg-gradient-subtle ${isAnimating ? 'animate-fade-in' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Paiement sécurisé
              </DialogTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClose}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive rounded-full transition-all duration-200 hover:scale-110"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Contenu principal avec animations */}
        <div className="relative">
          {paymentStep === 'success' ? (
            <div className="px-6 py-8 text-center space-y-6 animate-scale-in">
              {/* Icône de succès animée */}
              <div className="mx-auto w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center animate-pulse-success">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              
              {/* Texte de confirmation */}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-green-700 dark:text-green-400">
                  Paiement confirmé !
                </h3>
                <p className="text-sm text-muted-foreground">
                  Votre facture a été payée avec succès
                </p>
                <div className="text-xs text-muted-foreground bg-green-50 dark:bg-green-900/10 rounded-lg p-3">
                  Facture #{invoice.invoice_number}
                </div>
              </div>

              {/* Bouton de téléchargement */}
              <Button 
                onClick={generatePDFInvoice} 
                variant="outline" 
                size="default"
                className="w-full bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/20 h-12 transition-all duration-200 hover:scale-[1.02]"
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger le reçu
              </Button>
            </div>
          ) : paymentStep === 'processing' ? (
            <div className="px-6 py-12 text-center space-y-6 animate-fade-in">
              {/* Indicateur de chargement */}
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              
              {/* Texte de traitement */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  Traitement en cours...
                </h3>
                <p className="text-sm text-muted-foreground">
                  Veuillez patienter pendant la validation de votre paiement
                </p>
              </div>

              {/* Barre de progression visuelle */}
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          ) : (
            <div className={`px-6 py-6 space-y-6 ${isAnimating ? 'animate-slide-up' : ''}`}>
              
              {/* Bloc montant - mise en avant */}
              <div className="relative">
                <div className="bg-gradient-card border border-border/20 rounded-2xl p-6 text-center shadow-card animate-scale-in">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground font-medium">Montant à payer</p>
                    <div className="text-3xl font-bold text-primary">
                      ${invoice.total_amount_usd}
                      <span className="text-lg text-muted-foreground ml-2">USD</span>
                    </div>
                    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
                      <CreditCard className="h-3 w-3" />
                      Paiement Mobile Money
                    </div>
                  </div>
                </div>
              </div>

              {/* Informations facture */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                <h4 className="text-sm font-medium text-foreground">Détails de la facture</h4>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Numéro de facture</span>
                    <span className="font-mono text-foreground">#{invoice.invoice_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Services sélectionnés</span>
                    <span className="text-foreground">{getSelectedServices().length}</span>
                  </div>
                </div>
              </div>

              {/* Composant de paiement Mobile Money */}
              <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <MobileMoneyPayment
                  item={{
                    id: invoice.id,
                    title: `Facture ${invoice.invoice_number}`,
                    price: invoice.total_amount_usd
                  }}
                  currency="USD"
                  onPaymentSuccess={handleMobileMoneySuccess}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer avec informations de sécurité */}
        {paymentStep === 'selection' && (
          <div className="px-6 py-4 bg-muted/20 border-t border-border/10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Paiement sécurisé SSL</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CadastralPaymentDialog;
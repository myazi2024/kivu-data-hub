import React, { useState } from 'react';
import { 
  CreditCard, 
  Smartphone, 
  X, 
  CheckCircle,
  Receipt,
  Download,
  Clock
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePayment } from '@/hooks/usePayment';
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
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'stripe'>('mobile_money');
  const [paymentStep, setPaymentStep] = useState<'selection' | 'processing' | 'success'>('selection');
  const { createStripePayment } = usePayment();
  const { updateInvoiceStatus } = useCadastralBilling();
  const { toast } = useToast();

  const getSelectedServices = () => {
    return CADASTRAL_SERVICES.filter(service => {
      const selectedArray = Array.isArray(invoice.selected_services) 
        ? invoice.selected_services 
        : (typeof invoice.selected_services === 'string' ? JSON.parse(invoice.selected_services) : []);
      return selectedArray.includes(service.id);
    });
  };

  const handleStripePayment = async () => {
    setPaymentStep('processing');
    
    // Créer les items pour Stripe
    const items = getSelectedServices().map(service => ({
      id: service.id,
      title: service.name,
      price: service.price,
      cover_image_url: undefined
    }));

    const result = await createStripePayment(items);
    if (result?.url) {
      // Ouvrir Stripe dans un nouvel onglet
      window.open(result.url, '_blank');
      
      // Simuler le succès pour la démo (dans un vrai système, utilisez des webhooks)
      setTimeout(() => {
        handlePaymentSuccess();
      }, 5000);
    } else {
      setPaymentStep('selection');
    }
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
      <DialogContent className="w-[95vw] max-w-sm mx-auto max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background border border-border/20 shadow-xl rounded-2xl">
        {/* Header mobile-optimized */}
        <DialogHeader className="px-4 py-4 border-b border-border/30 bg-gradient-to-r from-background to-secondary/5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <DialogTitle className="text-lg font-semibold text-foreground">
                Paiement
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Facture {invoice.invoice_number}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClose}
              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive rounded-full shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-4 py-4">
          {paymentStep === 'success' ? (
            <div className="space-y-4 py-3 text-center">
              <div className="mx-auto w-12 h-12 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
                  Paiement validé
                </h3>
                <p className="text-sm text-muted-foreground">
                  Votre facture a été payée avec succès
                </p>
              </div>
              <Button 
                onClick={generatePDFInvoice} 
                variant="outline" 
                size="default"
                className="w-full bg-background/50 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20 h-11"
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger le reçu PDF
              </Button>
            </div>
          ) : paymentStep === 'processing' ? (
            <div className="space-y-4 py-6 text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">
                  Traitement en cours...
                </h3>
                <p className="text-sm text-muted-foreground">
                  Nous traitons votre paiement
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Total simplifié */}
              <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 text-center">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Montant à payer</p>
                  <p className="text-2xl font-bold text-primary">${invoice.total_amount_usd} USD</p>
                </div>
              </div>

              {/* Modes de paiement simplifiés */}
              <div className="space-y-3">                
                <div className="space-y-2">
                  {/* Mobile Money */}
                  <Button
                    variant={paymentMethod === 'mobile_money' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('mobile_money')}
                    className={`h-auto p-3 justify-start text-left w-full transition-all duration-200 ${
                      paymentMethod === 'mobile_money' 
                        ? 'bg-primary text-primary-foreground shadow-md' 
                        : 'hover:bg-secondary/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className={`p-1.5 rounded-lg ${
                        paymentMethod === 'mobile_money' 
                          ? 'bg-primary-foreground/20' 
                          : 'bg-primary/10'
                      }`}>
                        <Smartphone className={`h-4 w-4 ${
                          paymentMethod === 'mobile_money' 
                            ? 'text-primary-foreground' 
                            : 'text-primary'
                        }`} />
                      </div>
                      <div className="font-medium text-sm">Mobile Money</div>
                    </div>
                  </Button>

                  {/* Stripe */}
                  <Button
                    variant={paymentMethod === 'stripe' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('stripe')}
                    className={`h-auto p-3 justify-start text-left w-full transition-all duration-200 ${
                      paymentMethod === 'stripe' 
                        ? 'bg-primary text-primary-foreground shadow-md' 
                        : 'hover:bg-secondary/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className={`p-1.5 rounded-lg ${
                        paymentMethod === 'stripe' 
                          ? 'bg-primary-foreground/20' 
                          : 'bg-primary/10'
                      }`}>
                        <CreditCard className={`h-4 w-4 ${
                          paymentMethod === 'stripe' 
                            ? 'text-primary-foreground' 
                            : 'text-primary'
                        }`} />
                      </div>
                      <div className="font-medium text-sm">Carte bancaire</div>
                    </div>
                  </Button>
                </div>

                {/* Contenu du paiement */}
                <div className="mt-4 p-3 bg-background/50 rounded-xl border border-border/20">
                  {paymentMethod === 'mobile_money' ? (
                    <MobileMoneyPayment
                      item={{
                        id: invoice.id,
                        title: `Facture ${invoice.invoice_number}`,
                        price: invoice.total_amount_usd
                      }}
                      currency="USD"
                      onPaymentSuccess={handleMobileMoneySuccess}
                    />
                  ) : (
                    <div className="space-y-3 text-center">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Paiement sécurisé avec Stripe
                        </p>
                      </div>
                      
                      <Button 
                        onClick={handleStripePayment}
                        size="default"
                        className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 h-11"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Payer ${invoice.total_amount_usd} USD
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CadastralPaymentDialog;
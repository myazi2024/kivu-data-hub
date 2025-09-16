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
      <DialogContent className="max-w-md sm:max-w-lg max-h-[95vh] overflow-y-auto p-0 gap-0 bg-background/95 backdrop-blur-md border-0 shadow-2xl">
        {/* Header épuré */}
        <DialogHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border/50 bg-gradient-to-r from-background/80 to-secondary/20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground">
                Paiement
              </DialogTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Facture {invoice.invoice_number}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClose}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-4 sm:px-6 py-4 sm:py-6">
          {paymentStep === 'success' ? (
            <div className="space-y-6 py-4 text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-green-700 dark:text-green-400">
                  Paiement validé
                </h3>
                <p className="text-sm text-muted-foreground">
                  Votre facture a été payée avec succès
                </p>
              </div>
              <Button 
                onClick={generatePDFInvoice} 
                variant="outline" 
                size="lg"
                className="w-full bg-background/50 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger le reçu PDF
              </Button>
            </div>
          ) : paymentStep === 'processing' ? (
            <div className="space-y-6 py-8 text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Clock className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  Traitement en cours...
                </h3>
                <p className="text-sm text-muted-foreground">
                  Nous traitons votre paiement
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Résumé simplifié */}
              <div className="p-4 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-xl border border-border/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Résumé</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{invoice.invoice_number}</Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Parcelle:</span>
                    <span className="font-mono font-medium">{invoice.parcel_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Services:</span>
                    <span>{getSelectedServices().length} sélectionné{getSelectedServices().length > 1 ? 's' : ''}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-border/30">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total:</span>
                    <span className="text-xl font-bold text-primary">${invoice.total_amount_usd} USD</span>
                  </div>
                </div>
              </div>

              {/* Sélection du mode de paiement - Design épuré */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-center">Choisir le mode de paiement</h3>
                
                <div className="grid gap-3">
                  {/* Mobile Money */}
                  <Button
                    variant={paymentMethod === 'mobile_money' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('mobile_money')}
                    className={`h-auto p-4 justify-start text-left transition-all duration-200 ${
                      paymentMethod === 'mobile_money' 
                        ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02]' 
                        : 'hover:bg-secondary/50 hover:scale-[1.01]'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className={`p-2 rounded-lg ${
                        paymentMethod === 'mobile_money' 
                          ? 'bg-primary-foreground/20' 
                          : 'bg-primary/10'
                      }`}>
                        <Smartphone className={`h-5 w-5 ${
                          paymentMethod === 'mobile_money' 
                            ? 'text-primary-foreground' 
                            : 'text-primary'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Mobile Money</div>
                        <div className={`text-xs ${
                          paymentMethod === 'mobile_money' 
                            ? 'text-primary-foreground/80' 
                            : 'text-muted-foreground'
                        }`}>
                          Orange Money, Airtel Money, M-Pesa
                        </div>
                      </div>
                    </div>
                  </Button>

                  {/* Stripe */}
                  <Button
                    variant={paymentMethod === 'stripe' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('stripe')}
                    className={`h-auto p-4 justify-start text-left transition-all duration-200 ${
                      paymentMethod === 'stripe' 
                        ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02]' 
                        : 'hover:bg-secondary/50 hover:scale-[1.01]'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className={`p-2 rounded-lg ${
                        paymentMethod === 'stripe' 
                          ? 'bg-primary-foreground/20' 
                          : 'bg-primary/10'
                      }`}>
                        <CreditCard className={`h-5 w-5 ${
                          paymentMethod === 'stripe' 
                            ? 'text-primary-foreground' 
                            : 'text-primary'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Carte bancaire</div>
                        <div className={`text-xs ${
                          paymentMethod === 'stripe' 
                            ? 'text-primary-foreground/80' 
                            : 'text-muted-foreground'
                        }`}>
                          Visa, Mastercard via Stripe
                        </div>
                      </div>
                    </div>
                  </Button>
                </div>

                {/* Contenu du paiement */}
                <div className="mt-6 p-4 bg-background/50 rounded-xl border border-border/30">
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
                    <div className="space-y-4 text-center">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Paiement sécurisé avec Stripe
                        </p>
                      </div>
                      
                      <Button 
                        onClick={handleStripePayment}
                        size="lg"
                        className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
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
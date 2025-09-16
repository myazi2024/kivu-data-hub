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
      <DialogContent className="w-[90vw] max-w-sm mx-auto max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background border border-border/10 shadow-lg rounded-lg">
        {/* Header minimal */}
        <DialogHeader className="px-4 py-3 border-b border-border/10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xs font-medium text-foreground">
              Paiement
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClose}
              className="h-5 w-5 p-0 hover:bg-destructive/10 hover:text-destructive rounded-md"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-3 py-3">
          {paymentStep === 'success' ? (
            <div className="space-y-3 py-2 text-center">
              <div className="mx-auto w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-base font-medium text-green-700 dark:text-green-400">
                  Paiement validé
                </h3>
                <p className="text-xs text-muted-foreground">
                  Facture payée avec succès
                </p>
              </div>
              <Button 
                onClick={generatePDFInvoice} 
                variant="outline" 
                size="sm"
                className="w-full bg-background/50 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20 h-9 text-xs"
              >
                <Download className="h-3 w-3 mr-1.5" />
                Télécharger le reçu
              </Button>
            </div>
          ) : paymentStep === 'processing' ? (
            <div className="space-y-3 py-4 text-center">
              <div className="mx-auto w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-base font-medium">
                  Traitement...
                </h3>
                <p className="text-xs text-muted-foreground">
                  Paiement en cours
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Total simplifié */}
              <div className="text-center py-2">
                <p className="text-lg font-semibold text-primary">${invoice.total_amount_usd} USD</p>
              </div>

              {/* Sélection méthode - radio compacts */}
              <div className="space-y-1">
                <div 
                  onClick={() => setPaymentMethod('mobile_money')}
                  className="flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50"
                >
                  <div className={`w-3 h-3 rounded-full border border-primary flex items-center justify-center ${
                    paymentMethod === 'mobile_money' ? 'bg-primary' : 'bg-background'
                  }`}>
                    {paymentMethod === 'mobile_money' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                  <Smartphone className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium">Mobile Money</span>
                </div>

                <div 
                  onClick={() => setPaymentMethod('stripe')}
                  className="flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50"
                >
                  <div className={`w-3 h-3 rounded-full border border-primary flex items-center justify-center ${
                    paymentMethod === 'stripe' ? 'bg-primary' : 'bg-background'
                  }`}>
                    {paymentMethod === 'stripe' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                  <CreditCard className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium">Carte bancaire</span>
                </div>
              </div>

              {/* Contenu paiement */}
              <div className="pt-1">
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
                  <div className="text-center">
                    <Button 
                      onClick={handleStripePayment}
                      size="sm"
                      className="w-full bg-primary hover:bg-primary/90 h-8 text-xs"
                    >
                      Payer ${invoice.total_amount_usd} USD
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CadastralPaymentDialog;
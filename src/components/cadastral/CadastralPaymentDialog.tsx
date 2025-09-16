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
  const [paymentStep, setPaymentStep] = useState<'selection' | 'processing' | 'success'>('selection');
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
            <div className="space-y-3">
              {/* Total */}
              <div className="text-center py-2">
                <p className="text-lg font-semibold text-primary">${invoice.total_amount_usd} USD</p>
                <p className="text-xs text-muted-foreground">Paiement Mobile Money</p>
              </div>

              {/* Paiement Mobile Money direct */}
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CadastralPaymentDialog;
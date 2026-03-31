import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle,
  Download,
  Loader2,
  CreditCard,
  Smartphone,
  FlaskConical,
} from 'lucide-react';
import { useTestMode } from '@/hooks/useTestMode';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MobileMoneyPayment from '@/components/payment/MobileMoneyPayment';
import BankCardPayment from '@/components/payment/BankCardPayment';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatters';
import type { CadastralPaymentData } from '@/hooks/useCadastralPayment';
import type { CurrencyCode } from '@/hooks/useCurrencyConfig';

interface CadastralInvoice {
  id: string;
  invoice_number: string;
  total_amount_usd: number;
  selected_services: string[] | string;
  status: string;
  parcel_number?: string;
  created_at?: string;
}

interface CadastralPaymentDialogProps {
  invoice: CadastralInvoice;
  onClose: () => void;
  onPaymentSuccess: (services: string[]) => void;
  availableMethods: {
    hasMobileMoney: boolean;
    hasBankCard: boolean;
  };
  paymentStep: 'form' | 'processing' | 'success';
  processMobileMoneyPayment: (invoiceId: string, data: CadastralPaymentData) => Promise<any>;
  processStripePayment: (invoiceId: string) => Promise<any>;
  processTestPayment?: (invoiceId: string) => Promise<any>;
  resetPaymentState: () => void;
  selectedCurrency?: CurrencyCode;
  exchangeRate?: number;
}

const CadastralPaymentDialog: React.FC<CadastralPaymentDialogProps> = ({
  invoice,
  onClose,
  onPaymentSuccess,
  availableMethods,
  paymentStep,
  processMobileMoneyPayment,
  processStripePayment,
  processTestPayment,
  resetPaymentState,
  selectedCurrency = 'USD',
  exchangeRate = 1,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'mobile_money' | 'bank_card'>('mobile_money');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isProcessingTestPayment, setIsProcessingTestPayment] = useState(false);
  const { toast } = useToast();
  const { isTestModeActive } = useTestMode();

  const displayAmount = invoice.total_amount_usd * exchangeRate;
  const displayFormatted = formatCurrency(displayAmount, selectedCurrency);

  useEffect(() => {
    setIsAnimating(true);
    if (availableMethods.hasBankCard) {
      setSelectedPaymentMethod('bank_card');
    } else if (availableMethods.hasMobileMoney) {
      setSelectedPaymentMethod('mobile_money');
    }
  }, [availableMethods]);

  const getSelectedServices = (): string[] => {
    if (Array.isArray(invoice.selected_services)) return invoice.selected_services;
    if (typeof invoice.selected_services === 'string') {
      try { return JSON.parse(invoice.selected_services); } catch { return []; }
    }
    return [];
  };

  const handleMobileMoneySuccess = async (paymentData?: { provider: string; phoneNumber: string }) => {
    if (!paymentData) {
      toast({ title: "Erreur", description: "Informations de paiement manquantes", variant: "destructive" });
      return;
    }

    const result = await processMobileMoneyPayment(invoice.id, {
      provider: paymentData.provider,
      phoneNumber: paymentData.phoneNumber,
      name: ''
    });

    if (result) {
      onPaymentSuccess(getSelectedServices());
    }
  };

  const handleTestPayment = async () => {
    if (!processTestPayment) return;
    setIsProcessingTestPayment(true);
    const result = await processTestPayment(invoice.id);
    setIsProcessingTestPayment(false);
    if (result) {
      onPaymentSuccess(getSelectedServices());
    }
  };

  const handleStripePayment = async () => {
    setIsProcessingPayment(true);
    const result = await processStripePayment(invoice.id);
    
    if (result?.url) {
      window.location.href = result.url;
    } else {
      resetPaymentState();
      setIsProcessingPayment(false);
    }
  };

  const handleClose = () => {
    resetPaymentState();
    onClose();
  };

  const handleDownloadReceipt = () => {
    import('@/lib/pdf').then(({ generateInvoicePDF }) => {
      const invoiceData = {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_amount_usd: invoice.total_amount_usd,
        selected_services: getSelectedServices(),
        status: 'paid',
        created_at: invoice.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        parcel_number: invoice.parcel_number || '',
        client_email: '',
        client_name: null,
        search_date: invoice.created_at || new Date().toISOString(),
      };
      generateInvoicePDF(invoiceData, [], 'a4');
    }).catch(() => {
      toast({ title: "Erreur", description: "Impossible de générer le reçu PDF", variant: "destructive" });
    });
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="w-[90vw] max-w-[320px] mx-auto p-0 gap-0 bg-background/95 backdrop-blur-sm border border-border/20 shadow-elegant rounded-xl overflow-hidden">
        
        <DialogHeader className={`relative px-2 py-1.5 border-b border-border/10 bg-gradient-subtle ${isAnimating ? 'animate-fade-in' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                <CreditCard className="h-3 w-3 text-primary" />
              </div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Paiement sécurisé
              </DialogTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClose}
              className="h-8 w-8 p-0 rounded-lg hover:bg-muted transition-colors duration-200 focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors duration-200" />
            </Button>
          </div>
        </DialogHeader>

        <div className="relative">
          {paymentStep === 'success' ? (
            <div className="px-3 py-4 text-center space-y-3 animate-scale-in">
              <div className="mx-auto w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center animate-pulse-success">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
                  Paiement confirmé !
                </h3>
                <p className="text-sm text-muted-foreground">
                  Votre facture a été payée avec succès
                </p>
                <div className="text-xs text-muted-foreground bg-green-50 dark:bg-green-900/10 rounded-lg p-2">
                  Facture #{invoice.invoice_number}
                </div>
              </div>
              <Button 
                onClick={handleDownloadReceipt} 
                variant="outline" 
                size="default"
                className="w-full bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/20 h-10 transition-all duration-200 hover:scale-[1.02]"
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger le reçu
              </Button>
            </div>
          ) : paymentStep === 'processing' ? (
            <div className="px-3 py-6 text-center space-y-3 animate-fade-in">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">
                  Traitement en cours...
                </h3>
                <p className="text-sm text-muted-foreground">
                  Confirmez le paiement sur votre téléphone
                </p>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          ) : paymentStep === 'form' ? (
            <div className={`px-3 py-3 space-y-3 ${isAnimating ? 'animate-slide-up' : ''}`}>
              
              <div className="bg-muted/30 rounded-lg p-2 space-y-1">
                <h4 className="text-xs font-medium text-foreground">Facture #{invoice.invoice_number}</h4>
                <div className="text-xs text-muted-foreground">
                  Montant: {displayFormatted}
                  {selectedCurrency !== 'USD' && (
                    <span className="ml-1 text-[10px]">(≈ {formatCurrency(invoice.total_amount_usd, 'USD')})</span>
                  )}
                </div>
              </div>

              {availableMethods.hasMobileMoney && availableMethods.hasBankCard ? (
                <Tabs value={selectedPaymentMethod} onValueChange={(v) => setSelectedPaymentMethod(v as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-3">
                    <TabsTrigger value="bank_card" className="text-xs">
                      <CreditCard className="h-3 w-3 mr-1" />
                      Carte Bancaire
                    </TabsTrigger>
                    <TabsTrigger value="mobile_money" className="text-xs">
                      <Smartphone className="h-3 w-3 mr-1" />
                      Mobile Money
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="bank_card" className="mt-0">
                    <Button 
                      onClick={handleStripePayment}
                      className="w-full"
                      disabled={isProcessingPayment}
                    >
                      {isProcessingPayment ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Traitement...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Payer par carte
                        </>
                      )}
                    </Button>
                  </TabsContent>

                  <TabsContent value="mobile_money" className="mt-0">
                    <MobileMoneyPayment
                      item={{
                        id: invoice.id,
                        title: `Facture ${invoice.invoice_number}`,
                        price: invoice.total_amount_usd
                      }}
                      currency={selectedCurrency}
                      displayAmount={displayAmount}
                      onPaymentSuccess={handleMobileMoneySuccess}
                    />
                  </TabsContent>
                </Tabs>
              ) : availableMethods.hasBankCard ? (
                <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  <Button 
                    onClick={handleStripePayment}
                    className="w-full"
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Payer par carte
                      </>
                    )}
                  </Button>
                </div>
              ) : availableMethods.hasMobileMoney ? (
                <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  <MobileMoneyPayment
                    item={{
                      id: invoice.id,
                      title: `Facture ${invoice.invoice_number}`,
                      price: invoice.total_amount_usd
                    }}
                    currency={selectedCurrency}
                    displayAmount={displayAmount}
                    onPaymentSuccess={handleMobileMoneySuccess}
                  />
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground p-4">
                  Aucun moyen de paiement configuré
                </div>
              )}
            </div>
          ) : null}
        </div>

        {paymentStep === 'form' && (
          <div className="px-3 py-1.5 bg-muted/20 border-t border-border/10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span>Paiement sécurisé SSL</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CadastralPaymentDialog;
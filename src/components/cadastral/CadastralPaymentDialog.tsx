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

  const generatePDFInvoice = () => {
    // Génère un reçu PDF A4 pour la facture courante
    import('@/lib/pdf').then(({ generateInvoicePDF }) => {
      generateInvoicePDF(invoice, CADASTRAL_SERVICES);
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              Paiement - Facture {invoice.invoice_number}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {paymentStep === 'success' ? (
          <div className="space-y-6 py-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
                  Paiement validé avec succès !
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Accédez maintenant au rapport SU/SR complet
                </p>
              </div>
            </div>

            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/10">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Facture générée avec succès. Téléchargez votre reçu ci-dessous.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 justify-center">
              <Button onClick={generatePDFInvoice} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Télécharger le reçu PDF
              </Button>
            </div>
          </div>
        ) : paymentStep === 'processing' ? (
          <div className="space-y-6 py-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Clock className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  Traitement du paiement en cours...
                </h3>
                <p className="text-sm text-muted-foreground">
                  Veuillez patienter pendant que nous traitons votre paiement
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Résumé de la facture */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Détails de la facture</CardTitle>
                  <Badge variant="outline">{invoice.invoice_number}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Référence SU/SR:</span>
                    <p className="font-mono font-medium">{invoice.parcel_number}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date de recherche:</span>
                    <p>{new Date(invoice.search_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Zone géographique:</span>
                    <p>{invoice.geographical_zone || 'Non spécifiée'}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Services sélectionnés:</h4>
                  {getSelectedServices().map((service) => {
                    const selectedArray = Array.isArray(invoice.selected_services) 
                      ? invoice.selected_services 
                      : (typeof invoice.selected_services === 'string' ? JSON.parse(invoice.selected_services) : []);
                    return (
                      <div key={service.id} className="flex justify-between text-sm">
                        <span>{service.name}</span>
                        <span className="font-medium">${service.price} USD</span>
                      </div>
                    );
                  })}
                </div>

                <Separator />

                <div className="flex justify-between font-semibold">
                  <span>Total à payer:</span>
                  <span className="text-lg text-primary">${invoice.total_amount_usd} USD</span>
                </div>
              </CardContent>
            </Card>

            {/* Options de paiement */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Choisissez votre mode de paiement</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as any)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="mobile_money" className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Mobile Money
                    </TabsTrigger>
                    <TabsTrigger value="stripe" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Carte bancaire
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="mobile_money" className="mt-4">
                    <MobileMoneyPayment
                      item={{
                        id: invoice.id,
                        title: `Facture ${invoice.invoice_number}`,
                        price: invoice.total_amount_usd
                      }}
                      currency="USD"
                      onPaymentSuccess={handleMobileMoneySuccess}
                    />
                  </TabsContent>

                  <TabsContent value="stripe" className="mt-4">
                    <div className="space-y-4">
                      <Alert>
                        <CreditCard className="h-4 w-4" />
                        <AlertDescription>
                          Vous serez redirigé vers notre plateforme de paiement sécurisée Stripe.
                        </AlertDescription>
                      </Alert>
                      
                      <Button 
                        onClick={handleStripePayment}
                        className="w-full"
                        size="lg"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Payer ${invoice.total_amount_usd} USD avec Stripe
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CadastralPaymentDialog;
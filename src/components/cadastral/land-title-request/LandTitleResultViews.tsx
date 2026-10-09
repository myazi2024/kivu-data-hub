import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, CreditCard } from 'lucide-react';
import MobileMoneyPayment from '@/components/payment/MobileMoneyPayment';
import type { CartItem } from '@/hooks/useCart';

const contentClass = (isMobile: boolean) =>
  `${isMobile ? 'w-[92vw] max-w-[360px] max-h-[88vh] rounded-2xl' : 'max-w-md rounded-2xl'} p-4 overflow-y-auto`;

interface PaymentProps {
  open: boolean;
  isMobile: boolean;
  province: string;
  /** Montant fixé par le serveur à la création de la demande. */
  amountDue: number;
  requestId: string;
  onClose: () => void;
  onSuccess: () => void;
  onCancel: () => void;
}

export const LandTitlePaymentView: React.FC<PaymentProps> = ({ open, isMobile, province, amountDue, requestId, onClose, onSuccess, onCancel }) => {
  const cartItem: CartItem = {
    id: `land-title-${requestId}`,
    title: 'Demande de titre foncier',
    price: amountDue,
    description: `Demande de titre foncier - ${province}`,
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={contentClass(isMobile)}>
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <div className="p-1.5 bg-primary/10 rounded-lg"><CreditCard className="h-4 w-4 text-primary" /></div>
            Paiement - Titre foncier
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">Montant total : {amountDue} USD</DialogDescription>
        </DialogHeader>
        <MobileMoneyPayment
          item={cartItem}
          currency="USD"
          paymentType="land_title_request"
          invoiceId={requestId}
          successMessage="Votre demande de titre foncier est enregistrée et en cours d'examen"
          onPaymentSuccess={onSuccess}
        />
        <Button variant="outline" onClick={onCancel} className="w-full h-11 text-xs rounded-xl mt-2">
          Payer plus tard
        </Button>
      </DialogContent>
    </Dialog>
  );
};

interface SuccessProps {
  open: boolean;
  isMobile: boolean;
  referenceNumber: string;
  onClose: () => void;
}

export const LandTitleSuccessView: React.FC<SuccessProps> = ({ open, isMobile, referenceNumber, onClose }) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className={contentClass(isMobile)}>
      <div className="space-y-3 text-center py-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Demande soumise avec succès</h3>
          <p className="text-xs text-muted-foreground mt-1">Votre demande de titre foncier a été enregistrée</p>
        </div>
        <Card className="bg-muted/50 border-0 text-left rounded-lg">
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Référence</span>
            <span className="font-mono font-bold text-xs text-primary">{referenceNumber}</span>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">Vous recevrez une notification dès que votre demande sera traitée.</p>
        <Button onClick={onClose} className="w-full h-11 text-xs rounded-xl">Fermer</Button>
      </div>
    </DialogContent>
  </Dialog>
);

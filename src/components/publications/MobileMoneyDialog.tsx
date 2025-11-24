import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import MobileMoneyPayment from '@/components/payment/MobileMoneyPayment';
import { CartItem } from '@/hooks/useCart';

interface MobileMoneyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publication: {
    id: string;
    title: string;
    price_usd: number;
  };
  onPaymentSuccess: () => void;
}

export const MobileMoneyDialog: React.FC<MobileMoneyDialogProps> = ({
  open,
  onOpenChange,
  publication,
  onPaymentSuccess,
}) => {
  const cartItem: CartItem = {
    id: publication.id,
    title: publication.title,
    price: publication.price_usd,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paiement Mobile Money</DialogTitle>
          <DialogDescription>
            {publication.title} - ${publication.price_usd} USD
          </DialogDescription>
        </DialogHeader>
        <MobileMoneyPayment
          item={cartItem}
          currency="USD"
          onPaymentSuccess={() => {
            onPaymentSuccess();
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

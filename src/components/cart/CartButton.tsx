import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { CartSidebar } from './CartSidebar';

export const CartButton = () => {
  const { getItemCount } = useCart();
  const itemCount = getItemCount();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <ShoppingCart className="h-4 w-4" />
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Panier ({itemCount})</SheetTitle>
          <SheetDescription>
            Gérez vos rapports sélectionnés avant achat
          </SheetDescription>
        </SheetHeader>
        <CartSidebar onClose={() => setIsOpen(false)} />
      </SheetContent>
    </Sheet>
  );
};
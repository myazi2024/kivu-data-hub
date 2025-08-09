import React, { useState, useEffect, useRef } from 'react';
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
  const prevCount = useRef(itemCount);

  // Open the cart automatically when the first item is added
  useEffect(() => {
    if (prevCount.current === 0 && itemCount > 0) {
      setIsOpen(true);
    }
    // Close the cart if it becomes empty
    if (itemCount === 0) {
      setIsOpen(false);
    }
    prevCount.current = itemCount;
  }, [itemCount]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {itemCount > 0 && (
        <SheetTrigger asChild>
          <Button
            variant="default"
            size="icon"
            aria-label="Ouvrir le panier"
            className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 rounded-full shadow-lg"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-semibold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center ring-2 ring-background">
              {itemCount}
            </span>
          </Button>
        </SheetTrigger>
      )}
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
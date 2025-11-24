import React, { useState } from 'react';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Trash2, CreditCard, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';

interface CartSidebarProps {
  onClose?: () => void;
}

export const CartSidebar = ({ onClose }: CartSidebarProps) => {
  const { cartItems, removeFromCart, getTotalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState(user?.email || '');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    
    if (!user && !email) {
      toast({
        title: "Email requis",
        description: "Veuillez saisir votre email pour continuer",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Check which payment system to use
      const { data: paymentMethodsConfig } = await supabase
        .from('payment_methods_config')
        .select('*')
        .eq('is_enabled', true);

      const hasStripe = paymentMethodsConfig?.some(p => p.config_type === 'bank_card');
      const hasMobileMoney = paymentMethodsConfig?.some(p => p.config_type === 'mobile_money');

      // If Stripe is available, use it
      if (hasStripe) {
        const itemIds = cartItems.map(item => item.id);
        
        const { data, error } = await supabase.functions.invoke('create-payment', {
          body: {
            items: itemIds,
          },
        });

        if (error) {
          // If Stripe fails and Mobile Money available, show option to user
          if (hasMobileMoney) {
            toast({
              title: "Paiement par carte indisponible",
              description: "Veuillez utiliser Mobile Money depuis les publications individuelles",
              variant: "destructive",
            });
          } else {
            throw error;
          }
          return;
        }

        if (data?.url) {
          window.open(data.url, '_blank');
          clearCart();
        }
      } else if (hasMobileMoney) {
        toast({
          title: "Paiement Mobile Money",
          description: "Veuillez utiliser le bouton 'Acheter' sur chaque publication pour payer par Mobile Money",
        });
      } else {
        throw new Error('Aucun moyen de paiement configuré');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Erreur de paiement",
        description: "Une erreur est survenue lors du traitement du paiement. Veuillez réessayer ou contacter le support.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-muted-foreground mb-4">
          Votre panier est vide
        </div>
        <p className="text-sm text-muted-foreground">
          Ajoutez des rapports depuis le kiosque pour commencer
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4 mt-6">
        {cartItems.map((item) => (
          <div key={item.id} className="flex items-start gap-3 p-3 border border-border rounded-lg">
            {item.cover_image_url && (
              <img
                src={item.cover_image_url}
                alt={`Couverture ${item.title}`}
                className="h-16 w-16 rounded-md object-cover"
                loading="lazy"
              />
            )}
            <div className="flex-1">
              <h4 className="font-medium text-sm">{item.title}</h4>
              {item.period && (
                <p className="text-xs text-muted-foreground mt-1">{item.period}</p>
              )}
              {item.zone && (
                <p className="text-xs text-muted-foreground">{item.zone}</p>
              )}
              <p className="font-semibold text-sm mt-2">${item.price}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeFromCart(item.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-4 mt-6">
        <Separator />
        
        <div className="flex justify-between items-center font-semibold">
          <span>Total:</span>
          <span>${getTotalPrice().toFixed(2)}</span>
        </div>

        {!user && (
          <>
            <Alert>
              <User className="h-4 w-4" />
              <AlertDescription>
                Créez un compte pour un suivi optimal de vos achats
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="guest-email">Email pour la facture</Label>
              <Input
                id="guest-email"
                type="email"
                placeholder="votre.email@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </>
        )}

        <Button 
          onClick={handleCheckout}
          disabled={isProcessing || cartItems.length === 0}
          className="w-full"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          {isProcessing ? 'Traitement...' : 'Passer au paiement'}
        </Button>
      </div>
    </div>
  );
};
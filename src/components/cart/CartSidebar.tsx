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
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
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
  const { availableMethods, loading: configLoading } = usePaymentConfig();
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
      // Vérifier les moyens de paiement disponibles
      if (!availableMethods.hasAnyMethod) {
        toast({
          title: "Aucun moyen de paiement",
          description: "Aucun moyen de paiement n'est configuré. Contactez l'administrateur.",
          variant: "destructive"
        });
        return;
      }

      // Prioriser la carte bancaire (Stripe) si disponible
      if (availableMethods.hasBankCard) {
        const itemIds = cartItems.map(item => item.id);
        
        const { data, error } = await supabase.functions.invoke('create-payment', {
          body: {
            items: itemIds,
            payment_type: 'publications'
          }
        });

        if (error) {
          // Si Stripe échoue et Mobile Money est disponible, proposer l'alternative
          if (availableMethods.hasMobileMoney) {
            toast({
              title: "Paiement par carte indisponible",
              description: "Utilisez le bouton 'Acheter' sur chaque publication pour payer par Mobile Money",
              variant: "destructive"
            });
          } else {
            throw error;
          }
          return;
        }

        if (data?.url) {
          window.location.href = data.url;
          clearCart();
        }
      } else if (availableMethods.hasMobileMoney) {
        // Seulement Mobile Money disponible
        toast({
          title: "Paiement Mobile Money",
          description: "Utilisez le bouton 'Acheter' sur chaque publication pour payer par Mobile Money",
        });
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
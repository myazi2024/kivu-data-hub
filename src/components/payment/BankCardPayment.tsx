import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, Shield, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';

interface BankCardPaymentProps {
  invoiceId: string;
  amount: number;
  onPaymentSuccess: () => void;
}

const BankCardPayment: React.FC<BankCardPaymentProps> = ({
  invoiceId,
  amount,
  onPaymentSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'form' | 'processing' | 'success'>('form');
  const { user } = useAuth();
  const { toast } = useToast();
  const { availableMethods, loading: configLoading } = usePaymentConfig();

  const handleStripePayment = async () => {
    if (!user) {
      toast({
        title: "Authentification requise",
        description: "Vous devez être connecté pour payer par carte",
        variant: "destructive"
      });
      return;
    }

    // Vérifier que Stripe est activé dans la configuration
    if (!availableMethods.hasBankCard) {
      toast({
        title: "Paiement non disponible",
        description: "Le paiement par carte bancaire n'est pas activé",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setPaymentStep('processing');

    try {
      // Créer une session de paiement Stripe pour cette facture cadastrale
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          invoice_id: invoiceId,
          payment_type: 'cadastral_service',
          amount_usd: amount
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Ouvrir la page de paiement Stripe
        window.location.href = data.url;
      } else {
        throw new Error('URL de paiement non reçue');
      }
    } catch (error: any) {
      console.error('Erreur paiement Stripe:', error);
      toast({
        title: "Erreur de paiement",
        description: error.message || "Impossible d'initier le paiement par carte",
        variant: "destructive"
      });
      setPaymentStep('form');
    } finally {
      setLoading(false);
    }
  };

  if (paymentStep === 'success') {
    return (
      <div className="animate-scale-in">
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto animate-pulse-success">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-green-700 dark:text-green-400">
                  Paiement confirmé !
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Transaction réussie
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStep === 'processing') {
    return (
      <div className="animate-fade-in">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold">Redirection vers le paiement...</h3>
                <p className="text-sm text-muted-foreground">
                  Vous allez être redirigé vers la page de paiement sécurisée
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (configLoading) {
    return (
      <div className="text-center py-4">
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (!availableMethods.hasBankCard) {
    return (
      <div className="text-center text-sm text-muted-foreground p-4">
        Le paiement par carte bancaire n'est pas disponible actuellement
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Informations de sécurité */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-left space-y-1">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Paiement sécurisé par Stripe
            </p>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-0.5">
              <li>• Vos données bancaires sont cryptées</li>
              <li>• Transaction sécurisée SSL/TLS</li>
              <li>• Aucune information stockée sur nos serveurs</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bouton de paiement */}
      <Button
        onClick={handleStripePayment}
        disabled={loading}
        className="w-full h-12 text-base font-medium"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Traitement...
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5 mr-2" />
            Payer {amount} USD par carte
          </>
        )}
      </Button>

      {/* Note de sécurité */}
      <p className="text-xs text-center text-muted-foreground">
        En cliquant, vous serez redirigé vers notre page de paiement sécurisée
      </p>
    </div>
  );
};

export default BankCardPayment;

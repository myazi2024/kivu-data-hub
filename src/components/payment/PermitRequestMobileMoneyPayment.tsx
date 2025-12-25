import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PhoneNumberInput from '@/components/ui/phone-number-input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, DollarSign, Loader2, Shield, Smartphone } from 'lucide-react';

type Step = 'form' | 'processing' | 'success';

export interface PermitRequestPaymentData {
  provider: string;
  phoneNumber: string;
  pin: string;
}

interface PermitRequestMobileMoneyPaymentProps {
  amountUsd: number;
  currency?: string;
  onPaymentSuccess: (paymentData: { provider: string; phoneNumber: string }) => void;
}

const PermitRequestMobileMoneyPayment: React.FC<PermitRequestMobileMoneyPaymentProps> = ({
  amountUsd,
  currency = 'USD',
  onPaymentSuccess,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { paymentMode, availableMethods, isPaymentRequired } = usePaymentConfig();

  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [showProviderReminder, setShowProviderReminder] = useState(false);

  const [paymentData, setPaymentData] = useState<PermitRequestPaymentData>({
    provider: '',
    phoneNumber: '',
    pin: '',
  });

  const [availableProviders, setAvailableProviders] = useState<
    Array<{ value: string; label: string; prefix: string; color: string }>
  >([]);

  const isDisabled = useMemo(() => {
    if (!user) return true;
    if (!availableMethods.hasMobileMoney) return true;
    if (!isPaymentRequired()) return false; // mode bypass: on autorise (ça passe direct)
    return !paymentData.provider || !paymentData.phoneNumber || !paymentData.pin;
  }, [availableMethods.hasMobileMoney, isPaymentRequired, paymentData, user]);

  useEffect(() => {
    const loadActiveProviders = async () => {
      try {
        const { data, error } = await supabase
          .from('payment_methods_config')
          .select('*')
          .eq('config_type', 'mobile_money')
          .eq('is_enabled', true)
          .order('display_order', { ascending: true });

        if (error) throw error;

        const providerMap: Record<string, { prefix: string; color: string }> = {
          airtel_money: { prefix: '+243 97', color: 'from-red-500 to-red-600' },
          orange_money: { prefix: '+243 84', color: 'from-orange-500 to-orange-600' },
          mpesa: { prefix: '+243 99', color: 'from-green-500 to-green-600' },
        };

        const providers =
          data?.map((p) => ({
            value: p.provider_id,
            label: p.provider_name,
            prefix: providerMap[p.provider_id]?.prefix || '+243 XX',
            color: providerMap[p.provider_id]?.color || 'from-blue-500 to-blue-600',
          })) || [];

        setAvailableProviders(providers);
      } catch (e) {
        console.error('Error loading payment providers:', e);
        // Fallback
        setAvailableProviders([
          { value: 'airtel_money', label: 'Airtel Money', prefix: '+243 97', color: 'from-red-500 to-red-600' },
          { value: 'orange_money', label: 'Orange Money', prefix: '+243 84', color: 'from-orange-500 to-orange-600' },
          { value: 'mpesa', label: 'M-Pesa', prefix: '+243 99', color: 'from-green-500 to-green-600' },
        ]);
      }
    };

    loadActiveProviders();
  }, []);

  const handleProviderReminderClick = () => {
    if (!paymentData.provider) {
      setShowProviderReminder(false);
      requestAnimationFrame(() => {
        setTimeout(() => {
          setShowProviderReminder(true);
          setTimeout(() => setShowProviderReminder(false), 2500);
        }, 50);
      });
    }
  };

  const pollTransaction = async (transactionId: string) => {
    let attempts = 0;
    const maxAttempts = 25;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const { data: transaction, error } = await supabase
        .from('payment_transactions')
        .select('status, transaction_reference')
        .eq('id', transactionId)
        .maybeSingle();

      if (error) throw error;

      if (transaction?.status === 'completed') return transaction;
      if (transaction?.status === 'failed') throw new Error('Le paiement a échoué');

      attempts++;
    }

    throw new Error('Délai de paiement dépassé. Veuillez réessayer.');
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Authentification requise',
        description: 'Veuillez vous connecter pour effectuer un paiement.',
        variant: 'destructive',
      });
      return;
    }

    // Mode bypass (dev): pas de paiement, on passe directement
    if (!isPaymentRequired()) {
      setStep('success');
      onPaymentSuccess({ provider: paymentData.provider || 'bypass', phoneNumber: paymentData.phoneNumber || '' });
      return;
    }

    if (!availableMethods.hasMobileMoney) {
      toast({
        title: 'Paiement indisponible',
        description: 'Aucun moyen de paiement Mobile Money activé.',
        variant: 'destructive',
      });
      return;
    }

    if (!paymentData.provider || !paymentData.phoneNumber || !paymentData.pin) {
      handleProviderReminderClick();
      return;
    }

    try {
      setLoading(true);
      setStep('processing');

      const { data: paymentResult, error: paymentError } = await supabase.functions.invoke(
        'process-mobile-money-payment',
        {
          body: {
            payment_provider: paymentData.provider,
            phone_number: paymentData.phoneNumber,
            amount_usd: amountUsd,
            payment_type: 'permit_request',
            test_mode: paymentMode.test_mode,
          },
        }
      );

      if (paymentError) throw paymentError;
      if (!paymentResult?.success) throw new Error(paymentResult?.error || 'Payment failed');

      await pollTransaction(paymentResult.transaction_id);

      setStep('success');
      toast({
        title: 'Paiement confirmé',
        description: 'Votre paiement a été validé.',
      });

      onPaymentSuccess({ provider: paymentData.provider, phoneNumber: paymentData.phoneNumber });
    } catch (err: any) {
      console.error('Permit request payment error:', err);
      setStep('form');
      toast({
        title: 'Erreur de paiement',
        description: err?.message || "Une erreur s'est produite lors du paiement",
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="animate-scale-in">
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto animate-pulse-success">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-green-700 dark:text-green-400">Paiement confirmé !</h3>
                <p className="text-sm text-green-600 dark:text-green-400">Transaction réussie</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="animate-fade-in">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold">Validation en cours...</h3>
                <p className="text-sm text-muted-foreground">Confirmez le paiement sur votre téléphone</p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-left space-y-1">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Étapes à suivre :</p>
                    <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-0.5">
                      <li>• Vérifiez la notification sur votre téléphone</li>
                      <li>• Saisissez votre code PIN</li>
                      <li>• Confirmez la transaction</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            Fournisseur Mobile Money
            {showProviderReminder && (
              <span className="ml-2 text-xs text-orange-600 dark:text-orange-400 animate-pulse font-semibold">
                ⚠️ Sélectionnez d'abord un fournisseur
              </span>
            )}
          </label>
          <Select
            value={paymentData.provider}
            onValueChange={(value) => setPaymentData((p) => ({ ...p, provider: value }))}
            required
          >
            <SelectTrigger
              className={`h-10 border-border/20 bg-background/50 hover:bg-background/80 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                showProviderReminder
                  ? 'animate-pulse ring-4 ring-red-400/60 border-red-400 bg-red-50/50 dark:bg-red-900/30 shadow-xl shadow-red-400/40 scale-105'
                  : ''
              }`}
            >
              <SelectValue placeholder="Choisissez votre fournisseur" />
            </SelectTrigger>
            <SelectContent>
              {availableProviders.length > 0 ? (
                availableProviders.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value} className="py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${provider.color}`}></div>
                      <span className="font-medium">{provider.label}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{provider.prefix}</span>
                    </div>
                  </SelectItem>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground">Aucun moyen de paiement activé</div>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Numéro de téléphone</label>
          <PhoneNumberInput
            value={paymentData.phoneNumber}
            onChange={(value) => setPaymentData((p) => ({ ...p, phoneNumber: value }))}
            placeholder="97 123 4567"
            required
            disabled={!paymentData.provider}
            onDisabledClick={handleProviderReminderClick}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Code secret</label>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Votre code PIN"
              value={paymentData.pin}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/[^0-9]/g, '');
                setPaymentData((p) => ({ ...p, pin: numericValue }));
              }}
              required
              className="h-10 pl-9 border-border/20 bg-background/50 hover:bg-background/80 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 pt-3 bg-background/95 backdrop-blur-sm">
        <Button
          type="submit"
          className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-hover focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || isDisabled}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Traitement...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span>Payer {amountUsd} {currency}</span>
            </div>
          )}
        </Button>

        <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>Sécurisé SSL</span>
        </div>
      </div>
    </form>
  );
};

export default PermitRequestMobileMoneyPayment;

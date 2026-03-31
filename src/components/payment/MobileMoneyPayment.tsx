import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PhoneNumberInput from '@/components/ui/phone-number-input';
import { usePayment, PaymentData } from '@/hooks/usePayment';
import { Smartphone, DollarSign, CheckCircle, Loader2, Shield } from 'lucide-react';
import { CartItem } from '@/hooks/useCart';
import { usePaymentProviders } from '@/hooks/usePaymentProviders';

interface MobileMoneyPaymentProps {
  item: CartItem;
  currency: string;
  displayAmount?: number;
  onPaymentSuccess: (paymentData?: { provider: string; phoneNumber: string }) => void;
}

const MobileMoneyPayment: React.FC<MobileMoneyPaymentProps> = ({
  item,
  currency,
  displayAmount,
  onPaymentSuccess
}) => {
  const [paymentData, setPaymentData] = useState<PaymentData>({
    provider: '',
    phoneNumber: '',
    name: ''
  });
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [showProviderReminder, setShowProviderReminder] = useState(false);

  const { providers: availableProviders } = usePaymentProviders();
  const { loading, paymentStep, createPayment, resetPaymentState } = usePayment();

  // Animation d'apparition du formulaire
  useEffect(() => {
    const timer = setTimeout(() => setIsFormVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await createPayment(item, paymentData);
    
    if (result) {
      setTimeout(() => {
        onPaymentSuccess({
          provider: paymentData.provider,
          phoneNumber: paymentData.phoneNumber
        });
      }, 2000);
    }
  };

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
                <h3 className="text-base font-semibold">Validation en cours...</h3>
                <p className="text-sm text-muted-foreground">
                  Confirmez le paiement sur votre téléphone
                </p>
              </div>
              
              {/* Instructions visuelles */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-left space-y-1">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Étapes à suivre :
                    </p>
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
    <div className={`space-y-4 ${isFormVisible ? 'animate-fade-in' : 'opacity-0'}`}>
      
      {/* Formulaire de paiement */}
      <div className="space-y-3">
        
        {/* Sélection du fournisseur avec design amélioré */}
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
            onValueChange={(value) => setPaymentData({ ...paymentData, provider: value })}
            required
          >
            <SelectTrigger className={`h-10 border-border/20 bg-background/50 hover:bg-background/80 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary ${
              showProviderReminder ? 'animate-pulse ring-4 ring-red-400/60 border-red-400 bg-red-50/50 dark:bg-red-900/30 shadow-xl shadow-red-400/40 scale-105' : ''
            }`}>
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
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Aucun moyen de paiement activé
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Numéro de téléphone */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            Numéro de téléphone
          </label>
          <PhoneNumberInput
            value={paymentData.phoneNumber}
            onChange={(value) => setPaymentData({ ...paymentData, phoneNumber: value })}
            placeholder="97 123 4567"
            required
            disabled={!paymentData.provider}
            onDisabledClick={handleProviderReminderClick}
          />
        </div>
      </div>

      {/* Bouton de paiement sticky sur mobile */}
      <div className="sticky bottom-0 pt-3 bg-background/95 backdrop-blur-sm">
        <Button 
          type="submit" 
          onClick={handlePayment}
          className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-hover focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || !paymentData.provider || !paymentData.phoneNumber}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Traitement...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span>Payer {(displayAmount ?? item.price).toLocaleString('fr-FR', { maximumFractionDigits: currency === 'CDF' ? 0 : 2 })} {currency}</span>
            </div>
          )}
        </Button>
        
        {/* Indicateur de sécurité */}
        <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>Sécurisé SSL</span>
        </div>
      </div>
    </div>
  );
};

export default MobileMoneyPayment;
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePayment, PaymentData } from '@/hooks/usePayment';
import { Smartphone, DollarSign, CheckCircle } from 'lucide-react';
import { CartItem } from '@/hooks/useCart';

interface MobileMoneyPaymentProps {
  item: CartItem;
  currency: string;
  onPaymentSuccess: () => void;
}

const MobileMoneyPayment: React.FC<MobileMoneyPaymentProps> = ({
  item,
  currency,
  onPaymentSuccess
}) => {
  const [paymentData, setPaymentData] = useState<PaymentData>({
    provider: '',
    phoneNumber: '',
    name: ''
  });

  const { loading, paymentStep, createPayment, resetPaymentState } = usePayment();

  const providers = [
    { value: 'airtel_money', label: 'Airtel Money', prefix: '+243 97' },
    { value: 'orange_money', label: 'Orange Money', prefix: '+243 84' },
    { value: 'mpesa', label: 'M-Pesa', prefix: '+243 99' }
  ];

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await createPayment(item, paymentData);
    
    if (result) {
      setTimeout(() => {
        onPaymentSuccess();
      }, 2000);
    }
  };

  if (paymentStep === 'success') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
            <h3 className="text-lg font-semibold">Paiement réussi !</h3>
            <p className="text-muted-foreground">
              Votre paiement a été traité avec succès. Vous pouvez maintenant télécharger votre publication.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (paymentStep === 'processing') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
            <h3 className="text-lg font-semibold">Traitement du paiement...</h3>
            <p className="text-muted-foreground">
              Veuillez confirmer le paiement sur votre téléphone et patienter.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Instructions :</strong><br />
                1. Vérifiez votre téléphone pour la notification de paiement<br />
                2. Saisissez votre code PIN pour confirmer<br />
                3. Patientez pendant le traitement
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Prix compact */}
      <div className="text-center">
        <p className="text-base font-semibold text-primary">{item.price} {currency}</p>
      </div>

      <form onSubmit={handlePayment} className="space-y-2">
        {/* Fournisseur */}
        <Select
          value={paymentData.provider}
          onValueChange={(value) => setPaymentData({ ...paymentData, provider: value })}
          required
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Fournisseur" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((provider) => (
              <SelectItem key={provider.value} value={provider.value} className="text-xs">
                {provider.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Téléphone */}
        <Input
          type="tel"
          placeholder="+243 97 123 4567"
          value={paymentData.phoneNumber}
          onChange={(e) => setPaymentData({ ...paymentData, phoneNumber: e.target.value })}
          required
          className="h-8 text-xs"
        />

        {/* Code secret */}
        <Input
          type="password"
          placeholder="Code secret"
          value={paymentData.name}
          onChange={(e) => setPaymentData({ ...paymentData, name: e.target.value })}
          required
          className="h-8 text-xs"
        />

        <Button type="submit" className="w-full h-8 text-xs" disabled={loading}>
          {loading ? 'Traitement...' : 'Payer'}
        </Button>
      </form>
    </div>
  );
};

export default MobileMoneyPayment;
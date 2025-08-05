import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Smartphone, DollarSign, CheckCircle } from 'lucide-react';

interface MobileMoneyPaymentProps {
  publicationId: string;
  amount: number;
  currency: string;
  onPaymentSuccess: () => void;
}

const MobileMoneyPayment: React.FC<MobileMoneyPaymentProps> = ({
  publicationId,
  amount,
  currency,
  onPaymentSuccess
}) => {
  const [paymentData, setPaymentData] = useState({
    provider: '',
    phoneNumber: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'form' | 'processing' | 'success'>('form');

  const { user } = useAuth();
  const { toast } = useToast();

  const providers = [
    { value: 'airtel_money', label: 'Airtel Money', prefix: '+243 97' },
    { value: 'orange_money', label: 'Orange Money', prefix: '+243 84' },
    { value: 'mpesa', label: 'M-Pesa', prefix: '+243 99' }
  ];

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPaymentStep('processing');

    try {
      // Créer l'enregistrement de paiement
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          user_id: user?.id,
          publication_id: publicationId,
          amount_usd: amount,
          payment_method: 'mobile_money',
          payment_provider: paymentData.provider,
          phone_number: paymentData.phoneNumber,
          status: 'pending'
        }])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Simuler le processus de paiement mobile money
      // En production, ceci ferait appel à l'API du fournisseur
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Mise à jour du statut du paiement
      const { error: updateError } = await supabase
        .from('payments')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', paymentRecord.id);

      if (updateError) throw updateError;

      // Créer l'enregistrement de téléchargement
      const { error: downloadError } = await supabase
        .from('publication_downloads')
        .insert([{
          user_id: user?.id,
          publication_id: publicationId,
          payment_id: paymentRecord.id
        }]);

      if (downloadError) throw downloadError;

      setPaymentStep('success');
      toast({
        title: "Paiement réussi",
        description: "Votre publication est maintenant disponible pour téléchargement"
      });

      setTimeout(() => {
        onPaymentSuccess();
      }, 2000);

    } catch (error) {
      console.error('Erreur de paiement:', error);
      toast({
        title: "Erreur de paiement",
        description: "Une erreur s'est produite lors du traitement de votre paiement",
        variant: "destructive"
      });
      setPaymentStep('form');
    } finally {
      setLoading(false);
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Paiement Mobile Money
        </CardTitle>
        <div className="flex items-center gap-2 text-lg font-semibold">
          <DollarSign className="w-5 h-5" />
          {amount} {currency}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePayment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Fournisseur Mobile Money
            </label>
            <Select
              value={paymentData.provider}
              onValueChange={(value) => setPaymentData({ ...paymentData, provider: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un fournisseur" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Numéro de téléphone
            </label>
            <Input
              type="tel"
              placeholder="Ex: +243 97 123 4567"
              value={paymentData.phoneNumber}
              onChange={(e) => setPaymentData({ ...paymentData, phoneNumber: e.target.value })}
              required
            />
            {paymentData.provider && (
              <p className="text-xs text-muted-foreground mt-1">
                Format attendu : {providers.find(p => p.value === paymentData.provider)?.prefix} XXX XXXX
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Nom du titulaire du compte
            </label>
            <Input
              type="text"
              placeholder="Votre nom complet"
              value={paymentData.name}
              onChange={(e) => setPaymentData({ ...paymentData, name: e.target.value })}
              required
            />
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>Note :</strong> Assurez-vous que votre compte Mobile Money dispose de suffisamment de fonds 
              et que votre numéro est actif pour recevoir les notifications de paiement.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Traitement...' : 'Payer maintenant'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default MobileMoneyPayment;
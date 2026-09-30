import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import type { MutationRequest } from '@/types/mutation';
import { PROVIDER_LABELS } from '../mutation/MutationConstants';
import type { Step } from './types';

interface AvailableMethods {
  hasMobileMoney: boolean;
  hasBankCard: boolean;
}

export interface PaymentStepProps {
  createdRequest: MutationRequest | null;
  hasAnyPaymentMethod: boolean;
  availableMethods: AvailableMethods;
  paymentMethod: 'mobile_money' | 'bank_card';
  setPaymentMethod: (value: 'mobile_money' | 'bank_card') => void;
  paymentProvider: string;
  setPaymentProvider: (value: string) => void;
  enabledMobileProviders: string[];
  paymentPhone: string;
  setPaymentPhone: (value: string) => void;
  setStep: (step: Step) => void;
  processingPayment: boolean;
  handlePayment: () => void | Promise<void>;
}

const PaymentStep: React.FC<PaymentStepProps> = ({
  createdRequest,
  hasAnyPaymentMethod,
  availableMethods,
  paymentMethod,
  setPaymentMethod,
  paymentProvider,
  setPaymentProvider,
  enabledMobileProviders,
  paymentPhone,
  setPaymentPhone,
  setStep,
  processingPayment,
  handlePayment,
}) => {
  return (
    <div className="space-y-3">
      <Card className="bg-muted/50 border-0 rounded-lg">
        <CardContent className="p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground">Référence</p>
              <p className="font-mono font-bold text-sm">{createdRequest?.reference_number || 'Référence en cours'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Montant</p>
              <p className="text-lg font-bold text-primary">${Number(createdRequest?.total_amount_usd || 0).toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label className="text-xs font-medium">Mode de paiement</Label>
        {!hasAnyPaymentMethod ? (
          <Alert className="rounded-lg border-destructive/20 bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-xs text-destructive">Aucun moyen de paiement actif n'est disponible pour le moment.</AlertDescription>
          </Alert>
        ) : (
          <div className={`grid ${availableMethods.hasMobileMoney && availableMethods.hasBankCard ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5`}>
            {availableMethods.hasMobileMoney && (
              <Button variant={paymentMethod === 'mobile_money' ? 'default' : 'outline'} size="sm" onClick={() => setPaymentMethod('mobile_money')} className="h-8 text-xs rounded-lg">Mobile Money</Button>
            )}
            {availableMethods.hasBankCard && (
              <Button variant={paymentMethod === 'bank_card' ? 'default' : 'outline'} size="sm" onClick={() => setPaymentMethod('bank_card')} className="h-8 text-xs rounded-lg">Carte bancaire</Button>
            )}
          </div>
        )}
      </div>

      {paymentMethod === 'mobile_money' && availableMethods.hasMobileMoney && (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-[10px]">Opérateur</Label>
            <Select value={paymentProvider} onValueChange={setPaymentProvider}>
              <SelectTrigger className="h-8 text-xs rounded-lg"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {enabledMobileProviders.map(provider => (
                  <SelectItem key={provider} value={provider} className="text-xs">{PROVIDER_LABELS[provider] || provider}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Numéro de téléphone</Label>
            <Input value={paymentPhone} onChange={(e) => setPaymentPhone(e.target.value)} placeholder="+243..." className="h-8 text-xs rounded-lg" />
          </div>
        </div>
      )}

      <div className="flex gap-1.5 pt-2">
        <Button variant="outline" onClick={() => setStep('preview')} disabled={processingPayment} className="flex-1 h-8 text-xs rounded-lg">Retour</Button>
        <Button onClick={handlePayment} disabled={processingPayment || !hasAnyPaymentMethod} className="flex-1 h-8 text-xs rounded-lg">
          {processingPayment ? (<><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Paiement...</>) : (`Payer $${Number(createdRequest?.total_amount_usd || 0).toFixed(2)}`)}
        </Button>
      </div>
    </div>
  );
};

export default PaymentStep;

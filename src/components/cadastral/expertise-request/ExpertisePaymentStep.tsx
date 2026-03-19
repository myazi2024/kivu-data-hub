import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, DollarSign, Phone, CreditCard, CheckCircle2 } from 'lucide-react';
import type { ExpertiseFee } from '@/types/expertise';
import { usePaymentProviders } from '@/hooks/usePaymentProviders';

interface ExpertisePaymentStepProps {
  parcelNumber: string;
  fees: ExpertiseFee[];
  getTotalAmount: () => number;
  isPaymentValid: () => boolean;
  paymentMethod: 'mobile_money' | 'bank_card';
  setPaymentMethod: (method: 'mobile_money' | 'bank_card') => void;
  paymentProvider: string;
  setPaymentProvider: (provider: string) => void;
  paymentPhone: string;
  setPaymentPhone: (phone: string) => void;
  processingPayment: boolean;
  onBack: () => void;
  onPay: () => void;
}

const ExpertisePaymentStep: React.FC<ExpertisePaymentStepProps> = ({
  parcelNumber, fees, getTotalAmount, isPaymentValid,
  paymentMethod, setPaymentMethod, paymentProvider, setPaymentProvider,
  paymentPhone, setPaymentPhone, processingPayment, onBack, onPay
}) => {
  const { providers, loading: loadingProviders } = usePaymentProviders();

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-primary/15 to-primary/5 rounded-2xl p-3 border border-primary/20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground leading-tight">Parcelle</p>
              <p className="font-mono font-bold text-sm truncate">{parcelNumber}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[11px] text-muted-foreground leading-tight">Total</p>
            <p className="text-xl font-bold text-primary">${getTotalAmount()}</p>
          </div>
        </div>
      </div>

      <div className="bg-muted/30 rounded-2xl p-2.5">
        <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 px-0.5">Détails des frais</p>
        <div className="space-y-1">
          {fees.map((fee) => (
            <div key={fee.id} className="flex justify-between items-center px-0.5">
              <span className="text-sm">{fee.fee_name}</span>
              <span className="font-semibold text-sm">${fee.amount_usd}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold mb-2">Mode de paiement</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setPaymentMethod('mobile_money')}
            className={`p-2.5 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${
              paymentMethod === 'mobile_money' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50 bg-background'
            }`}>
            <Phone className="h-4 w-4" /><span className="text-sm font-medium">Mobile Money</span>
          </button>
          <button type="button" onClick={() => setPaymentMethod('bank_card')}
            className={`p-2.5 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${
              paymentMethod === 'bank_card' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50 bg-background'
            }`}>
            <CreditCard className="h-4 w-4" /><span className="text-sm font-medium">Carte bancaire</span>
          </button>
        </div>
      </div>

      {paymentMethod === 'mobile_money' && (
        <div className="bg-muted/20 rounded-2xl p-2.5 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] font-medium mb-1 block">Opérateur</Label>
              <Select value={paymentProvider} onValueChange={setPaymentProvider}>
                <SelectTrigger className="h-9 rounded-xl text-sm"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent className="z-[1200]">
                  {loadingProviders ? (
                    <SelectItem value="_loading" disabled>Chargement...</SelectItem>
                  ) : (
                    providers.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] font-medium mb-1 block">Téléphone</Label>
              <Input value={paymentPhone} onChange={(e) => setPaymentPhone(e.target.value)} placeholder="+243 ..." className="h-9 rounded-xl text-sm" />
            </div>
          </div>
        </div>
      )}

      {paymentMethod === 'bank_card' && (
        <div className="flex items-center gap-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
          <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">Redirection vers Stripe pour un paiement sécurisé.</p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={onBack} disabled={processingPayment} className="flex-1 h-10 rounded-2xl text-sm">Retour</Button>
        <Button variant="seloger" onClick={onPay}
          disabled={processingPayment || !isPaymentValid() || (paymentMethod === 'mobile_money' && (!paymentProvider || !paymentPhone))}
          className="flex-1 h-10 rounded-2xl text-sm font-semibold">
          {processingPayment ? (<><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Traitement...</>) : (<><CheckCircle2 className="h-4 w-4 mr-1.5" />Payer ${getTotalAmount()}</>)}
        </Button>
      </div>
    </div>
  );
};

export default ExpertisePaymentStep;

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PhoneNumberInput from '@/components/ui/phone-number-input';
import { ArrowLeft, CreditCard, Loader2, Smartphone, Shield, FlaskConical } from 'lucide-react';
import { PaymentProvider } from './types';

interface PermitPaymentStepProps {
  totalFeeUSD: number;
  requestTypeLabel: string;
  parcelNumber: string;
  processingPayment: boolean;
  paymentMethod: 'mobile_money' | 'bank_card';
  setPaymentMethod: (m: 'mobile_money' | 'bank_card') => void;
  paymentProvider: string;
  setPaymentProvider: (v: string) => void;
  paymentPhone: string;
  setPaymentPhone: (v: string) => void;
  availableProviders: PaymentProvider[];
  onPay: () => void;
  onBack: () => void;
  onCancelPayment: () => void;
  isTestModeActive?: boolean;
  onTestPay?: () => void;
}

const PermitPaymentStep: React.FC<PermitPaymentStepProps> = ({
  totalFeeUSD, requestTypeLabel, parcelNumber, processingPayment,
  paymentMethod, setPaymentMethod, paymentProvider, setPaymentProvider,
  paymentPhone, setPaymentPhone, availableProviders,
  onPay, onBack, onCancelPayment,
  isTestModeActive, onTestPay,
}) => {
  if (processingPayment) {
    return (
      <div className="space-y-4 py-4">
        <Card className="border-primary/20 bg-primary/5 rounded-xl">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold">Validation en cours...</h3>
                <p className="text-sm text-muted-foreground">Confirmez le paiement sur votre téléphone</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-left space-y-1">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Étapes à suivre :</p>
                    <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-0.5">
                      <li>• Vérifiez la notification sur votre téléphone</li>
                      <li>• Saisissez votre code PIN sur votre téléphone</li>
                      <li>• Confirmez la transaction</li>
                    </ul>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={onCancelPayment} className="rounded-xl">
                Annuler le paiement
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="bg-muted/50 border-0 rounded-xl">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Service</p>
              <p className="font-medium text-sm truncate">{requestTypeLabel}</p>
            </div>
            <div className="text-right ml-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Montant</p>
              <p className="text-xl font-bold text-primary">${totalFeeUSD.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label className="text-xs font-medium">Mode de paiement</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant={paymentMethod === 'mobile_money' ? 'default' : 'outline'} size="sm" onClick={() => setPaymentMethod('mobile_money')} className="h-9 text-xs rounded-lg gap-1.5">
            <Smartphone className="h-3.5 w-3.5" /> Mobile Money
          </Button>
          <Button type="button" variant={paymentMethod === 'bank_card' ? 'default' : 'outline'} size="sm" onClick={() => setPaymentMethod('bank_card')} className="h-9 text-xs rounded-lg gap-1.5">
            <CreditCard className="h-3.5 w-3.5" /> Carte bancaire
          </Button>
        </div>
      </div>

      {paymentMethod === 'mobile_money' && (
        <div className="space-y-2.5">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Opérateur</Label>
            <Select value={paymentProvider} onValueChange={setPaymentProvider}>
              <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue placeholder="Sélectionner l'opérateur..." /></SelectTrigger>
              <SelectContent>
                {availableProviders.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value} className="text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${provider.color}`}></div>
                      {provider.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Numéro de téléphone</Label>
            <PhoneNumberInput value={paymentPhone} onChange={setPaymentPhone} placeholder="97 123 4567" disabled={!paymentProvider} />
          </div>
          <Alert className="rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-800/50">
            <Shield className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-[10px] text-blue-700 dark:text-blue-300">
              Vous recevrez une notification push de votre opérateur. Saisissez votre code PIN directement sur votre téléphone pour confirmer le paiement.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {paymentMethod === 'bank_card' && (
        <Alert className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <CreditCard className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
            Le paiement par carte bancaire sera bientôt disponible. Veuillez utiliser Mobile Money pour le moment.
          </AlertDescription>
        </Alert>
      )}

      {/* Test mode simulation */}
      {isTestModeActive && onTestPay && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-900/20 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">Mode Test actif</span>
          </div>
          <p className="text-[10px] text-amber-700 dark:text-amber-300">
            Simulez un paiement sans frais réels.
          </p>
          <Button
            onClick={onTestPay}
            disabled={processingPayment}
            variant="outline"
            size="sm"
            className="w-full border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-xs h-9"
          >
            <FlaskConical className="h-3.5 w-3.5 mr-1.5" /> Simuler le paiement (test)
          </Button>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onBack} disabled={processingPayment} className="flex-1 h-10 text-xs rounded-xl">
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Retour
        </Button>
        <Button onClick={onPay} disabled={processingPayment || (paymentMethod === 'mobile_money' && (!paymentProvider || !paymentPhone)) || paymentMethod === 'bank_card'} className="flex-1 h-10 text-xs rounded-xl">
          Payer ${totalFeeUSD.toFixed(2)}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
        <Shield className="h-3 w-3" /><span>Transaction sécurisée SSL</span>
      </div>
    </div>
  );
};

export default PermitPaymentStep;

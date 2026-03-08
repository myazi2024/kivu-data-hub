import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft, DollarSign, Phone } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface CancellationPaymentStepProps {
  requestReferenceNumber: string;
  totalAmount: number;
  paymentProvider: string;
  setPaymentProvider: (v: string) => void;
  paymentPhone: string;
  setPaymentPhone: (v: string) => void;
  loading: boolean;
  processingPayment: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

const CancellationPaymentStep: React.FC<CancellationPaymentStepProps> = ({
  requestReferenceNumber, totalAmount, paymentProvider, setPaymentProvider,
  paymentPhone, setPaymentPhone, loading, processingPayment, onBack, onSubmit
}) => (
  <div className="space-y-4">
    <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center gap-1 text-xs mb-2">
      <ArrowLeft className="h-3.5 w-3.5" /> Retour
    </Button>

    <Card className="rounded-2xl border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-800 dark:text-green-200">Paiement des frais</h3>
              <p className="text-xs text-green-600 dark:text-green-400">Réf: {requestReferenceNumber}</p>
            </div>
          </div>
          <span className="text-xl font-bold text-green-700 dark:text-green-400">{formatCurrency(totalAmount)}</span>
        </div>
      </CardContent>
    </Card>

    <Card className="rounded-2xl">
      <CardContent className="p-4 space-y-4">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" /> Paiement Mobile Money
        </Label>
        <Select value={paymentProvider} onValueChange={setPaymentProvider}>
          <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Sélectionnez un opérateur" /></SelectTrigger>
          <SelectContent className="rounded-xl bg-popover z-[1300]">
            <SelectItem value="mpesa">M-Pesa (Vodacom)</SelectItem>
            <SelectItem value="airtel">Airtel Money</SelectItem>
            <SelectItem value="orange">Orange Money</SelectItem>
          </SelectContent>
        </Select>
        <div className="space-y-1.5">
          <Label className="text-xs">Numéro de téléphone *</Label>
          <Input value={paymentPhone} onChange={(e) => setPaymentPhone(e.target.value)} placeholder="+243XXXXXXXXX" className="h-10 rounded-xl" />
          <p className="text-[10px] text-muted-foreground">Format: +243XXXXXXXXX ou 0XXXXXXXXX</p>
        </div>
      </CardContent>
    </Card>

    <Button onClick={onSubmit} disabled={loading || processingPayment} className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700">
      {(loading || processingPayment) ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Traitement en cours...</>
      ) : (
        <><Phone className="mr-2 h-4 w-4" /> Payer {formatCurrency(totalAmount)} et soumettre</>
      )}
    </Button>
  </div>
);

export default CancellationPaymentStep;

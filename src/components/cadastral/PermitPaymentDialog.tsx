import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { usePermitPayment, PermitFee } from '@/hooks/usePermitPayment';
import { Loader2, DollarSign, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PermitPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contributionId: string;
  permitType: 'construction' | 'regularization';
  onPaymentSuccess: () => void;
}

export function PermitPaymentDialog({
  open,
  onOpenChange,
  contributionId,
  permitType,
  onPaymentSuccess
}: PermitPaymentDialogProps) {
  const { loading, fees, fetchFees, createPayment } = usePermitPayment();
  const [selectedFees, setSelectedFees] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState('');

  useEffect(() => {
    if (open) {
      loadFees();
    }
  }, [open, permitType]);

  const loadFees = async () => {
    const loadedFees = await fetchFees(permitType);
    // Auto-sélectionner les frais obligatoires
    const mandatoryFeeIds = loadedFees
      .filter(f => f.is_mandatory)
      .map(f => f.id);
    setSelectedFees(mandatoryFeeIds);
  };

  const handleFeeToggle = (feeId: string, isMandatory: boolean) => {
    if (isMandatory) return; // Ne pas permettre de désélectionner les obligatoires
    
    setSelectedFees(prev =>
      prev.includes(feeId)
        ? prev.filter(id => id !== feeId)
        : [...prev, feeId]
    );
  };

  const getSelectedFeesData = (): PermitFee[] => {
    return fees.filter(f => selectedFees.includes(f.id));
  };

  const totalAmount = getSelectedFeesData().reduce((sum, fee) => sum + fee.amount_usd, 0);

  const handlePayment = async () => {
    if (!paymentMethod) {
      return;
    }

    if (paymentMethod === 'mobile_money' && (!phoneNumber || !provider)) {
      return;
    }

    const selectedFeesData = getSelectedFeesData();
    const result = await createPayment(
      contributionId,
      permitType,
      selectedFeesData,
      {
        payment_method: paymentMethod,
        payment_provider: provider,
        phone_number: phoneNumber
      }
    );

    if (result) {
      onPaymentSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Paiement des frais de permis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Liste des frais */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Frais à payer</Label>
            <div className="space-y-2">
              {fees.map((fee) => (
                <Card key={fee.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedFees.includes(fee.id)}
                      onCheckedChange={() => handleFeeToggle(fee.id, fee.is_mandatory)}
                      disabled={fee.is_mandatory}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{fee.fee_name}</p>
                          {fee.description && (
                            <p className="text-sm text-muted-foreground">{fee.description}</p>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                          <p className="font-bold flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {fee.amount_usd}
                          </p>
                          {fee.is_mandatory && (
                            <Badge variant="outline" className="text-xs">Obligatoire</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Total */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total à payer</span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-5 w-5" />
                {totalAmount.toFixed(2)} USD
              </span>
            </div>
          </div>

          <Separator />

          {/* Méthode de paiement */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Méthode de paiement</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="space-y-3">
                <Card className="p-3">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="mobile_money" id="mobile_money" />
                    <Label htmlFor="mobile_money" className="flex-1 cursor-pointer">
                      Mobile Money (M-Pesa, Orange Money, Airtel Money)
                    </Label>
                  </div>
                  {paymentMethod === 'mobile_money' && (
                    <div className="mt-3 space-y-3 pl-7">
                      <div>
                        <Label>Opérateur</Label>
                        <RadioGroup value={provider} onValueChange={setProvider} className="flex gap-4 mt-2">
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="mpesa" id="mpesa" />
                            <Label htmlFor="mpesa" className="cursor-pointer">M-Pesa</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="orange_money" id="orange_money" />
                            <Label htmlFor="orange_money" className="cursor-pointer">Orange Money</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="airtel_money" id="airtel_money" />
                            <Label htmlFor="airtel_money" className="cursor-pointer">Airtel Money</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div>
                        <Label>Numéro de téléphone</Label>
                        <Input
                          type="tel"
                          placeholder="+243 XXX XXX XXX"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                    <Label htmlFor="bank_transfer" className="flex-1 cursor-pointer">
                      Virement bancaire
                    </Label>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="flex-1 cursor-pointer">
                      Paiement au guichet
                    </Label>
                  </div>
                </Card>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handlePayment}
            disabled={loading || !paymentMethod || (paymentMethod === 'mobile_money' && (!phoneNumber || !provider))}
            className="gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Payer {totalAmount.toFixed(2)}$
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
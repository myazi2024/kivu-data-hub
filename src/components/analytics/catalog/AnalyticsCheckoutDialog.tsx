import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
import { useTestMode } from '@/hooks/useTestMode';
import MobileMoneyPayment from '@/components/payment/MobileMoneyPayment';
import { toast } from 'sonner';
const usd = (n: number) => `${n.toFixed(2)} USD`;

export default function AnalyticsCheckoutDialog({ checkout, onClose, onPaid }: { checkout: { invoiceId: string; total: number } | null; onClose: () => void; onPaid: () => void }) {
  const { availableMethods } = usePaymentConfig();
  const { isTestModeActive } = useTestMode();
  const [busy, setBusy] = useState(false);

  const payTest = async () => {
    if (!checkout) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('record-test-payment', { body: { kind: 'analytics_invoice', invoice_id: checkout.invoiceId } });
    setBusy(false);
    if (error || !data?.transaction_id) { toast.error('Paiement test refusé'); return; }
    onPaid();
  };

  const payCard = async () => {
    if (!checkout) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('create-payment', { body: { payment_type: 'analytics_access', invoice_id: checkout.invoiceId } });
    setBusy(false);
    if (error || !data?.url) { toast.error('Paiement par carte indisponible'); return; }
    window.location.href = data.url;
  };

  return (
    <Dialog open={!!checkout} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paiement</DialogTitle>
          <DialogDescription>Montant à régler : {checkout ? usd(checkout.total) : ''}</DialogDescription>
        </DialogHeader>
        {checkout && (
          <div className="space-y-4">
            {isTestModeActive && (
              <Button className="min-h-11 w-full" variant="secondary" disabled={busy} onClick={payTest}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simuler le paiement (mode test)
              </Button>
            )}
            {availableMethods.hasMobileMoney && (
              <MobileMoneyPayment
                item={{ id: checkout.invoiceId, title: 'Accès Données foncières', price: checkout.total }}
                currency="USD"
                paymentType="analytics_access"
                invoiceId={checkout.invoiceId}
                successMessage="Vos visuels sont maintenant disponibles"
                onPaymentSuccess={onPaid}
              />
            )}
            {availableMethods.hasBankCard && (
              <Button className="min-h-11 w-full" variant="outline" disabled={busy} onClick={payCard}>
                <CreditCard className="mr-2 h-4 w-4" />Payer par carte bancaire
              </Button>
            )}
            {!isTestModeActive && !availableMethods.hasAnyMethod && (
              <p className="text-sm text-muted-foreground">Aucun moyen de paiement n'est disponible pour le moment.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

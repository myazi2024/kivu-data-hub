import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePaymentProviders } from '@/hooks/usePaymentProviders';
import { pollTransactionStatus } from '@/utils/pollTransactionStatus';
import { PHONE_REGEX_DRC } from '@/components/cadastral/mortgage-cancellation/types';

interface Props {
  requestId: string;
  /** Montant fixé par le serveur à la création de la demande. */
  amountDue: number;
  onDone: () => void;
  /** Type de paiement (radiation par défaut). */
  paymentType?: 'mortgage_cancellation' | 'land_title_request';
}

/** Reprise du paiement (ou annulation) d'une demande restée en attente de paiement (radiation ou titre foncier). */
export const MortgageResumePayment: React.FC<Props> = ({ requestId, amountDue, onDone, paymentType = 'mortgage_cancellation' }) => {
  const { providers } = usePaymentProviders();
  const [provider, setProvider] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState<'pay' | 'cancel' | null>(null);

  const pay = async () => {
    const cleanPhone = phone.replace(/\s/g, '');
    if (!provider) { toast.error('Choisissez un opérateur'); return; }
    if (!PHONE_REGEX_DRC.test(cleanPhone)) { toast.error('Numéro de téléphone invalide'); return; }
    setBusy('pay');
    try {
      const { data, error } = await supabase.functions.invoke('process-mobile-money-payment', {
        body: { payment_provider: provider, phone_number: cleanPhone, amount_usd: amountDue, payment_type: paymentType, invoice_id: requestId },
      });
      if (error || !data?.success) { toast.error(data?.error || error?.message || 'Erreur lors du paiement'); return; }
      toast.info('Confirmez le paiement sur votre téléphone...');
      const result = await pollTransactionStatus(data.transaction_id);
      if (result === 'completed') { toast.success('Paiement confirmé'); onDone(); }
      else toast.error(result === 'failed' ? 'Le paiement a échoué' : "Délai d'attente dépassé.");
    } finally { setBusy(null); }
  };

  const cancel = async () => {
    setBusy('cancel');
    const { data: ok, error } = paymentType === 'land_title_request'
      ? await (supabase.rpc as any)('cancel_land_title_request', { p_request_id: requestId })
      : await (supabase.rpc as any)('cancel_mortgage_cancellation_request', { _id: requestId });
    if (!error && paymentType === 'land_title_request' && ok === false) { setBusy(null); toast.error("Cette demande n'est plus annulable"); return; }
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Demande annulée');
    onDone();
  };

  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <p className="text-xs font-medium">Paiement en attente : {amountDue.toFixed(2)} $</p>
      <Select value={provider} onValueChange={setProvider}>
        <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Opérateur Mobile Money" /></SelectTrigger>
        <SelectContent>
          {providers.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+243XXXXXXXXX" className="h-11 rounded-xl" />
      <div className="flex gap-2">
        <Button className="flex-1 h-11 rounded-xl" onClick={pay} disabled={!!busy}>
          {busy === 'pay' && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Reprendre le paiement
        </Button>
        <Button variant="outline" className="h-11 rounded-xl" onClick={cancel} disabled={!!busy}>Annuler</Button>
      </div>
    </div>
  );
};

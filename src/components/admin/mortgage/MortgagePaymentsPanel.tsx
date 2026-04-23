import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatCurrency } from '@/utils/formatters';

interface MortgagePayment {
  id: string;
  payment_date: string;
  payment_amount_usd: number;
  payment_type: string;
  payment_receipt_url: string | null;
}

interface Props {
  mortgageId: string;
  totalAmount: number;
}

export const MortgagePaymentsPanel: React.FC<Props> = ({ mortgageId, totalAmount }) => {
  const [payments, setPayments] = useState<MortgagePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [generatingReceipt, setGeneratingReceipt] = useState<string | null>(null);
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newType, setNewType] = useState('partial');

  const fetchPayments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cadastral_mortgage_payments')
      .select('id, payment_date, payment_amount_usd, payment_type, payment_receipt_url')
      .eq('mortgage_id', mortgageId)
      .order('payment_date', { ascending: false });
    if (error) toast.error('Erreur chargement paiements');
    else setPayments((data || []) as MortgagePayment[]);
    setLoading(false);
  };

  useEffect(() => { fetchPayments(); }, [mortgageId]);

  const handleAdd = async () => {
    const amt = parseFloat(newAmount);
    if (!amt || amt <= 0) { toast.error('Montant invalide'); return; }
    setAdding(true);
    const { error } = await supabase.from('cadastral_mortgage_payments').insert({
      mortgage_id: mortgageId,
      payment_amount_usd: amt,
      payment_date: newDate,
      payment_type: newType,
    });
    if (error) toast.error('Erreur ajout paiement');
    else {
      toast.success('Paiement enregistré');
      setNewAmount('');
      fetchPayments();
    }
    setAdding(false);
  };

  const handleGenerateReceipt = async (paymentId: string) => {
    setGeneratingReceipt(paymentId);
    try {
      const { data, error } = await supabase.rpc('generate_mortgage_receipt', {
        _mortgage_id: mortgageId,
        _payment_id: paymentId,
      });
      if (error) throw error;
      const code = (data as Array<{ verification_code?: string }> | null)?.[0]?.verification_code;
      if (code) {
        await navigator.clipboard.writeText(code).catch(() => {});
        toast.success(`Reçu généré : ${code} (copié)`);
      } else {
        toast.success('Reçu généré');
      }
    } catch (e: any) {
      toast.error(e.message || 'Erreur génération reçu');
    } finally {
      setGeneratingReceipt(null);
    }
  };

  const totalPaid = payments.reduce((s, p) => s + Number(p.payment_amount_usd || 0), 0);
  const remaining = Math.max(0, totalAmount - totalPaid);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
        <div className="p-1.5 rounded bg-primary/10 border border-primary/20">
          <p className="text-muted-foreground">Payé</p>
          <p className="font-semibold">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="p-1.5 rounded bg-secondary/40 border border-secondary">
          <p className="text-muted-foreground">Restant</p>
          <p className="font-semibold">{formatCurrency(remaining)}</p>
        </div>
        <div className="p-1.5 rounded bg-muted/50 border">
          <p className="text-muted-foreground">Échéances</p>
          <p className="font-semibold">{payments.length}</p>
        </div>
      </div>

      <div className="border rounded p-2 space-y-1.5 bg-muted/30">
        <p className="text-[10px] font-semibold text-muted-foreground">Ajouter un paiement</p>
        <div className="grid grid-cols-2 gap-1.5">
          <Input type="number" placeholder="Montant USD" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="h-7 text-xs" />
          <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-7 text-xs" />
        </div>
        <div className="flex gap-1.5">
          <Select value={newType} onValueChange={setNewType}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="partial">Partiel</SelectItem>
              <SelectItem value="full">Solde</SelectItem>
              <SelectItem value="interest">Intérêts</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAdd} disabled={adding} className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" /> Ajouter
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-[10px] text-muted-foreground">Chargement…</p>
      ) : payments.length === 0 ? (
        <p className="text-[10px] text-muted-foreground italic">Aucun paiement enregistré.</p>
      ) : (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-[10px] p-1.5 border rounded bg-card">
              <span>
                {format(new Date(p.payment_date), 'dd MMM yyyy', { locale: fr })} · <strong>{formatCurrency(p.payment_amount_usd)}</strong> · {p.payment_type}
              </span>
              <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => handleGenerateReceipt(p.id)} disabled={generatingReceipt === p.id}>
                {generatingReceipt === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileCheck className="h-3 w-3" />}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

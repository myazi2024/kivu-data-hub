import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, CalendarCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';

interface FiscalPeriod {
  id: string;
  year: number;
  month: number | null;
  period_type: string;
  status: 'open' | 'closed' | 'locked';
  closed_at: string | null;
  closed_by_name: string | null;
  revenue_total_usd: number;
  tva_collected_usd: number;
  invoice_count: number;
  credit_note_count: number;
  reopened_at: string | null;
  reopen_reason: string | null;
}

const monthLabel = (m: number | null) => m ? format(new Date(2000, m - 1, 1), 'MMMM') : 'Annuel';

const AdminFiscalPeriods = () => {
  const today = new Date();
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [closeYear, setCloseYear] = useState(today.getFullYear());
  const [closeMonth, setCloseMonth] = useState(today.getMonth()); // previous month index+1 -> use getMonth()=current-1 in 0-index, need month 1-12
  const [reopenReason, setReopenReason] = useState('');

  const fetchPeriods = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('fiscal_periods' as any)
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    if (error) toast.error(error.message);
    else setPeriods((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPeriods(); }, []);

  const handleClose = async () => {
    try {
      const { error } = await supabase.rpc('close_fiscal_period' as any, {
        p_year: closeYear, p_month: closeMonth,
      });
      if (error) throw error;
      toast.success(`Période ${closeYear}-${String(closeMonth).padStart(2, '0')} clôturée`);
      fetchPeriods();
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    }
  };

  const handleReopen = async (id: string) => {
    if (reopenReason.trim().length < 10) {
      toast.error('Motif requis (10 caractères minimum)');
      return;
    }
    try {
      const { error } = await supabase.rpc('reopen_fiscal_period' as any, {
        p_id: id, p_reason: reopenReason,
      });
      if (error) throw error;
      toast.success('Période réouverte');
      setReopenReason('');
      fetchPeriods();
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    }
  };

  const statusBadge = (s: string) => {
    if (s === 'closed') return <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" />Clôturée</Badge>;
    if (s === 'locked') return <Badge variant="destructive"><Lock className="h-3 w-3 mr-1" />Verrouillée</Badge>;
    return <Badge variant="outline"><Unlock className="h-3 w-3 mr-1" />Ouverte</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Périodes fiscales</h3>
          </div>
          <Button size="sm" variant="ghost" onClick={fetchPeriods} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Clôturer une période fige les revenus et la TVA collectée. Aucune nouvelle facture ne peut y être ajoutée après clôture.
        </p>
        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <Label>Année</Label>
            <Input type="number" value={closeYear} onChange={e => setCloseYear(+e.target.value)} />
          </div>
          <div>
            <Label>Mois</Label>
            <Input type="number" min={1} max={12} value={closeMonth} onChange={e => setCloseMonth(+e.target.value)} />
          </div>
          <Button size="sm" onClick={handleClose}>
            <Lock className="h-4 w-4 mr-1" />
            Clôturer
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-3">Historique</h4>
        {periods.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune période enregistrée.</p>
        ) : (
          <div className="space-y-2">
            {periods.map(p => (
              <div key={p.id} className="flex items-center justify-between border rounded p-3 text-xs">
                <div className="space-y-1">
                  <div className="font-medium text-sm">
                    {p.year} — {monthLabel(p.month)} {statusBadge(p.status)}
                  </div>
                  <div className="text-muted-foreground">
                    {p.invoice_count} factures · Revenus ${p.revenue_total_usd.toFixed(2)} · TVA ${p.tva_collected_usd.toFixed(2)}
                    {p.credit_note_count > 0 && ` · ${p.credit_note_count} avoirs`}
                  </div>
                  {p.closed_at && (
                    <div className="text-muted-foreground">
                      Clôturée {format(new Date(p.closed_at), 'dd/MM/yyyy HH:mm')} par {p.closed_by_name || '?'}
                    </div>
                  )}
                  {p.reopened_at && (
                    <div className="text-amber-600">
                      Réouverte {format(new Date(p.reopened_at), 'dd/MM/yyyy')} — {p.reopen_reason}
                    </div>
                  )}
                </div>
                {p.status === 'closed' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Unlock className="h-3 w-3 mr-1" />
                        Réouvrir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Réouvrir la période ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Action réservée aux super_admins. Le motif est conservé pour audit.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <Textarea
                        placeholder="Motif (10 caractères minimum)"
                        value={reopenReason}
                        onChange={e => setReopenReason(e.target.value)}
                      />
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleReopen(p.id)}>Confirmer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminFiscalPeriods;

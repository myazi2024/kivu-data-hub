import { useEffect, useState } from 'react';
import type { Json } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logBillingAudit } from '@/utils/billingAudit';
import { useAdminAnalytics } from '@/lib/adminAnalytics';
import type { MortgageFee } from '@/components/cadastral/mortgage-cancellation/types';
import { DEFAULT_MORTGAGE_CANCELLATION_FEES, normalizeMortgageFees } from '@/lib/mortgageFees';

type DisputeFee = {
  lifting_fee_usd: number;
};

const DEFAULT_DISPUTE: DisputeFee = { lifting_fee_usd: 30 };

export const MortgageDisputeFeesTab = () => {
  const { toast } = useToast();
  const { trackAdminAction } = useAdminAnalytics();
  const [loading, setLoading] = useState(false);
  const [mortgage, setMortgage] = useState<MortgageFee[]>(DEFAULT_MORTGAGE_CANCELLATION_FEES);
  const [dispute, setDispute] = useState<DisputeFee>(DEFAULT_DISPUTE);
  const [origMortgage, setOrigMortgage] = useState<MortgageFee[]>(DEFAULT_MORTGAGE_CANCELLATION_FEES);
  const [origDispute, setOrigDispute] = useState<DisputeFee>(DEFAULT_DISPUTE);

  const load = async () => {
    setLoading(true);
    try {
      const [mRes, dRes] = await Promise.all([
        supabase.from('cadastral_contribution_config')
          .select('config_value').eq('config_key', 'mortgage_cancellation_fees').eq('is_active', true).maybeSingle(),
        supabase.from('cadastral_contribution_config')
          .select('config_value').eq('config_key', 'dispute_lifting_fee').eq('is_active', true).maybeSingle(),
      ]);

      if (mRes.data?.config_value) {
        const fees = normalizeMortgageFees(mRes.data.config_value);
        setMortgage(fees);
        setOrigMortgage(fees);
      }
      if (dRes.data?.config_value) {
        const value = dRes.data.config_value as Partial<DisputeFee>;
        const loaded = { ...DEFAULT_DISPUTE, lifting_fee_usd: Number(value.lifting_fee_usd) || DEFAULT_DISPUTE.lifting_fee_usd };
        setDispute(loaded);
        setOrigDispute(loaded);
      }
    } catch (error) {
      console.error('[MortgageDisputeFees] load error', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async (key: 'mortgage_cancellation_fees' | 'dispute_lifting_fee', value: Json, oldValue: Json) => {
    try {
      const { data: existing, error: existingError } = await supabase
        .from('cadastral_contribution_config')
        .select('id').eq('config_key', key).maybeSingle();
      if (existingError) throw existingError;

      if (existing) {
        const { error } = await supabase
          .from('cadastral_contribution_config')
          .update({ config_value: value, is_active: true })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cadastral_contribution_config')
          .insert([{ config_key: key, config_value: value, is_active: true, description: key }]);
        if (error) throw error;
      }

      await logBillingAudit({
        tableName: 'cadastral_contribution_config',
        recordId: existing?.id ?? null,
        action: 'update',
        oldValues: { config_key: key, config_value: oldValue },
        newValues: { config_key: key, config_value: value },
      });
      toast({ title: 'Frais enregistrés', description: 'Configuration mise à jour' });
      trackAdminAction({ module: 'billing', action: 'update_fees_config', ref: { config_key: key } });
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sauvegarde impossible';
      console.error('[MortgageDisputeFees] save error', error);
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
    }
  };

  const updateFee = (id: string, patch: Partial<MortgageFee>) => {
    setMortgage(current => current.map(fee => fee.id === id ? { ...fee, ...patch } : fee));
  };

  const total = mortgage.reduce((sum, fee) => sum + (fee.is_mandatory || fee.id === 'verification' ? fee.amount_usd : 0), 0);

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Configurez le barème détaillé de radiation et les frais de levée de litige. Le barème de radiation est partagé avec le formulaire et recalculé côté serveur au paiement.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Frais de radiation d'hypothèque</CardTitle>
          <CardDescription className="text-xs">Les frais obligatoires sont toujours inclus ; les frais optionnels peuvent être sélectionnés par le demandeur.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            {mortgage.map((fee) => (
              <div key={fee.id} className="grid grid-cols-[minmax(0,1fr)_9rem] gap-3 items-end border-b border-border/50 pb-3 last:border-0">
                <div className="space-y-1">
                  <Label className="text-xs">{fee.name}{fee.is_mandatory ? ' — obligatoire' : ' — optionnel'}</Label>
                  <Input value={fee.description || ''} placeholder="Description du frais" onChange={(event) => updateFee(fee.id, { description: event.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Montant USD</Label>
                  <Input type="number" min="0" step="0.01" value={fee.amount_usd} onChange={(event) => updateFee(fee.id, { amount_usd: Number(event.target.value) || 0 })} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
            <span>Total affiché par défaut</span>
            <span>{total.toFixed(2)} USD</span>
          </div>
          <Button size="sm" onClick={() => void save('mortgage_cancellation_fees', mortgage, origMortgage)} disabled={loading}>
            <Save className="h-3.5 w-3.5 mr-1" /> Enregistrer
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Frais de levée de litige</CardTitle>
          <CardDescription className="text-xs">Appliqués lors d'une demande motivée de levée de litige foncier.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="max-w-xs space-y-1">
            <Label className="text-xs">Montant USD</Label>
            <Input type="number" min="0" step="0.01" value={dispute.lifting_fee_usd} onChange={(event) => setDispute({ lifting_fee_usd: Number(event.target.value) || 0 })} />
          </div>
          <Button size="sm" onClick={() => void save('dispute_lifting_fee', dispute, origDispute)} disabled={loading}>
            <Save className="h-3.5 w-3.5 mr-1" /> Enregistrer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MortgageDisputeFeesTab;

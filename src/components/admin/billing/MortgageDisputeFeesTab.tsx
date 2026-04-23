import { useState, useEffect } from 'react';
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

type MortgageFees = {
  base_fee_usd: number;
  urgent_fee_usd: number;
  notary_fee_usd: number;
};

type DisputeFee = {
  lifting_fee_usd: number;
};

const DEFAULT_MORTGAGE: MortgageFees = { base_fee_usd: 50, urgent_fee_usd: 100, notary_fee_usd: 25 };
const DEFAULT_DISPUTE: DisputeFee = { lifting_fee_usd: 30 };

export const MortgageDisputeFeesTab = () => {
  const { toast } = useToast();
  const { trackAdminAction } = useAdminAnalytics();
  const [loading, setLoading] = useState(false);
  const [mortgage, setMortgage] = useState<MortgageFees>(DEFAULT_MORTGAGE);
  const [dispute, setDispute] = useState<DisputeFee>(DEFAULT_DISPUTE);
  const [origMortgage, setOrigMortgage] = useState<MortgageFees>(DEFAULT_MORTGAGE);
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
        const m = { ...DEFAULT_MORTGAGE, ...(mRes.data.config_value as Partial<MortgageFees>) };
        setMortgage(m); setOrigMortgage(m);
      }
      if (dRes.data?.config_value) {
        const d = { ...DEFAULT_DISPUTE, ...(dRes.data.config_value as Partial<DisputeFee>) };
        setDispute(d); setOrigDispute(d);
      }
    } catch (e) {
      console.error('[MortgageDisputeFees] load error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (key: 'mortgage_cancellation_fees' | 'dispute_lifting_fee', value: any, oldValue: any) => {
    try {
      const { data: existing } = await supabase
        .from('cadastral_contribution_config')
        .select('id').eq('config_key', key).maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('cadastral_contribution_config')
          .update({ config_value: value, is_active: true })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cadastral_contribution_config')
          .insert({ config_key: key, config_value: value, is_active: true, description: key });
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
      trackAdminAction({
        module: 'billing',
        action: 'update_fees_config',
        ref: { config_key: key },
      });
      load();
    } catch (e: any) {
      console.error('[MortgageDisputeFees] save error', e);
      toast({ title: 'Erreur', description: e.message || 'Sauvegarde impossible', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Configurez ici les frais d'hypothèque (radiation) et de levée de litige. Ces valeurs sont stockées dans <code className="text-[10px]">cadastral_contribution_config</code> et utilisées par les services correspondants.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Frais de radiation d'hypothèque</CardTitle>
          <CardDescription className="text-xs">Appliqués lors d'une demande de radiation (RAD-…)</CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Frais de base (USD)</Label>
              <Input type="number" step="0.01" value={mortgage.base_fee_usd}
                onChange={(e) => setMortgage({ ...mortgage, base_fee_usd: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Traitement urgent (USD)</Label>
              <Input type="number" step="0.01" value={mortgage.urgent_fee_usd}
                onChange={(e) => setMortgage({ ...mortgage, urgent_fee_usd: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Frais de notaire (USD)</Label>
              <Input type="number" step="0.01" value={mortgage.notary_fee_usd}
                onChange={(e) => setMortgage({ ...mortgage, notary_fee_usd: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <Button size="sm" onClick={() => save('mortgage_cancellation_fees', mortgage, origMortgage)} disabled={loading}>
            <Save className="h-3.5 w-3.5 mr-1" /> Enregistrer
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Frais de levée de litige</CardTitle>
          <CardDescription className="text-xs">Appliqués lors d'une demande motivée de levée de litige foncier</CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Montant (USD)</Label>
              <Input type="number" step="0.01" value={dispute.lifting_fee_usd}
                onChange={(e) => setDispute({ ...dispute, lifting_fee_usd: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <Button size="sm" onClick={() => save('dispute_lifting_fee', dispute, origDispute)} disabled={loading}>
            <Save className="h-3.5 w-3.5 mr-1" /> Enregistrer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MortgageDisputeFeesTab;

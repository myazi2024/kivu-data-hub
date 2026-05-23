import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useSubdivisionPlanConfig, useUpdatePlanConfig } from '@/hooks/useSubdivisionPlanConfig';

export default function ReportProgramSection() {
  const { data: cfg } = useSubdivisionPlanConfig();
  const update = useUpdatePlanConfig();
  const [v, setV] = useState<any>({});
  const [footer, setFooter] = useState<any>({});

  useEffect(() => { if (cfg?.report_program) setV(cfg.report_program); }, [cfg]);
  useEffect(() => { if (cfg?.footer_text) setFooter(cfg.footer_text); }, [cfg]);

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Programme de signalement & pied de page</h3>
        <p className="text-sm text-muted-foreground">
          Imprimé sur le plan pour inciter le public à signaler les anomalies (vérification QR négative).
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Switch checked={!!v.active} onCheckedChange={c => setV({ ...v, active: c })} />
          <Label>Programme actif</Label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Numéro WhatsApp/Tel</Label>
            <Input value={v.whatsapp_number || ''} onChange={e => setV({ ...v, whatsapp_number: e.target.value })} />
          </div>
          <div>
            <Label>Montant récompense</Label>
            <Input type="number" value={v.reward_amount ?? 0} onChange={e => setV({ ...v, reward_amount: parseFloat(e.target.value) })} />
          </div>
          <div>
            <Label>Devise</Label>
            <Input value={v.reward_currency || 'USD'} onChange={e => setV({ ...v, reward_currency: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Texte (variables : {'{whatsapp}'}, {'{amount}'}, {'{currency}'})</Label>
          <Textarea
            rows={3}
            value={v.text_template || ''}
            onChange={e => setV({ ...v, text_template: e.target.value })}
          />
        </div>
        <Button onClick={() => update.mutate({ key: 'report_program', value: v })} disabled={update.isPending}>
          Enregistrer programme
        </Button>
      </div>

      <div className="border-t pt-4 space-y-3">
        <h4 className="font-medium">Mentions de pied de page</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Copyright</Label>
            <Input value={footer.copyright || ''} onChange={e => setFooter({ ...footer, copyright: e.target.value })} />
          </div>
          <div>
            <Label>Mention légale</Label>
            <Input value={footer.legal || ''} onChange={e => setFooter({ ...footer, legal: e.target.value })} />
          </div>
        </div>
        <Button onClick={() => update.mutate({ key: 'footer_text', value: footer })} disabled={update.isPending}>
          Enregistrer pied de page
        </Button>
      </div>
    </Card>
  );
}

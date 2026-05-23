import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useSubdivisionPlanConfig, useUpdatePlanConfig } from '@/hooks/useSubdivisionPlanConfig';

export default function IdentitySection() {
  const { data: cfg } = useSubdivisionPlanConfig();
  const update = useUpdatePlanConfig();
  const [v, setV] = useState<any>({});

  useEffect(() => { if (cfg?.header) setV(cfg.header); }, [cfg]);

  const set = (k: string, val: any) => setV((p: any) => ({ ...p, [k]: val }));

  return (
    <Card className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Identité & en-tête</h3>
      <p className="text-sm text-muted-foreground">
        Définit le bloc d'en-tête commun à tous les plans de lotissement générés.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Pays (ligne 1)</Label>
          <Input value={v.country || ''} onChange={e => set('country', e.target.value)} />
        </div>
        <div>
          <Label>Organisation (ligne 2)</Label>
          <Input value={v.organization || ''} onChange={e => set('organization', e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>Sous-titre</Label>
          <Input value={v.subtitle || ''} onChange={e => set('subtitle', e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>Gabarit du titre central</Label>
          <Input
            value={v.title_template || ''}
            onChange={e => set('title_template', e.target.value)}
            placeholder="PLAN DE LOTISSEMENT DE LA PARCELLE N° {parcel_number}"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Variables : <code>{'{parcel_number}'}</code>, <code>{'{reference_number}'}</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={!!v.show_logo} onCheckedChange={c => set('show_logo', c)} />
          <Label>Afficher le logo</Label>
        </div>
      </div>
      <Button onClick={() => update.mutate({ key: 'header', value: v })} disabled={update.isPending}>
        Enregistrer
      </Button>
    </Card>
  );
}

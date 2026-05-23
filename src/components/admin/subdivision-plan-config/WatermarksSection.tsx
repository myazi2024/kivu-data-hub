import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useSubdivisionPlanConfig, useUpdatePlanConfig } from '@/hooks/useSubdivisionPlanConfig';

const STATES = [
  { key: 'draft', label: 'BROUILLON (paiement reçu, en attente)' },
  { key: 'test', label: 'TEST (test_mode actif)' },
  { key: 'sample', label: 'SAMPLE (aperçu admin)' },
];

export default function WatermarksSection() {
  const { data: cfg } = useSubdivisionPlanConfig();
  const update = useUpdatePlanConfig();
  const [v, setV] = useState<any>({});
  useEffect(() => { if (cfg?.watermarks) setV(cfg.watermarks); }, [cfg]);

  const setState = (state: string, k: string, val: any) =>
    setV((p: any) => ({ ...p, [state]: { ...(p[state] || {}), [k]: val } }));

  return (
    <Card className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Filigranes par état</h3>
      <p className="text-sm text-muted-foreground">
        Le plan final approuvé est sans filigrane. Les autres états affichent un filigrane diagonal inamovible.
      </p>
      {STATES.map(s => (
        <div key={s.key} className="border-l-2 border-primary/30 pl-4 space-y-2">
          <Label className="text-sm font-medium">{s.label}</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Texte</Label>
              <Input value={v[s.key]?.text || ''} onChange={e => setState(s.key, 'text', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Couleur</Label>
              <Input type="color" value={v[s.key]?.color || '#999999'} onChange={e => setState(s.key, 'color', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Opacité (0–1)</Label>
              <Input
                type="number" step="0.01" min="0" max="1"
                value={v[s.key]?.opacity ?? 0.12}
                onChange={e => setState(s.key, 'opacity', parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>
      ))}
      <Button onClick={() => update.mutate({ key: 'watermarks', value: v })} disabled={update.isPending}>
        Enregistrer
      </Button>
    </Card>
  );
}

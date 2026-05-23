import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSubdivisionPlanConfig, useUpdatePlanConfig } from '@/hooks/useSubdivisionPlanConfig';
import { Trash2, Plus } from 'lucide-react';

export default function PaperFormatSection() {
  const { data: cfg } = useSubdivisionPlanConfig();
  const update = useUpdatePlanConfig();
  const [paper, setPaper] = useState<any>({});
  const [scale, setScale] = useState<any>({ tiers: [] });

  useEffect(() => { if (cfg?.paper_format) setPaper(cfg.paper_format); }, [cfg]);
  useEffect(() => { if (cfg?.scale_tiers) setScale(cfg.scale_tiers); }, [cfg]);

  const addTier = () => setScale({ ...scale, tiers: [...(scale.tiers || []), { max_dim_m: 1000, scale: 2000 }] });
  const updateTier = (i: number, k: string, v: number) => {
    const next = [...(scale.tiers || [])];
    next[i] = { ...next[i], [k]: v };
    setScale({ ...scale, tiers: next });
  };
  const delTier = (i: number) => setScale({ ...scale, tiers: scale.tiers.filter((_: any, j: number) => j !== i) });

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Format papier & échelle</h3>
        <p className="text-sm text-muted-foreground">
          Format par défaut + paliers d'échelle normalisée (snap automatique selon la plus grande dimension de la parcelle).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label>Format papier</Label>
          <Select value={paper.default || 'A3'} onValueChange={v => setPaper({ ...paper, default: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['A4', 'A3', 'A2', 'A1', 'A0'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Orientation</Label>
          <Select value={paper.orientation || 'landscape'} onValueChange={v => setPaper({ ...paper, orientation: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="landscape">Paysage</SelectItem>
              <SelectItem value="portrait">Portrait</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Marge (mm)</Label>
          <Input
            type="number" value={paper.margin_mm ?? 12}
            onChange={e => setPaper({ ...paper, margin_mm: parseInt(e.target.value, 10) })}
          />
        </div>
      </div>
      <Button onClick={() => update.mutate({ key: 'paper_format', value: paper })} disabled={update.isPending}>
        Enregistrer format
      </Button>

      <div className="border-t pt-4 space-y-2">
        <h4 className="font-medium">Paliers d'échelle</h4>
        {(scale.tiers || []).map((t: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-sm">Si dimension max ≤</span>
            <Input
              type="number" className="w-32"
              value={t.max_dim_m}
              onChange={e => updateTier(i, 'max_dim_m', parseInt(e.target.value, 10))}
            />
            <span className="text-sm">m → échelle 1:</span>
            <Input
              type="number" className="w-32"
              value={t.scale}
              onChange={e => updateTier(i, 'scale', parseInt(e.target.value, 10))}
            />
            <Button variant="ghost" size="icon" onClick={() => delTier(i)} aria-label="Supprimer">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addTier}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter un palier
        </Button>
        <div>
          <Button onClick={() => update.mutate({ key: 'scale_tiers', value: scale })} disabled={update.isPending}>
            Enregistrer paliers
          </Button>
        </div>
      </div>
    </Card>
  );
}

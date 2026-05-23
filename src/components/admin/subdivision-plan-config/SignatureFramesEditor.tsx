import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import {
  useSignatureFrames,
  useUpsertSignatureFrame,
  useDeleteSignatureFrame,
  type SignatureFrameRow,
} from '@/hooks/useSubdivisionPlanConfig';

const EMPTY: Partial<SignatureFrameRow> = {
  name: '', title_template: '', authority: '', applies_to: 'both',
  province_filter: [], display_order: 100, show_seal: true, active: true,
};

export default function SignatureFramesEditor() {
  const { data: frames = [] } = useSignatureFrames();
  const upsert = useUpsertSignatureFrame();
  const del = useDeleteSignatureFrame();
  const [draft, setDraft] = useState<Partial<SignatureFrameRow>>(EMPTY);

  return (
    <Card className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Cadres de signature dynamiques</h3>
      <p className="text-sm text-muted-foreground">
        Les cadres sont sélectionnés selon le contexte de la parcelle (urbain/rural) et son ordre d'affichage.
        Variables disponibles dans le titre : <code>{'{ville}'}</code>, <code>{'{commune}'}</code>,
        <code> {'{territoire}'}</code>, <code>{'{groupement}'}</code>, <code>{'{province}'}</code>.
      </p>

      <div className="space-y-2">
        {frames.map(f => (
          <div key={f.id} className="flex items-center gap-2 border rounded-md p-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{f.name}</span>
                <Badge variant="outline">{f.applies_to}</Badge>
                <Badge variant="secondary">#{f.display_order}</Badge>
                {!f.active && <Badge variant="destructive">Inactif</Badge>}
              </div>
              <p className="text-xs text-muted-foreground truncate">{f.title_template} — {f.authority}</p>
            </div>
            <Switch
              checked={f.active}
              onCheckedChange={c => upsert.mutate({ ...f, active: c })}
              aria-label="Actif"
            />
            <Button variant="ghost" size="icon" onClick={() => del.mutate(f.id)} aria-label="Supprimer">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 space-y-3">
        <h4 className="font-medium flex items-center gap-2"><Plus className="h-4 w-4" /> Nouveau cadre</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Nom</Label>
            <Input value={draft.name || ''} onChange={e => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <Label>Autorité</Label>
            <Input value={draft.authority || ''} onChange={e => setDraft({ ...draft, authority: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Gabarit du titre</Label>
            <Input
              value={draft.title_template || ''}
              onChange={e => setDraft({ ...draft, title_template: e.target.value })}
              placeholder="Approuvé par la ville de {ville}"
            />
          </div>
          <div>
            <Label>Contexte</Label>
            <Select
              value={draft.applies_to || 'both'}
              onValueChange={v => setDraft({ ...draft, applies_to: v as any })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="urban">Urbain</SelectItem>
                <SelectItem value="rural">Rural</SelectItem>
                <SelectItem value="both">Les deux</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ordre d'affichage</Label>
            <Input
              type="number"
              value={draft.display_order ?? 100}
              onChange={e => setDraft({ ...draft, display_order: parseInt(e.target.value, 10) })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={!!draft.show_seal} onCheckedChange={c => setDraft({ ...draft, show_seal: c })} />
            <Label>Afficher emplacement sceau</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={!!draft.active} onCheckedChange={c => setDraft({ ...draft, active: c })} />
            <Label>Actif</Label>
          </div>
        </div>
        <Button
          onClick={() => { upsert.mutate(draft); setDraft(EMPTY); }}
          disabled={!draft.name || !draft.title_template || upsert.isPending}
        >
          Ajouter le cadre
        </Button>
      </div>
    </Card>
  );
}

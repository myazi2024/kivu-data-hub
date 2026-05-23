import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import {
  useLegendSymbols,
  useUpsertLegendSymbol,
  useDeleteLegendSymbol,
  type LegendSymbolRow,
} from '@/hooks/useSubdivisionPlanConfig';

const ICON_TYPES = ['circle', 'line', 'hatch', 'arrow', 'square', 'triangle'];

const EMPTY: Partial<LegendSymbolRow> = {
  code: '', label: '', svg_icon: 'circle', color: '#000000',
  source_element_type: null, display_order: 100, active: true,
};

export default function LegendSymbolsEditor() {
  const { data: symbols = [] } = useLegendSymbols();
  const upsert = useUpsertLegendSymbol();
  const del = useDeleteLegendSymbol();
  const [draft, setDraft] = useState<Partial<LegendSymbolRow>>(EMPTY);

  return (
    <Card className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Symboles de légende</h3>
      <p className="text-sm text-muted-foreground">
        La légende est générée automatiquement d'après les éléments réellement présents sur le plan,
        en utilisant la correspondance via <code>source_element_type</code>.
      </p>

      <div className="space-y-2">
        {symbols.map(s => (
          <div key={s.id} className="flex items-center gap-2 border rounded-md p-3">
            <div
              className="h-6 w-6 rounded border"
              style={{ backgroundColor: s.color }}
              aria-hidden
            />
            <div className="flex-1">
              <div className="font-medium">{s.label}</div>
              <p className="text-xs text-muted-foreground">
                code: <code>{s.code}</code> · icône: {s.svg_icon}
                {s.source_element_type ? ` · auto si élément: ${s.source_element_type}` : ''}
              </p>
            </div>
            <Switch checked={s.active} onCheckedChange={c => upsert.mutate({ ...s, active: c })} />
            <Button variant="ghost" size="icon" onClick={() => del.mutate(s.id)} aria-label="Supprimer">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 space-y-3">
        <h4 className="font-medium flex items-center gap-2"><Plus className="h-4 w-4" /> Nouveau symbole</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Code (unique)</Label>
            <Input value={draft.code || ''} onChange={e => setDraft({ ...draft, code: e.target.value })} />
          </div>
          <div>
            <Label>Libellé</Label>
            <Input value={draft.label || ''} onChange={e => setDraft({ ...draft, label: e.target.value })} />
          </div>
          <div>
            <Label>Type d'icône</Label>
            <Select value={draft.svg_icon || 'circle'} onValueChange={v => setDraft({ ...draft, svg_icon: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ICON_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Couleur</Label>
            <Input type="color" value={draft.color || '#000000'} onChange={e => setDraft({ ...draft, color: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Type d'élément lié (auto-détection)</Label>
            <Input
              value={draft.source_element_type || ''}
              onChange={e => setDraft({ ...draft, source_element_type: e.target.value || null })}
              placeholder="ex: lampadaire, canal_evacuation, revetement"
            />
          </div>
          <div>
            <Label>Ordre</Label>
            <Input
              type="number" value={draft.display_order ?? 100}
              onChange={e => setDraft({ ...draft, display_order: parseInt(e.target.value, 10) })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={!!draft.active} onCheckedChange={c => setDraft({ ...draft, active: c })} />
            <Label>Actif</Label>
          </div>
        </div>
        <Button
          onClick={() => { upsert.mutate(draft); setDraft(EMPTY); }}
          disabled={!draft.code || !draft.label || upsert.isPending}
        >
          Ajouter le symbole
        </Button>
      </div>
    </Card>
  );
}

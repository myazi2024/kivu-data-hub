import { useState } from 'react';
import { useServiceSLA } from '@/hooks/useServiceSLA';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

export const SLAConfigPanel = () => {
  const { items, loading, update } = useServiceSLA();
  const [edits, setEdits] = useState<Record<string, { target_days: number; warning_days: number; critical_days: number }>>({});

  if (loading) return <p className="text-sm text-muted-foreground">Chargement SLA…</p>;

  const handleSave = async (id: string) => {
    const patch = edits[id];
    if (!patch) return;
    try {
      await update(id, patch);
      toast.success('SLA mis à jour');
      setEdits(p => { const n = { ...p }; delete n[id]; return n; });
    } catch (e: any) {
      toast.error(e.message || 'Erreur de mise à jour');
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">SLA par service</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {items.map(s => {
          const e = edits[s.id] || { target_days: s.target_days, warning_days: s.warning_days, critical_days: s.critical_days };
          const dirty = !!edits[s.id];
          return (
            <div key={s.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end p-3 border rounded-md">
              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground">Service</Label>
                <p className="text-sm font-medium">{s.service_label}</p>
              </div>
              <div>
                <Label className="text-xs">Cible (j)</Label>
                <Input type="number" value={e.target_days} onChange={ev => setEdits(p => ({ ...p, [s.id]: { ...e, target_days: +ev.target.value } }))} />
              </div>
              <div>
                <Label className="text-xs">Alerte (j)</Label>
                <Input type="number" value={e.warning_days} onChange={ev => setEdits(p => ({ ...p, [s.id]: { ...e, warning_days: +ev.target.value } }))} />
              </div>
              <div>
                <Label className="text-xs">Critique (j)</Label>
                <Input type="number" value={e.critical_days} onChange={ev => setEdits(p => ({ ...p, [s.id]: { ...e, critical_days: +ev.target.value } }))} />
              </div>
              {dirty && (
                <div className="md:col-span-5 flex justify-end">
                  <Button size="sm" onClick={() => handleSave(s.id)}><Save className="h-3 w-3 mr-1" /> Enregistrer</Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

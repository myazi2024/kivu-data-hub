import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

type Rule = {
  id: string;
  scope_type: 'reseller' | 'partner' | 'payment_method' | 'global';
  scope_id: string | null;
  scope_label: string | null;
  markup_pct: number;
  min_amount_usd: number;
  billing_cycle: 'monthly' | 'quarterly';
  active: boolean;
  notes: string | null;
  created_at: string;
};

type FormState = {
  scope_type: 'reseller' | 'partner' | 'payment_method' | 'global';
  scope_id: string;
  scope_label: string;
  markup_pct: number;
  min_amount_usd: number;
  billing_cycle: 'monthly' | 'quarterly';
  active: boolean;
  notes: string;
};

const emptyRule: FormState = {
  scope_type: 'global',
  scope_id: '',
  scope_label: '',
  markup_pct: 0,
  min_amount_usd: 10,
  billing_cycle: 'monthly',
  active: true,
  notes: '',
};

export const PassthroughRulesTab = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyRule);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, { count: number; total: number }>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('passthrough_rules' as never)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setRules((data ?? []) as Rule[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    const payload = {
      scope_type: form.scope_type,
      scope_id: form.scope_type === 'global' ? null : form.scope_id || null,
      scope_label: form.scope_label || null,
      markup_pct: Number(form.markup_pct),
      min_amount_usd: Number(form.min_amount_usd),
      billing_cycle: form.billing_cycle,
      active: form.active,
      notes: form.notes || null,
    };
    const { error } = await supabase.from('passthrough_rules' as never).insert(payload as never);
    if (error) { toast.error(error.message); return; }
    toast.success('Règle créée');
    setOpen(false);
    setForm(emptyRule);
    load();
  };

  const toggle = async (id: string, active: boolean) => {
    const { error } = await supabase.from('passthrough_rules' as never).update({ active } as never).eq('id', id);
    if (error) toast.error(error.message);
    else load();
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer cette règle ?')) return;
    const { error } = await supabase.from('passthrough_rules' as never).delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Supprimée'); load(); }
  };

  const preview = async (rule: Rule) => {
    setPreviewing(rule.id);
    const end = new Date();
    const start = new Date(); start.setDate(start.getDate() - 30);
    const { data, error } = await supabase.rpc('get_eligible_passthrough_transactions_count' as never, {
      p_scope_type: rule.scope_type,
      p_scope_id: rule.scope_id,
      p_period_start: start.toISOString().slice(0, 10),
      p_period_end: end.toISOString().slice(0, 10),
    } as never);
    setPreviewing(null);
    if (error) { toast.error(error.message); return; }
    const row = (data as Array<{ txn_count: number; total_fees_usd: number }> | null)?.[0];
    setPreviewData(prev => ({ ...prev, [rule.id]: { count: row?.txn_count ?? 0, total: Number(row?.total_fees_usd ?? 0) } }));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Règles de refacturation</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nouvelle règle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle règle pass-through</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Scope</Label>
                <Select value={form.scope_type} onValueChange={(v) => setForm({ ...form, scope_type: v as typeof form.scope_type })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (toutes transactions)</SelectItem>
                    <SelectItem value="reseller">Revendeur (ID)</SelectItem>
                    <SelectItem value="partner">Partenaire (ID dans metadata)</SelectItem>
                    <SelectItem value="payment_method">Méthode de paiement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.scope_type !== 'global' && (
                <div>
                  <Label>Scope ID</Label>
                  <Input value={form.scope_id} onChange={(e) => setForm({ ...form, scope_id: e.target.value })}
                    placeholder={form.scope_type === 'payment_method' ? 'mobile_money, visa, ...' : 'UUID'} />
                </div>
              )}
              <div>
                <Label>Libellé (affichage)</Label>
                <Input value={form.scope_label} onChange={(e) => setForm({ ...form, scope_label: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Markup %</Label>
                  <Input type="number" step="0.1" min="0" max="100" value={form.markup_pct}
                    onChange={(e) => setForm({ ...form, markup_pct: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Seuil min (USD)</Label>
                  <Input type="number" step="0.01" min="0" value={form.min_amount_usd}
                    onChange={(e) => setForm({ ...form, min_amount_usd: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Cycle</Label>
                <Select value={form.billing_cycle} onValueChange={(v) => setForm({ ...form, billing_cycle: v as 'monthly' | 'quarterly' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                    <SelectItem value="quarterly">Trimestriel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={save}>Créer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Chargement…</p>
        ) : rules.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune règle. Crée une règle pour démarrer la refacturation.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scope</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead className="text-right">Markup</TableHead>
                <TableHead className="text-right">Seuil</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Preview 30j</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map(r => (
                <TableRow key={r.id}>
                  <TableCell><Badge variant="outline">{r.scope_type}</Badge>{r.scope_id && <span className="ml-2 text-xs text-muted-foreground">{r.scope_id.slice(0, 8)}</span>}</TableCell>
                  <TableCell>{r.scope_label ?? '—'}</TableCell>
                  <TableCell className="text-right">{r.markup_pct}%</TableCell>
                  <TableCell className="text-right">${r.min_amount_usd}</TableCell>
                  <TableCell>{r.billing_cycle}</TableCell>
                  <TableCell><Switch checked={r.active} onCheckedChange={(v) => toggle(r.id, v)} /></TableCell>
                  <TableCell>
                    {previewData[r.id] ? (
                      <span className="text-xs">{previewData[r.id].count} txn · ${previewData[r.id].total.toFixed(2)}</span>
                    ) : (
                      <Button variant="ghost" size="sm" disabled={previewing === r.id} onClick={() => preview(r)}>
                        <Eye className="h-3 w-3 mr-1" />{previewing === r.id ? '…' : 'Estimer'}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import { untypedTables } from '@/integrations/supabase/untyped';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, ListTree, Info } from 'lucide-react';
import { invalidateSubdivisionReferencesCache, type SubdivisionReferenceCategory, type SubdivisionReferenceEntry } from '@/hooks/useSubdivisionReferences';

const CATEGORIES: Array<{
  value: SubdivisionReferenceCategory;
  label: string;
  description: string;
  showColor?: boolean;
  showSection?: boolean;
  showExtraCost?: boolean;
  showMinPct?: boolean;
  showMinWidth?: boolean;
  showRequired?: boolean;
}> = [
  { value: 'purpose', label: 'Objets de la demande', description: 'Raisons proposées dans le formulaire (vente, succession, etc.)' },
  { value: 'requester_type', label: 'Types de demandeur', description: 'Profils autorisés à initier une demande (propriétaire, mandataire…)' },
  { value: 'lot_use', label: 'Usages de lot', description: 'Vocations possibles d\'un lot (résidentiel, commercial…)', showColor: true, showSection: true },
  { value: 'road_surface', label: 'Surfaces de voies', description: 'Revêtements des voies internes', showExtraCost: true },
  { value: 'common_space_type', label: 'Espaces communs', description: 'Catégories d\'espaces partagés (espace vert, parking…)', showColor: true, showMinPct: true },
  { value: 'servitude_type', label: 'Servitudes', description: 'Types de servitudes inscriptibles au plan', showMinWidth: true, showRequired: true },
  { value: 'fence_type', label: 'Types de clôture', description: 'Clôtures déclarables sur un lot bâti' },
  { value: 'construction_type', label: 'Types de construction', description: 'Constructions déclarables sur un lot bâti' },
];

interface FormState {
  key: string;
  label: string;
  color: string;
  applies_to_section: '' | 'urban' | 'rural';
  extra_cost_per_unit_usd: string;
  min_pct: string;
  min_width_m: string;
  is_required: boolean;
  ordering: string;
  is_active: boolean;
  notes: string;
}

const emptyForm: FormState = {
  key: '', label: '', color: '', applies_to_section: '',
  extra_cost_per_unit_usd: '', min_pct: '', min_width_m: '',
  is_required: false, ordering: '0', is_active: true, notes: '',
};

const AdminSubdivisionReferences: React.FC = () => {
  const [activeCat, setActiveCat] = useState<SubdivisionReferenceCategory>('purpose');
  const [entries, setEntries] = useState<SubdivisionReferenceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubdivisionReferenceEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const meta = useMemo(() => CATEGORIES.find(c => c.value === activeCat)!, [activeCat]);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await untypedTables
      .subdivision_reference_lists()
      .select('*')
      .eq('category', activeCat)
      .order('ordering');
    if (error) {
      toast.error('Erreur de chargement');
      console.error(error);
    } else {
      setEntries((data as SubdivisionReferenceEntry[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); /* eslint-disable-next-line */ }, [activeCat]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, ordering: String(entries.length + 1) });
    setDialogOpen(true);
  };

  const openEdit = (e: SubdivisionReferenceEntry) => {
    setEditing(e);
    setForm({
      key: e.key,
      label: e.label,
      color: e.color ?? '',
      applies_to_section: (e.applies_to_section as '' | 'urban' | 'rural') ?? '',
      extra_cost_per_unit_usd: e.extra_cost_per_unit_usd != null ? String(e.extra_cost_per_unit_usd) : '',
      min_pct: e.min_pct != null ? String(e.min_pct) : '',
      min_width_m: e.min_width_m != null ? String(e.min_width_m) : '',
      is_required: e.is_required,
      ordering: String(e.ordering),
      is_active: e.is_active,
      notes: e.notes ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const key = form.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!key) return toast.error('Identifiant requis');
    if (!form.label.trim()) return toast.error('Libellé requis');

    setSaving(true);
    const payload: Record<string, unknown> = {
      category: activeCat,
      key,
      label: form.label.trim(),
      color: form.color.trim() || null,
      applies_to_section: form.applies_to_section || null,
      extra_cost_per_unit_usd: form.extra_cost_per_unit_usd ? parseFloat(form.extra_cost_per_unit_usd) : null,
      min_pct: form.min_pct ? parseFloat(form.min_pct) : null,
      min_width_m: form.min_width_m ? parseFloat(form.min_width_m) : null,
      is_required: form.is_required,
      ordering: parseInt(form.ordering) || 0,
      is_active: form.is_active,
      notes: form.notes.trim() || null,
    };

    const { error } = editing
      ? await untypedTables.subdivision_reference_lists().update(payload).eq('id', editing.id)
      : await untypedTables.subdivision_reference_lists().insert(payload);

    setSaving(false);
    if (error) {
      toast.error(error.message?.includes('unique') ? 'Cet identifiant existe déjà' : `Erreur: ${error.message}`);
      return;
    }
    toast.success(editing ? 'Référence mise à jour' : 'Référence ajoutée');
    invalidateSubdivisionReferencesCache();
    setDialogOpen(false);
    fetchEntries();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await untypedTables.subdivision_reference_lists().delete().eq('id', deleteId);
    if (error) {
      toast.error(`Suppression impossible: ${error.message}`);
    } else {
      toast.success('Référence supprimée');
      invalidateSubdivisionReferencesCache();
      fetchEntries();
    }
    setDeleteId(null);
  };

  const toggleActive = async (e: SubdivisionReferenceEntry) => {
    const { error } = await untypedTables.subdivision_reference_lists()
      .update({ is_active: !e.is_active }).eq('id', e.id);
    if (error) toast.error(error.message);
    else {
      invalidateSubdivisionReferencesCache();
      fetchEntries();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTree className="h-5 w-5 text-primary" />
          Référentiels du formulaire de lotissement
        </CardTitle>
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          Gérez ici toutes les listes déroulantes proposées dans le formulaire utilisateur. Les modifications sont prises en compte immédiatement (cache: 5 min).
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeCat} onValueChange={(v) => setActiveCat(v as SubdivisionReferenceCategory)}>
          <TabsList className="flex flex-wrap h-auto gap-1 p-1">
            {CATEGORIES.map(c => (
              <TabsTrigger key={c.value} value={c.value} className="text-xs">{c.label}</TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map(c => (
            <TabsContent key={c.value} value={c.value} className="mt-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <p className="text-sm text-muted-foreground max-w-xl">{c.description}</p>
                <Button size="sm" onClick={openAdd}>
                  <Plus className="h-4 w-4 mr-1" /> Ajouter
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement…
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground border rounded-md border-dashed">
                  Aucune entrée — cliquez sur « Ajouter » pour créer la première.
                </div>
              ) : (
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Identifiant</TableHead>
                        <TableHead>Libellé</TableHead>
                        {meta.showColor && <TableHead>Couleur</TableHead>}
                        {meta.showSection && <TableHead>Section</TableHead>}
                        {meta.showExtraCost && <TableHead className="text-right">Surcoût $/ml</TableHead>}
                        {meta.showMinPct && <TableHead className="text-right">% min</TableHead>}
                        {meta.showMinWidth && <TableHead className="text-right">Largeur min (m)</TableHead>}
                        {meta.showRequired && <TableHead>Obligatoire</TableHead>}
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map(e => (
                        <TableRow key={e.id}>
                          <TableCell className="font-mono text-xs">{e.ordering}</TableCell>
                          <TableCell className="font-mono text-xs">{e.key}</TableCell>
                          <TableCell className="font-medium">{e.label}</TableCell>
                          {meta.showColor && (
                            <TableCell>
                              {e.color && (
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-block h-4 w-4 rounded border" style={{ backgroundColor: e.color }} />
                                  <span className="text-xs font-mono">{e.color}</span>
                                </div>
                              )}
                            </TableCell>
                          )}
                          {meta.showSection && <TableCell>{e.applies_to_section ?? <span className="text-muted-foreground">Toutes</span>}</TableCell>}
                          {meta.showExtraCost && <TableCell className="text-right font-mono">{e.extra_cost_per_unit_usd ?? '—'}</TableCell>}
                          {meta.showMinPct && <TableCell className="text-right font-mono">{e.min_pct ?? '—'}</TableCell>}
                          {meta.showMinWidth && <TableCell className="text-right font-mono">{e.min_width_m ?? '—'}</TableCell>}
                          {meta.showRequired && <TableCell>{e.is_required ? <Badge>Oui</Badge> : <span className="text-muted-foreground text-xs">Non</span>}</TableCell>}
                          <TableCell>
                            <Switch checked={e.is_active} onCheckedChange={() => toggleActive(e)} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(e)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(e.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier' : 'Ajouter'} — {meta.label}</DialogTitle>
            <DialogDescription className="text-xs">{meta.description}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-1">
              <Label className="text-xs">Identifiant (clé technique)</Label>
              <Input
                value={form.key}
                onChange={e => setForm(f => ({ ...f, key: e.target.value }))}
                placeholder="ex: green_space"
                disabled={!!editing}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Lettres/chiffres/underscore. Non modifiable après création.</p>
            </div>
            <div className="col-span-1">
              <Label className="text-xs">Libellé affiché</Label>
              <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="ex: Espace vert" />
            </div>
            <div className="col-span-1">
              <Label className="text-xs">Ordre</Label>
              <Input type="number" value={form.ordering} onChange={e => setForm(f => ({ ...f, ordering: e.target.value }))} />
            </div>
            <div className="col-span-1 flex items-end gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label className="text-xs">Actif</Label>
            </div>

            {meta.showColor && (
              <div className="col-span-1">
                <Label className="text-xs">Couleur (hex)</Label>
                <div className="flex gap-1.5 items-center">
                  <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="#22c55e" className="font-mono text-xs" />
                  {form.color && <span className="inline-block h-7 w-7 rounded border shrink-0" style={{ backgroundColor: form.color }} />}
                </div>
              </div>
            )}
            {meta.showSection && (
              <div className="col-span-1">
                <Label className="text-xs">Section concernée</Label>
                <Select value={form.applies_to_section || '__all__'} onValueChange={v => setForm(f => ({ ...f, applies_to_section: v === '__all__' ? '' : (v as 'urban' | 'rural') }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Toutes (urbain + rural)</SelectItem>
                    <SelectItem value="urban">Urbain uniquement</SelectItem>
                    <SelectItem value="rural">Rural uniquement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {meta.showExtraCost && (
              <div className="col-span-1">
                <Label className="text-xs">Surcoût $/ml (optionnel)</Label>
                <Input type="number" step="0.01" value={form.extra_cost_per_unit_usd} onChange={e => setForm(f => ({ ...f, extra_cost_per_unit_usd: e.target.value }))} placeholder="ex: 5" />
              </div>
            )}
            {meta.showMinPct && (
              <div className="col-span-1">
                <Label className="text-xs">% minimum (optionnel)</Label>
                <Input type="number" step="0.5" value={form.min_pct} onChange={e => setForm(f => ({ ...f, min_pct: e.target.value }))} placeholder="ex: 5" />
              </div>
            )}
            {meta.showMinWidth && (
              <div className="col-span-1">
                <Label className="text-xs">Largeur min (m, optionnel)</Label>
                <Input type="number" step="0.5" value={form.min_width_m} onChange={e => setForm(f => ({ ...f, min_width_m: e.target.value }))} placeholder="ex: 3" />
              </div>
            )}
            {meta.showRequired && (
              <div className="col-span-1 flex items-end gap-2">
                <Switch checked={form.is_required} onCheckedChange={v => setForm(f => ({ ...f, is_required: v }))} />
                <Label className="text-xs">Servitude obligatoire</Label>
              </div>
            )}

            <div className="col-span-2">
              <Label className="text-xs">Notes internes (optionnel)</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les demandes existantes utilisant cette valeur conserveront leur référence mais elle ne sera plus proposée aux nouveaux demandeurs.
              Pour préserver l'historique, vous pouvez plutôt désactiver l'entrée (interrupteur dans la colonne « Statut »).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default AdminSubdivisionReferences;

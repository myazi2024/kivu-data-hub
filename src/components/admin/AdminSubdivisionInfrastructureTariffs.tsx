import React, { useState, useEffect } from 'react';
import { untypedTables, asUntypedPayload } from '@/integrations/supabase/untyped';
import { invalidateInfrastructureTariffsCache, type InfrastructureTariff, type InfrastructureCategory, type InfrastructureUnit } from '@/hooks/useSubdivisionInfrastructureTariffs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Building2 } from 'lucide-react';

const CATEGORIES: { value: InfrastructureCategory; label: string }[] = [
  { value: 'voirie', label: 'Voirie' },
  { value: 'amenagement', label: 'Aménagement' },
  { value: 'reseau', label: 'Réseau' },
  { value: 'equipement', label: 'Équipement' },
];

const UNITS: { value: InfrastructureUnit; label: string }[] = [
  { value: 'linear_m', label: 'Mètre linéaire' },
  { value: 'sqm', label: 'm²' },
  { value: 'unit', label: 'Unité' },
  { value: 'lot', label: 'Lot' },
];

interface FormState {
  infrastructure_key: string;
  label: string;
  category: InfrastructureCategory;
  unit: InfrastructureUnit;
  rate_usd: string;
  section_type: '' | 'urban' | 'rural';
  min_total_usd: string;
  max_total_usd: string;
  is_required: boolean;
  is_active: boolean;
  display_order: string;
  description: string;
}

const emptyForm: FormState = {
  infrastructure_key: '',
  label: '',
  category: 'voirie',
  unit: 'linear_m',
  rate_usd: '0',
  section_type: '',
  min_total_usd: '',
  max_total_usd: '',
  is_required: false,
  is_active: true,
  display_order: '0',
  description: '',
};

const AdminSubdivisionInfrastructureTariffs: React.FC = () => {
  const [items, setItems] = useState<InfrastructureTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InfrastructureTariff | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await untypedTables.subdivision_infrastructure_tariffs()
      .select('*')
      .order('category')
      .order('display_order');
    if (error) {
      toast.error('Erreur de chargement');
      console.error(error);
    } else {
      setItems((data as InfrastructureTariff[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (it: InfrastructureTariff) => {
    setEditing(it);
    setForm({
      infrastructure_key: it.infrastructure_key,
      label: it.label,
      category: it.category,
      unit: it.unit,
      rate_usd: String(it.rate_usd),
      section_type: (it.section_type as '' | 'urban' | 'rural') ?? '',
      min_total_usd: it.min_total_usd != null ? String(it.min_total_usd) : '',
      max_total_usd: it.max_total_usd != null ? String(it.max_total_usd) : '',
      is_required: it.is_required,
      is_active: it.is_active,
      display_order: String(it.display_order),
      description: it.description ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.infrastructure_key.trim() || !form.label.trim()) {
      toast.error('Clé et libellé requis');
      return;
    }
    setSaving(true);
    const payload = asUntypedPayload({
      infrastructure_key: form.infrastructure_key.trim(),
      label: form.label.trim(),
      category: form.category,
      unit: form.unit,
      rate_usd: parseFloat(form.rate_usd) || 0,
      section_type: form.section_type || null,
      min_total_usd: form.min_total_usd ? parseFloat(form.min_total_usd) : null,
      max_total_usd: form.max_total_usd ? parseFloat(form.max_total_usd) : null,
      is_required: form.is_required,
      is_active: form.is_active,
      display_order: parseInt(form.display_order) || 0,
      description: form.description.trim() || null,
      updated_at: new Date().toISOString(),
    });

    const q = untypedTables.subdivision_infrastructure_tariffs();
    const { error } = editing
      ? await q.update(payload).eq('id', editing.id)
      : await q.insert(payload);

    if (error) {
      toast.error(error.message?.includes('duplicate') ? 'Cette clé existe déjà pour ce type de section' : 'Erreur de sauvegarde');
      console.error(error);
    } else {
      toast.success(editing ? 'Tarif mis à jour' : 'Tarif ajouté');
      invalidateInfrastructureTariffsCache();
      setDialogOpen(false);
      fetchItems();
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await untypedTables.subdivision_infrastructure_tariffs().delete().eq('id', deleteId);
    if (error) toast.error('Suppression impossible');
    else {
      toast.success('Tarif supprimé');
      invalidateInfrastructureTariffsCache();
      fetchItems();
    }
    setDeleteId(null);
  };

  const toggleActive = async (it: InfrastructureTariff) => {
    const { error } = await untypedTables.subdivision_infrastructure_tariffs()
      .update(asUntypedPayload({ is_active: !it.is_active, updated_at: new Date().toISOString() }))
      .eq('id', it.id);
    if (!error) {
      invalidateInfrastructureTariffsCache();
      fetchItems();
    }
  };

  const unitLabel = (u: InfrastructureUnit) => UNITS.find(x => x.value === u)?.label ?? u;
  const catLabel = (c: InfrastructureCategory) => CATEGORIES.find(x => x.value === c)?.label ?? c;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Tarifs par type d'infrastructure
          </CardTitle>
          <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Surcharges optionnelles appliquées aux projets de lotissement selon les infrastructures déclarées.
            Le calcul s'ajoute au tarif de base par lot/voirie/espaces communs.
          </p>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead>Clé</TableHead>
                    <TableHead className="text-right">Tarif (USD)</TableHead>
                    <TableHead>Unité</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Obligatoire</TableHead>
                    <TableHead>Actif</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(it => (
                    <TableRow key={it.id}>
                      <TableCell><Badge variant="outline">{catLabel(it.category)}</Badge></TableCell>
                      <TableCell className="font-medium">{it.label}</TableCell>
                      <TableCell><code className="text-xs">{it.infrastructure_key}</code></TableCell>
                      <TableCell className="text-right font-mono">${Number(it.rate_usd).toFixed(2)}</TableCell>
                      <TableCell className="text-xs">{unitLabel(it.unit)}</TableCell>
                      <TableCell className="text-xs">{it.section_type ? (it.section_type === 'urban' ? 'Urbain' : 'Rural') : 'Tous'}</TableCell>
                      <TableCell>{it.is_required ? <Badge>Requis</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                      <TableCell><Switch checked={it.is_active} onCheckedChange={() => toggleActive(it)} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(it)}><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(it.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Aucun tarif d'infrastructure configuré</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le tarif' : 'Nouveau tarif'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Clé technique</Label>
                <Input value={form.infrastructure_key} onChange={e => setForm(f => ({ ...f, infrastructure_key: e.target.value }))} placeholder="ex: road_primary" disabled={!!editing} />
              </div>
              <div>
                <Label>Libellé</Label>
                <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as InfrastructureCategory }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unité</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v as InfrastructureUnit }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Section</Label>
                <Select value={form.section_type || 'all'} onValueChange={v => setForm(f => ({ ...f, section_type: v === 'all' ? '' : v as 'urban' | 'rural' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous types</SelectItem>
                    <SelectItem value="urban">Urbain</SelectItem>
                    <SelectItem value="rural">Rural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Tarif unitaire (USD)</Label>
                <Input type="number" step="0.01" value={form.rate_usd} onChange={e => setForm(f => ({ ...f, rate_usd: e.target.value }))} />
              </div>
              <div>
                <Label>Min total (USD)</Label>
                <Input type="number" step="0.01" value={form.min_total_usd} onChange={e => setForm(f => ({ ...f, min_total_usd: e.target.value }))} placeholder="Optionnel" />
              </div>
              <div>
                <Label>Max total (USD)</Label>
                <Input type="number" step="0.01" value={form.max_total_usd} onChange={e => setForm(f => ({ ...f, max_total_usd: e.target.value }))} placeholder="Optionnel" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <div>
                <Label>Ordre</Label>
                <Input type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch checked={form.is_required} onCheckedChange={v => setForm(f => ({ ...f, is_required: v }))} />
                <Label>Obligatoire</Label>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <Label>Actif</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce tarif ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminSubdivisionInfrastructureTariffs;

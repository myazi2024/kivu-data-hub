import React, { useEffect, useState } from 'react';
import { untypedTables } from '@/integrations/supabase/untyped';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, MapPin, Compass, Ruler, Tag, Layers } from 'lucide-react';
import {
  invalidateSubdivisionPlanElementsCache,
  type SubdivisionPlanElement,
} from '@/hooks/useSubdivisionPlanElements';

const CATEGORIES: { value: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'cartouche', label: 'Cartouche', icon: Tag },
  { value: 'symboles', label: 'Symboles', icon: Compass },
  { value: 'cotation', label: 'Cotation', icon: Ruler },
  { value: 'legende', label: 'Légende', icon: Layers },
  { value: 'general', label: 'Général', icon: MapPin },
];

interface FormState {
  element_key: string;
  label: string;
  description: string;
  category: string;
  is_required: boolean;
  is_active: boolean;
  display_order: string;
  validation_rule: string;
}

const emptyForm: FormState = {
  element_key: '',
  label: '',
  description: '',
  category: 'general',
  is_required: true,
  is_active: true,
  display_order: '0',
  validation_rule: '',
};

const AdminSubdivisionPlanElements: React.FC = () => {
  const [items, setItems] = useState<SubdivisionPlanElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubdivisionPlanElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const { data, error } = await untypedTables
      .subdivision_plan_elements()
      .select('*')
      .order('display_order');
    if (error) {
      toast.error('Erreur de chargement');
      console.error(error);
    } else {
      setItems((data as SubdivisionPlanElement[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (it: SubdivisionPlanElement) => {
    setEditing(it);
    setForm({
      element_key: it.element_key,
      label: it.label,
      description: it.description ?? '',
      category: it.category,
      is_required: it.is_required,
      is_active: it.is_active,
      display_order: String(it.display_order),
      validation_rule: it.validation_rule ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.element_key.trim() || !form.label.trim()) {
      toast.error('Clé et libellé obligatoires');
      return;
    }
    setSaving(true);
    const payload = {
      element_key: form.element_key.trim(),
      label: form.label.trim(),
      description: form.description.trim() || null,
      category: form.category,
      is_required: form.is_required,
      is_active: form.is_active,
      display_order: parseInt(form.display_order, 10) || 0,
      validation_rule: form.validation_rule.trim() || null,
    };
    const q = editing
      ? untypedTables.subdivision_plan_elements().update(payload).eq('id', editing.id)
      : untypedTables.subdivision_plan_elements().insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) {
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
      return;
    }
    toast.success(editing ? 'Élément mis à jour' : 'Élément créé');
    invalidateSubdivisionPlanElementsCache();
    setDialogOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await untypedTables
      .subdivision_plan_elements()
      .delete()
      .eq('id', deleteId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Élément supprimé');
      invalidateSubdivisionPlanElementsCache();
      fetchAll();
    }
    setDeleteId(null);
  };

  const toggleActive = async (it: SubdivisionPlanElement) => {
    const { error } = await untypedTables
      .subdivision_plan_elements()
      .update({ is_active: !it.is_active })
      .eq('id', it.id);
    if (error) {
      toast.error(error.message);
    } else {
      invalidateSubdivisionPlanElementsCache();
      fetchAll();
    }
  };

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    list: items.filter(i => i.category === cat.value),
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" />
              Éléments obligatoires du plan de lotissement
            </CardTitle>
            <CardDescription>
              Configurez les composants requis sur tout plan officiel : flèche du Nord, échelles,
              légende, cotation, cartouche, etc. Les éléments actifs et requis sont vérifiés
              avant approbation et apparaissent dans le PDF généré.
            </CardDescription>
          </div>
          <Button onClick={openCreate} size="sm" className="shrink-0">
            <Plus className="h-4 w-4 mr-1" /> Nouvel élément
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(group => {
                const Icon = group.icon;
                if (group.list.length === 0) return null;
                return (
                  <div key={group.value}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                        {group.label}
                      </h3>
                      <Badge variant="outline" className="ml-1">{group.list.length}</Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Élément</TableHead>
                          <TableHead className="hidden md:table-cell">Clé</TableHead>
                          <TableHead className="text-center">Requis</TableHead>
                          <TableHead className="text-center">Actif</TableHead>
                          <TableHead className="text-center">Ordre</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.list.map(it => (
                          <TableRow key={it.id}>
                            <TableCell>
                              <div className="font-medium">{it.label}</div>
                              {it.description && (
                                <div className="text-xs text-muted-foreground">{it.description}</div>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{it.element_key}</code>
                            </TableCell>
                            <TableCell className="text-center">
                              {it.is_required ? (
                                <Badge variant="destructive">Obligatoire</Badge>
                              ) : (
                                <Badge variant="secondary">Optionnel</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch checked={it.is_active} onCheckedChange={() => toggleActive(it)} />
                            </TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">
                              {it.display_order}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(it)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteId(it.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier l\'élément' : 'Nouvel élément de plan'}</DialogTitle>
            <DialogDescription>
              Définissez un composant attendu sur le plan officiel de lotissement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Clé technique *</Label>
                <Input
                  value={form.element_key}
                  onChange={e => setForm({ ...form, element_key: e.target.value })}
                  placeholder="north_arrow"
                  disabled={!!editing}
                />
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Libellé *</Label>
              <Input
                value={form.label}
                onChange={e => setForm({ ...form, label: e.target.value })}
                placeholder="Flèche du Nord"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ordre d'affichage</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={e => setForm({ ...form, display_order: e.target.value })}
                />
              </div>
              <div>
                <Label>Règle de validation (code)</Label>
                <Input
                  value={form.validation_rule}
                  onChange={e => setForm({ ...form, validation_rule: e.target.value })}
                  placeholder="has_north_arrow"
                />
              </div>
            </div>
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_required}
                  onCheckedChange={v => setForm({ ...form, is_required: v })}
                />
                <Label>Obligatoire</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={v => setForm({ ...form, is_active: v })}
                />
                <Label>Actif</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet élément ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Désactivez plutôt l'élément si vous souhaitez le conserver historiquement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminSubdivisionPlanElements;

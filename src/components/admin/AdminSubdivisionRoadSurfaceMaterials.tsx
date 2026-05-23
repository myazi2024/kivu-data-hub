import React, { useState, useEffect, useCallback } from 'react';
import { untypedTables } from '@/integrations/supabase/untyped';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Layers } from 'lucide-react';

export interface RoadSurfaceMaterial {
  id: string;
  key: string;
  label: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  /** Multiplicateur appliqué au tarif de base `road_surface` (catégorie). */
  price_multiplier?: number;
}


const KEY_REGEX = /^[a-z0-9_]+$/;

const emptyForm = { key: '', label: '', description: '', display_order: '10', is_active: true, price_multiplier: '1.00' };

interface Props {
  /** Notifier le parent quand la liste change (pour rafraîchir les multi-select dans les règles). */
  onChanged?: () => void;
}

const AdminSubdivisionRoadSurfaceMaterials: React.FC<Props> = ({ onChanged }) => {
  const [items, setItems] = useState<RoadSurfaceMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RoadSurfaceMaterial | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await untypedTables
      .generic('subdivision_road_surface_materials')
      .select('*')
      .order('display_order');
    if (error) {
      toast.error('Erreur de chargement des matériaux');
    } else {
      setItems((data as RoadSurfaceMaterial[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, display_order: String((items.at(-1)?.display_order ?? 0) + 10) });
    setDialogOpen(true);
  };
  const openEdit = (m: RoadSurfaceMaterial) => {
    setEditing(m);
    setForm({
      key: m.key,
      label: m.label,
      description: m.description ?? '',
      display_order: String(m.display_order ?? 0),
      is_active: m.is_active,
      price_multiplier: (m.price_multiplier ?? 1).toFixed(2),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const key = form.key.trim().toLowerCase();
    const label = form.label.trim();
    if (!key || !KEY_REGEX.test(key)) return toast.error('Clé invalide (minuscules, chiffres, "_" uniquement)');
    if (!label) return toast.error('Libellé requis');
    setSaving(true);
    const payload = {
      key,
      label,
      description: form.description.trim() || null,
      display_order: parseInt(form.display_order) || 0,
      is_active: form.is_active,
    };
    const q = untypedTables.generic('subdivision_road_surface_materials');
    const { error } = editing
      ? await q.update(payload).eq('id', editing.id)
      : await q.insert(payload);
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Cette clé existe déjà' : 'Erreur de sauvegarde');
    } else {
      toast.success(editing ? 'Matériau mis à jour' : 'Matériau ajouté');
      setDialogOpen(false);
      await fetch();
      onChanged?.();
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await untypedTables.generic('subdivision_road_surface_materials').delete().eq('id', deleteId);
    if (error) toast.error('Suppression impossible (matériau probablement utilisé)');
    else { toast.success('Matériau supprimé'); await fetch(); onChanged?.(); }
    setDeleteId(null);
  };

  const toggleActive = async (m: RoadSurfaceMaterial) => {
    const { error } = await untypedTables.generic('subdivision_road_surface_materials')
      .update({ is_active: !m.is_active }).eq('id', m.id);
    if (!error) { await fetch(); onChanged?.(); }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" />
            Matériaux de revêtement de voie
          </CardTitle>
          <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Catalogue 100 % configurable. Les matériaux actifs apparaissent comme options dans les règles de zonage et dans le formulaire utilisateur. La tarification se gère dans l'onglet « Frais » via la catégorie <code>road_surface</code>.
          </p>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clé</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Ordre</TableHead>
                    <TableHead>Actif</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs"><Badge variant="outline">{m.key}</Badge></TableCell>
                      <TableCell className="font-medium">{m.label}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={m.description ?? ''}>{m.description}</TableCell>
                      <TableCell className="text-right font-mono">{m.display_order}</TableCell>
                      <TableCell><Switch checked={m.is_active} onCheckedChange={() => toggleActive(m)} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(m.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Aucun matériau configuré</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le matériau' : 'Ajouter un matériau'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Clé technique <span className="text-muted-foreground">(minuscules, "_")</span></Label>
              <Input value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} placeholder="ex: bitume" disabled={!!editing} className="font-mono" />
              {editing && <p className="text-[10px] text-muted-foreground">La clé est immuable après création.</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Libellé affiché</Label>
              <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="ex: Bitume / Asphalte" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description (optionnel)</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Caractéristiques, usage typique…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Ordre d'affichage</Label>
                <Input type="number" step="10" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Actif</Label>
                <label className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/30 cursor-pointer">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                  <span className="text-xs">{form.is_active ? 'Visible' : 'Masqué'}</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editing ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce matériau ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive. Si des règles ou demandes y font référence, la suppression échouera — désactivez-le plutôt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminSubdivisionRoadSurfaceMaterials;

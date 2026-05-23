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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Droplets, Waves } from 'lucide-react';

interface CatalogRow {
  id: string;
  key: string;
  label: string;
  description: string | null;
  price_multiplier: number;
  is_active: boolean;
  display_order: number;
}

const KEY_REGEX = /^[a-z0-9_]+$/;
const emptyForm = { key: '', label: '', description: '', display_order: '10', is_active: true, price_multiplier: '1.00' };

interface SectionProps {
  table: 'subdivision_drainage_materials' | 'subdivision_drainage_types';
  title: string;
  icon: React.ReactNode;
  helpText: string;
  onChanged?: () => void;
}

const CatalogSection: React.FC<SectionProps> = ({ table, title, icon, helpText, onChanged }) => {
  const [items, setItems] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await untypedTables.generic(table).select('*').order('display_order');
    if (error) toast.error('Erreur de chargement');
    else setItems(((data as CatalogRow[]) ?? []));
    setLoading(false);
  }, [table]);

  useEffect(() => { fetch(); }, [fetch]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, display_order: String((items.at(-1)?.display_order ?? 0) + 10) });
    setDialogOpen(true);
  };
  const openEdit = (m: CatalogRow) => {
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
      price_multiplier: Math.max(0, parseFloat(form.price_multiplier) || 1),
    };
    const q = untypedTables.generic(table);
    const { error } = editing
      ? await q.update(payload).eq('id', editing.id)
      : await q.insert(payload);
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Cette clé existe déjà' : 'Erreur de sauvegarde');
    } else {
      toast.success(editing ? 'Mis à jour' : 'Ajouté');
      setDialogOpen(false);
      await fetch();
      onChanged?.();
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await untypedTables.generic(table).delete().eq('id', deleteId);
    if (error) toast.error('Suppression impossible (élément probablement référencé)');
    else { toast.success('Supprimé'); await fetch(); onChanged?.(); }
    setDeleteId(null);
  };

  const toggleActive = async (m: CatalogRow) => {
    const { error } = await untypedTables.generic(table).update({ is_active: !m.is_active }).eq('id', m.id);
    if (!error) { await fetch(); onChanged?.(); }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">{icon}{title}</CardTitle>
          <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">{helpText}</p>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clé</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead className="text-right">Mult. prix</TableHead>
                    <TableHead className="text-right">Ordre</TableHead>
                    <TableHead>Actif</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs"><Badge variant="outline">{m.key}</Badge></TableCell>
                      <TableCell className="font-medium">
                        <div>{m.label}</div>
                        {m.description && <div className="text-[10px] text-muted-foreground truncate max-w-[180px]" title={m.description}>{m.description}</div>}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">×{(m.price_multiplier ?? 1).toFixed(2)}</TableCell>
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
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Aucune entrée configurée</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Modifier' : 'Ajouter'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Clé technique <span className="text-muted-foreground">(minuscules, "_")</span></Label>
              <Input value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} placeholder="ex: beton" disabled={!!editing} className="font-mono" />
              {editing && <p className="text-[10px] text-muted-foreground">La clé est immuable après création.</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Libellé affiché</Label>
              <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="ex: Béton armé" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description (optionnel)</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Multiplicateur de prix <span className="text-muted-foreground">(1.00 = tarif de base)</span></Label>
              <Input type="number" step="0.05" min="0" value={form.price_multiplier}
                onChange={e => setForm(f => ({ ...f, price_multiplier: e.target.value }))} placeholder="1.00" />
              <p className="text-[10px] text-muted-foreground">
                Appliqué au tarif <code>drainage</code> de l'onglet Frais. Coût final = base × matériau × type × longueur × côtés.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Ordre d'affichage</Label>
                <Input type="number" step="10" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Actif</Label>
                <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/30">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                  <span className="text-xs">{form.is_active ? 'Visible' : 'Masqué'}</span>
                </div>
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
            <AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Action définitive. Si elle est référencée par une règle ou une demande, la suppression échouera — désactivez-la plutôt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

interface Props {
  onChanged?: () => void;
}

const AdminSubdivisionDrainageCatalog: React.FC<Props> = ({ onChanged }) => {
  return (
    <Tabs defaultValue="materials" className="space-y-3">
      <TabsList>
        <TabsTrigger value="materials" className="text-xs"><Droplets className="h-3 w-3 mr-1" />Matériaux</TabsTrigger>
        <TabsTrigger value="types" className="text-xs"><Waves className="h-3 w-3 mr-1" />Types</TabsTrigger>
      </TabsList>
      <TabsContent value="materials">
        <CatalogSection
          table="subdivision_drainage_materials"
          title="Matériaux de drainage / caniveau"
          icon={<Droplets className="h-4 w-4" />}
          helpText="Catalogue des matériaux disponibles pour les canaux d'évacuation. Chaque matériau a un multiplicateur appliqué au tarif de base."
          onChanged={onChanged}
        />
      </TabsContent>
      <TabsContent value="types">
        <CatalogSection
          table="subdivision_drainage_types"
          title="Types de drainage"
          icon={<Waves className="h-4 w-4" />}
          helpText="Catalogue des types (ouvert / couvert / enterré...). Le multiplicateur prend en compte la complexité de pose."
          onChanged={onChanged}
        />
      </TabsContent>
    </Tabs>
  );
};

export default AdminSubdivisionDrainageCatalog;

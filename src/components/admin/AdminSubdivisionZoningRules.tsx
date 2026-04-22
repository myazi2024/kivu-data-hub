import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Ruler, Loader2 } from 'lucide-react';

interface ZoningRule {
  id: string;
  section_type: 'urban' | 'rural';
  location_name: string;
  min_lot_area_sqm: number;
  max_lot_area_sqm: number | null;
  min_road_width_m: number;
  recommended_road_width_m: number;
  min_common_space_pct: number;
  min_front_road_m: number;
  max_lots_per_request: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  section_type: 'urban' as 'urban' | 'rural',
  location_name: '*',
  min_lot_area_sqm: '200',
  max_lot_area_sqm: '5000',
  min_road_width_m: '6',
  recommended_road_width_m: '8',
  min_common_space_pct: '5',
  min_front_road_m: '10',
  max_lots_per_request: '50',
  notes: '',
  is_active: true,
};

const AdminSubdivisionZoningRules: React.FC = () => {
  const [rules, setRules] = useState<ZoningRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'urban' | 'rural'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ZoningRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchRules = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('subdivision_zoning_rules')
      .select('*')
      .order('section_type')
      .order('location_name');
    if (error) {
      toast.error('Erreur de chargement des règles');
      console.error(error);
    } else {
      setRules((data as ZoningRule[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRules(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (r: ZoningRule) => {
    setEditing(r);
    setForm({
      section_type: r.section_type,
      location_name: r.location_name,
      min_lot_area_sqm: String(r.min_lot_area_sqm),
      max_lot_area_sqm: r.max_lot_area_sqm != null ? String(r.max_lot_area_sqm) : '',
      min_road_width_m: String(r.min_road_width_m),
      recommended_road_width_m: String(r.recommended_road_width_m),
      min_common_space_pct: String(r.min_common_space_pct),
      min_front_road_m: String(r.min_front_road_m),
      max_lots_per_request: r.max_lots_per_request != null ? String(r.max_lots_per_request) : '',
      notes: r.notes ?? '',
      is_active: r.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.location_name.trim()) {
      toast.error("Le nom de l'emplacement est requis (* pour défaut)");
      return;
    }
    const minLot = parseFloat(form.min_lot_area_sqm);
    const maxLot = form.max_lot_area_sqm ? parseFloat(form.max_lot_area_sqm) : null;
    const minRoad = parseFloat(form.min_road_width_m);
    const recRoad = parseFloat(form.recommended_road_width_m);
    if (!(minLot > 0)) return toast.error('Surface min lot doit être > 0');
    if (maxLot !== null && maxLot < minLot) return toast.error('Surface max < min');
    if (recRoad < minRoad) return toast.error('Largeur recommandée < min');

    setSaving(true);
    const payload = {
      section_type: form.section_type,
      location_name: form.location_name.trim(),
      min_lot_area_sqm: minLot,
      max_lot_area_sqm: maxLot,
      min_road_width_m: minRoad,
      recommended_road_width_m: recRoad,
      min_common_space_pct: parseFloat(form.min_common_space_pct) || 0,
      min_front_road_m: parseFloat(form.min_front_road_m) || 0,
      max_lots_per_request: form.max_lots_per_request ? parseInt(form.max_lots_per_request) : null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
    };
    const q = (supabase as any).from('subdivision_zoning_rules');
    const { error } = editing
      ? await q.update(payload).eq('id', editing.id)
      : await q.insert(payload);
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Une règle existe déjà pour cet emplacement et type' : 'Erreur lors de la sauvegarde');
      console.error(error);
    } else {
      toast.success(editing ? 'Règle mise à jour' : 'Règle ajoutée');
      setDialogOpen(false);
      fetchRules();
    }
    setSaving(false);
  };

  const handleDelete = (id: string) => setDeleteId(id);

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await (supabase as any).from('subdivision_zoning_rules').delete().eq('id', deleteId);
    if (error) toast.error('Erreur lors de la suppression');
    else { toast.success('Règle supprimée'); fetchRules(); }
    setDeleteId(null);
  };

  const toggleActive = async (r: ZoningRule) => {
    const { error } = await (supabase as any)
      .from('subdivision_zoning_rules')
      .update({ is_active: !r.is_active })
      .eq('id', r.id);
    if (!error) fetchRules();
  };

  const filtered = filter === 'all' ? rules : rules.filter(r => r.section_type === filter);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Ruler className="h-4 w-4" />
            Règles de zonage des lotissements
          </CardTitle>
          <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Définit les contraintes de tracé (surface min/max des lots, largeur des voies, % d'espaces communs…). Utilisez <code>*</code> comme emplacement pour la règle par défaut. Une règle spécifique (ville, quartier) prime sur le défaut.
          </p>

          <div className="flex gap-2 mb-3">
            {(['all', 'urban', 'rural'] as const).map(f => (
              <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
                {f === 'all' ? 'Toutes' : f === 'urban' ? 'Urbain' : 'Rural'}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Emplacement</TableHead>
                    <TableHead className="text-right">Lot min/max (m²)</TableHead>
                    <TableHead className="text-right">Voie min/reco (m)</TableHead>
                    <TableHead className="text-right">% Espaces</TableHead>
                    <TableHead className="text-right">Front (m)</TableHead>
                    <TableHead className="text-right">Max lots</TableHead>
                    <TableHead>Actif</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Badge variant={r.section_type === 'urban' ? 'default' : 'secondary'}>
                          {r.section_type === 'urban' ? 'Urbain' : 'Rural'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.location_name === '*' ? <span className="italic text-muted-foreground">Par défaut</span> : r.location_name}
                      </TableCell>
                      <TableCell className="text-right font-mono">{r.min_lot_area_sqm} / {r.max_lot_area_sqm ?? '∞'}</TableCell>
                      <TableCell className="text-right font-mono">{r.min_road_width_m} / {r.recommended_road_width_m}</TableCell>
                      <TableCell className="text-right font-mono">{r.min_common_space_pct}%</TableCell>
                      <TableCell className="text-right font-mono">{r.min_front_road_m}</TableCell>
                      <TableCell className="text-right font-mono">{r.max_lots_per_request ?? '∞'}</TableCell>
                      <TableCell><Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Aucune règle configurée</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier la règle' : 'Ajouter une règle de zonage'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type de section</Label>
                <Select value={form.section_type} onValueChange={v => setForm(f => ({ ...f, section_type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urban">Urbain (Quartier)</SelectItem>
                    <SelectItem value="rural">Rural (Village)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Emplacement</Label>
                <Input value={form.location_name} onChange={e => setForm(f => ({ ...f, location_name: e.target.value }))} placeholder="* ou nom ville/quartier" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Surface min lot (m²)</Label>
                <Input type="number" step="1" value={form.min_lot_area_sqm} onChange={e => setForm(f => ({ ...f, min_lot_area_sqm: e.target.value }))} />
              </div>
              <div>
                <Label>Surface max lot (m²)</Label>
                <Input type="number" step="1" value={form.max_lot_area_sqm} onChange={e => setForm(f => ({ ...f, max_lot_area_sqm: e.target.value }))} placeholder="Optionnel" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Largeur min voie (m)</Label>
                <Input type="number" step="0.5" value={form.min_road_width_m} onChange={e => setForm(f => ({ ...f, min_road_width_m: e.target.value }))} />
              </div>
              <div>
                <Label>Largeur recommandée (m)</Label>
                <Input type="number" step="0.5" value={form.recommended_road_width_m} onChange={e => setForm(f => ({ ...f, recommended_road_width_m: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>% Espaces communs min</Label>
                <Input type="number" step="1" value={form.min_common_space_pct} onChange={e => setForm(f => ({ ...f, min_common_space_pct: e.target.value }))} />
              </div>
              <div>
                <Label>Front route min (m)</Label>
                <Input type="number" step="0.5" value={form.min_front_road_m} onChange={e => setForm(f => ({ ...f, min_front_road_m: e.target.value }))} />
              </div>
              <div>
                <Label>Max lots / demande</Label>
                <Input type="number" step="1" value={form.max_lots_per_request} onChange={e => setForm(f => ({ ...f, max_lots_per_request: e.target.value }))} placeholder="Optionnel" />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Précisions, base légale, etc." />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Actif</Label>
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
            <AlertDialogTitle>Supprimer cette règle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive et ne peut pas être annulée.
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
    </div>
  );
};

export default AdminSubdivisionZoningRules;

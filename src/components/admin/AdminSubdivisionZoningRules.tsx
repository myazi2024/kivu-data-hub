import React, { useState, useEffect, useMemo } from 'react';
import { untypedTables } from '@/integrations/supabase/untyped';
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
import {
  getAllProvinces,
  getVillesForProvince,
  getCommunesForVille,
  getQuartiersForCommune,
  getAvenuesForQuartier,
  getTerritoiresForProvince,
  getCollectivitesForTerritoire,
} from '@/lib/geographicData';

const NONE = '__none__'; // marqueur "non sélectionné" (Radix Select n'autorise pas value="")

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
  // Géographie cascadée (urbain : province > ville > commune > quartier > avenue / rural : province > territoire > collectivité > groupement > village)
  province: '',
  ville: '',
  commune: '',
  quartier: '',
  avenue: '',
  territoire: '',
  collectivite: '',
  groupement: '',
  village: '',
  apply_to_default: false, // si coché => location_name = '*'
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

/**
 * Reconstitue (au mieux) les niveaux géographiques d'une règle existante
 * à partir de son `location_name` (qui ne stocke que le nom du niveau le plus précis).
 * Recherche dans la base statique tous les chemins compatibles.
 */
const reverseGeographicLookup = (
  sectionType: 'urban' | 'rural',
  locationName: string,
): Partial<typeof emptyForm> => {
  if (!locationName || locationName === '*') return { apply_to_default: true };
  const provinces = getAllProvinces();
  if (sectionType === 'urban') {
    for (const province of provinces) {
      // Ville ?
      const villes = getVillesForProvince(province);
      if (villes.includes(locationName)) return { province, ville: locationName };
      for (const ville of villes) {
        const communes = getCommunesForVille(province, ville);
        if (communes.includes(locationName)) return { province, ville, commune: locationName };
        for (const commune of communes) {
          const quartiers = getQuartiersForCommune(province, ville, commune);
          if (quartiers.includes(locationName)) return { province, ville, commune, quartier: locationName };
          for (const quartier of quartiers) {
            const avenues = getAvenuesForQuartier(province, ville, commune, quartier);
            if (avenues.includes(locationName)) return { province, ville, commune, quartier, avenue: locationName };
          }
        }
      }
    }
  } else {
    for (const province of provinces) {
      const territoires = getTerritoiresForProvince(province);
      if (territoires.includes(locationName)) return { province, territoire: locationName };
      for (const territoire of territoires) {
        const collectivites = getCollectivitesForTerritoire(province, territoire);
        if (collectivites.includes(locationName)) return { province, territoire, collectivite: locationName };
      }
    }
    // Groupement / village ne sont pas dans la base statique → restaure au moins le nom
    return { groupement: locationName };
  }
  return {};
};

/** Détermine le niveau le plus précis sélectionné — c'est cette valeur qui devient `location_name`. */
const computeLocationName = (f: typeof emptyForm): string => {
  if (f.apply_to_default) return '*';
  if (f.section_type === 'urban') {
    return f.avenue || f.quartier || f.commune || f.ville || '';
  }
  return f.village || f.groupement || f.collectivite || f.territoire || '';
};

/** Fil d'Ariane lisible pour l'affichage dans la table. */
const formatBreadcrumb = (r: ZoningRule): string => {
  if (r.location_name === '*') return 'Par défaut';
  const found = reverseGeographicLookup(r.section_type, r.location_name);
  const parts = r.section_type === 'urban'
    ? [found.province, found.ville, found.commune, found.quartier, found.avenue]
    : [found.province, found.territoire, found.collectivite, found.groupement, found.village];
  const trail = parts.filter(Boolean);
  return trail.length > 0 ? trail.join(' › ') : r.location_name;
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
    const { data, error } = await untypedTables.subdivision_zoning_rules()
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
    const reversed = reverseGeographicLookup(r.section_type, r.location_name);
    setForm({
      ...emptyForm,
      ...reversed,
      section_type: r.section_type,
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
    const locationName = computeLocationName(form);
    if (!locationName) {
      toast.error("Sélectionnez au moins un niveau géographique ou cochez « Règle par défaut »");
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
      location_name: locationName,
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
    const q = untypedTables.subdivision_zoning_rules();
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
    const { error } = await untypedTables.subdivision_zoning_rules().delete().eq('id', deleteId);
    if (error) toast.error('Erreur lors de la suppression');
    else { toast.success('Règle supprimée'); fetchRules(); }
    setDeleteId(null);
  };

  const toggleActive = async (r: ZoningRule) => {
    const { error } = await untypedTables.subdivision_zoning_rules()
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
                        {r.location_name === '*'
                          ? <span className="italic text-muted-foreground">Par défaut (toute la RDC)</span>
                          : <span title={r.location_name}>{formatBreadcrumb(r)}</span>}
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
                <Select value={form.section_type} onValueChange={v => setForm(f => ({ ...f, section_type: v as 'urban' | 'rural' }))}>
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

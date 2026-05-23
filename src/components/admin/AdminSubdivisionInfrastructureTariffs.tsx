import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { untypedTables, asUntypedPayload } from '@/integrations/supabase/untyped';
import {
  invalidateInfrastructureTariffsCache,
  type InfrastructureTariff,
  type InfrastructureCategory,
  type InfrastructureUnit,
  type InfrastructureLinkedTo,
} from '@/hooks/useSubdivisionInfrastructureTariffs';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Building2, Search, AlertTriangle, Info } from 'lucide-react';

const CATEGORIES: { value: InfrastructureCategory; label: string }[] = [
  { value: 'voirie', label: 'Voirie' },
  { value: 'reseau', label: 'Réseau' },
  { value: 'amenagement', label: 'Aménagement' },
  { value: 'equipement', label: 'Équipement' },
];

const UNITS: { value: InfrastructureUnit; label: string }[] = [
  { value: 'linear_m', label: 'Mètre linéaire' },
  { value: 'sqm', label: 'm²' },
  { value: 'unit', label: 'Unité' },
  { value: 'lot', label: 'Lot' },
];

const LINKED_TO_OPTIONS: { value: Exclude<InfrastructureLinkedTo, null> | ''; label: string }[] = [
  { value: '', label: 'Aucun (autre)' },
  { value: 'road_surface', label: 'Voie · revêtement' },
  { value: 'drainage', label: 'Voie · drainage' },
  { value: 'street_lighting', label: 'Voie · éclairage' },
];

const LINKED_TO_BADGE: Record<Exclude<InfrastructureLinkedTo, null>, string> = {
  road_surface: 'Lié au revêtement de voie',
  drainage: 'Lié au canal de drainage',
  street_lighting: 'Lié à l’éclairage de voie',
};

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
  linked_to: '' | 'road_surface' | 'drainage' | 'street_lighting';
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
  linked_to: '',
};

interface RoadSurfaceMaterialLite {
  key: string;
  label: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

const AdminSubdivisionInfrastructureTariffs: React.FC = () => {
  const [items, setItems] = useState<InfrastructureTariff[]>([]);
  const [materials, setMaterials] = useState<RoadSurfaceMaterialLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InfrastructureTariff | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | InfrastructureCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [tariffsRes, matsRes] = await Promise.all([
      untypedTables.subdivision_infrastructure_tariffs().select('*').order('category').order('display_order'),
      untypedTables.generic('subdivision_road_surface_materials').select('key,label,description,display_order,is_active').order('display_order'),
    ]);
    if (tariffsRes.error) { toast.error('Erreur de chargement'); console.error(tariffsRes.error); }
    else setItems((tariffsRes.data as InfrastructureTariff[]) ?? []);
    if (!matsRes.error) setMaterials((matsRes.data as RoadSurfaceMaterialLite[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
      linked_to: (it.linked_to ?? '') as FormState['linked_to'],
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
      linked_to: form.linked_to || null,
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
      fetchAll();
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
      fetchAll();
    }
    setDeleteId(null);
  };

  const toggleActive = async (it: InfrastructureTariff) => {
    const { error } = await untypedTables.subdivision_infrastructure_tariffs()
      .update(asUntypedPayload({ is_active: !it.is_active, updated_at: new Date().toISOString() }))
      .eq('id', it.id);
    if (!error) {
      invalidateInfrastructureTariffsCache();
      fetchAll();
    }
  };

  // NOTE: depuis l'harmonisation (catalogues + multiplicateurs), il n'existe
  // plus de tarif `road_surface_<materiau>` ni `drainage_<materiau>` distinct.
  // Le calcul se fait via :
  //   tarif de base (road_surface | drainage | street_lighting)  ×  price_multiplier
  //   du matériau et/ou du type choisi dans le catalogue dédié.
  // Les fonctions de sync/orphan d'avant sont devenues sans objet ; on
  // expose seulement un compteur pour signaler les éventuels résidus.
  const legacyMaterialTariffs = useMemo(
    () => items.filter(i => /^(road_surface|drainage)_./.test(i.infrastructure_key)),
    [items],
  );

  const unitLabel = (u: InfrastructureUnit) => UNITS.find(x => x.value === u)?.label ?? u;
  const catLabel = (c: InfrastructureCategory) => CATEGORIES.find(x => x.value === c)?.label ?? c;

  // Filtering + grouping
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(it => {
      if (categoryFilter !== 'all' && it.category !== categoryFilter) return false;
      if (statusFilter === 'active' && !it.is_active) return false;
      if (statusFilter === 'inactive' && it.is_active) return false;
      if (q && !`${it.infrastructure_key} ${it.label}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, categoryFilter, statusFilter]);

  const grouped = useMemo(() => {
    const map = new Map<InfrastructureCategory, InfrastructureTariff[]>();
    for (const c of CATEGORIES) map.set(c.value, []);
    for (const it of filteredItems) {
      const arr = map.get(it.category) ?? [];
      arr.push(it);
      map.set(it.category, arr);
    }
    return Array.from(map.entries()).filter(([, arr]) => arr.length > 0);
  }, [filteredItems]);

  // Une clé legacy par matériau est désormais traitée comme un résidu à supprimer.
  const isOrphan = (it: InfrastructureTariff): string | null => {
    if (/^(road_surface|drainage)_./.test(it.infrastructure_key)) {
      return 'Clé obsolète : le tarif est désormais calculé via le multiplicateur du catalogue. À supprimer.';
    }
    return null;
  };


  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Tarifs par type d'infrastructure
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Tarifs appliqués automatiquement selon les voies tracées dans la demande. Aligné sur les champs « Infrastructures requises par voie » (revêtement, drainage, éclairage).
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-3">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Modèle « base + multiplicateur » :</strong> seules les 3 clés de base sont utilisées —
              <code> road_surface</code> (m²), <code>drainage</code> (ml), <code>street_lighting</code> (unité).
              Le coût final d'un matériau ou d'un type est calculé en multipliant le tarif de base par le
              <em> price_multiplier</em> défini dans le catalogue correspondant (Catalogue revêtements / drainage).
              {legacyMaterialTariffs.length > 0 && (
                <span className="block mt-1 text-destructive">
                  ⚠ {legacyMaterialTariffs.length} clé(s) obsolète(s) de type <code>road_surface_&lt;mat&gt;</code> / <code>drainage_&lt;mat&gt;</code> détectée(s) — supprimez-les.
                </span>
              )}
            </AlertDescription>
          </Alert>


          <div className="flex flex-wrap gap-2 mb-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher clé ou libellé…" className="pl-7 h-9 text-sm" />
            </div>
            <Select value={categoryFilter} onValueChange={v => setCategoryFilter(v as typeof categoryFilter)}>
              <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="inactive">Inactifs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : grouped.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">Aucun tarif ne correspond aux filtres.</p>
          ) : (
            <div className="space-y-5">
              {grouped.map(([cat, list]) => (
                <div key={cat}>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Badge variant="outline">{catLabel(cat)}</Badge>
                    <span className="text-xs text-muted-foreground">({list.length})</span>
                  </h3>
                  <div className="overflow-x-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Libellé</TableHead>
                          <TableHead>Clé</TableHead>
                          <TableHead>Lien voie</TableHead>
                          <TableHead className="text-right">Tarif</TableHead>
                          <TableHead>Unité</TableHead>
                          <TableHead>Section</TableHead>
                          <TableHead>Actif</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.map(it => {
                          const orphan = isOrphan(it);
                          return (
                            <TableRow key={it.id} className={orphan ? 'bg-destructive/5' : ''}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {orphan && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" aria-label={orphan} />}
                                  <span>{it.label}</span>
                                </div>
                                {orphan && <p className="text-[10px] text-destructive mt-0.5">{orphan}</p>}
                              </TableCell>
                              <TableCell><code className="text-xs">{it.infrastructure_key}</code></TableCell>
                              <TableCell>
                                {it.linked_to
                                  ? <Badge variant="secondary" className="text-[10px]" title={LINKED_TO_BADGE[it.linked_to]}>{LINKED_TO_BADGE[it.linked_to]}</Badge>
                                  : <span className="text-muted-foreground text-xs">—</span>}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {Number(it.rate_usd) === 0
                                  ? <span className="text-destructive">${Number(it.rate_usd).toFixed(2)}</span>
                                  : `$${Number(it.rate_usd).toFixed(2)}`}
                              </TableCell>
                              <TableCell className="text-xs">{unitLabel(it.unit)}</TableCell>
                              <TableCell className="text-xs">{it.section_type ? (it.section_type === 'urban' ? 'Urbain' : 'Rural') : 'Tous'}</TableCell>
                              <TableCell><Switch checked={it.is_active} onCheckedChange={() => toggleActive(it)} /></TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(it)} aria-label="Modifier"><Pencil className="h-3 w-3" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(it.id)} aria-label="Supprimer"><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
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
                <Input value={form.infrastructure_key} onChange={e => setForm(f => ({ ...f, infrastructure_key: e.target.value }))} placeholder="ex: drainage_pvc" disabled={!!editing} />
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
            <div>
              <Label>Lien avec une infrastructure de voie</Label>
              <Select value={form.linked_to || 'none'} onValueChange={v => setForm(f => ({ ...f, linked_to: v === 'none' ? '' : v as FormState['linked_to'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LINKED_TO_OPTIONS.map(o => <SelectItem key={o.value || 'none'} value={o.value || 'none'}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">Indique quel attribut de voie déclenche ce tarif dans le formulaire.</p>
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

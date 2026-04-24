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
import { Plus, Pencil, Trash2, Ruler, Loader2, MapPin, Building2, TreePine, Settings2, FileText, Globe2, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/** Petit indicateur d'aide affichant un popover explicatif au clic. */
const FieldHelp: React.FC<{ title: string; description: string; example?: string }> = ({ title, description, example }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        aria-label={`Aide : ${title}`}
        className="inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
      >
        <Info className="h-3 w-3" />
      </button>
    </PopoverTrigger>
    <PopoverContent side="top" align="start" className="w-72 text-xs space-y-1.5 z-[10001]">
      <h4 className="font-semibold text-sm flex items-center gap-1.5">
        <Info className="h-3.5 w-3.5 text-primary" />
        {title}
      </h4>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
      {example && (
        <p className="text-[11px] text-muted-foreground/80 italic border-l-2 border-primary/40 pl-2">
          Exemple : {example}
        </p>
      )}
    </PopoverContent>
  </Popover>
);
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

type FormState = typeof emptyForm;
type FormSetter = React.Dispatch<React.SetStateAction<FormState>>;

const UrbanCascade: React.FC<{ form: FormState; setForm: FormSetter }> = ({ form, setForm }) => {
  const villes = useMemo(() => form.province ? getVillesForProvince(form.province) : [], [form.province]);
  const communes = useMemo(
    () => (form.province && form.ville) ? getCommunesForVille(form.province, form.ville) : [],
    [form.province, form.ville],
  );
  const quartiers = useMemo(
    () => (form.province && form.ville && form.commune) ? getQuartiersForCommune(form.province, form.ville, form.commune) : [],
    [form.province, form.ville, form.commune],
  );
  const avenues = useMemo(
    () => (form.province && form.ville && form.commune && form.quartier) ? getAvenuesForQuartier(form.province, form.ville, form.commune, form.quartier) : [],
    [form.province, form.ville, form.commune, form.quartier],
  );

  return (
    <>
      <div>
        <Label>Ville</Label>
        <Select
          value={form.ville || NONE}
          onValueChange={v => setForm(f => ({ ...f, ville: v === NONE ? '' : v, commune: '', quartier: '', avenue: '' }))}
          disabled={!form.province}
        >
          <SelectTrigger><SelectValue placeholder={form.province ? 'Toutes' : '— sélectionnez une province —'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— Toutes les villes —</SelectItem>
            {villes.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Commune</Label>
        <Select
          value={form.commune || NONE}
          onValueChange={v => setForm(f => ({ ...f, commune: v === NONE ? '' : v, quartier: '', avenue: '' }))}
          disabled={!form.ville}
        >
          <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— Toutes les communes —</SelectItem>
            {communes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Quartier</Label>
        <Select
          value={form.quartier || NONE}
          onValueChange={v => setForm(f => ({ ...f, quartier: v === NONE ? '' : v, avenue: '' }))}
          disabled={!form.commune || quartiers.length === 0}
        >
          <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— Tous les quartiers —</SelectItem>
            {quartiers.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Avenue</Label>
        <Select
          value={form.avenue || NONE}
          onValueChange={v => setForm(f => ({ ...f, avenue: v === NONE ? '' : v }))}
          disabled={!form.quartier || avenues.length === 0}
        >
          <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— Toutes les avenues —</SelectItem>
            {avenues.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </>
  );
};

const RuralCascade: React.FC<{ form: FormState; setForm: FormSetter }> = ({ form, setForm }) => {
  const territoires = useMemo(() => form.province ? getTerritoiresForProvince(form.province) : [], [form.province]);
  const collectivites = useMemo(
    () => (form.province && form.territoire) ? getCollectivitesForTerritoire(form.province, form.territoire) : [],
    [form.province, form.territoire],
  );

  return (
    <>
      <div>
        <Label>Territoire</Label>
        <Select
          value={form.territoire || NONE}
          onValueChange={v => setForm(f => ({ ...f, territoire: v === NONE ? '' : v, collectivite: '', groupement: '', village: '' }))}
          disabled={!form.province}
        >
          <SelectTrigger><SelectValue placeholder={form.province ? 'Tous' : '— sélectionnez une province —'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— Tous les territoires —</SelectItem>
            {territoires.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Collectivité</Label>
        <Select
          value={form.collectivite || NONE}
          onValueChange={v => setForm(f => ({ ...f, collectivite: v === NONE ? '' : v, groupement: '', village: '' }))}
          disabled={!form.territoire}
        >
          <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— Toutes les collectivités —</SelectItem>
            {collectivites.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {/* Groupement et village ne sont pas dans la base statique : saisie libre */}
      <div>
        <Label>Groupement</Label>
        <Input
          value={form.groupement}
          onChange={e => setForm(f => ({ ...f, groupement: e.target.value, village: '' }))}
          placeholder="Optionnel"
          disabled={!form.collectivite}
        />
      </div>
      <div>
        <Label>Village</Label>
        <Input
          value={form.village}
          onChange={e => setForm(f => ({ ...f, village: e.target.value }))}
          placeholder="Optionnel"
          disabled={!form.groupement}
        />
      </div>
    </>
  );
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
        <DialogContent className="max-w-3xl p-0 gap-0 max-h-[92vh] flex flex-col overflow-hidden">
          {/* Header sticky avec dégradé */}
          <DialogHeader className="px-4 sm:px-6 py-4 border-b bg-gradient-to-r from-primary/5 via-background to-accent/5 shrink-0">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Ruler className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base sm:text-lg">
                  {editing ? 'Modifier la règle de zonage' : 'Ajouter une règle de zonage'}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Définissez les contraintes applicables à un emplacement géographique précis.
                </p>
              </div>
              {form.apply_to_default && (
                <Badge variant="secondary" className="hidden sm:inline-flex shrink-0">
                  <Globe2 className="h-3 w-3 mr-1" /> Défaut RDC
                </Badge>
              )}
            </div>
          </DialogHeader>

          {/* Corps scrollable */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
            {/* Section 1 — Portée */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Portée de la règle</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Type de section</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['urban', 'rural'] as const).map(t => {
                      const Icon = t === 'urban' ? Building2 : TreePine;
                      const active = form.section_type === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setForm(f => ({
                            ...f,
                            section_type: t,
                            ville: '', commune: '', quartier: '', avenue: '',
                            territoire: '', collectivite: '', groupement: '', village: '',
                          }))}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-all ${
                            active
                              ? 'border-primary bg-primary/10 text-primary font-medium shadow-sm'
                              : 'border-border hover:border-primary/40 hover:bg-accent'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {t === 'urban' ? 'Urbain' : 'Rural'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Application</Label>
                  <label className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors h-[42px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <Globe2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">Règle par défaut (toute la RDC)</span>
                    </div>
                    <Switch
                      checked={form.apply_to_default}
                      onCheckedChange={v => setForm(f => ({ ...f, apply_to_default: v }))}
                    />
                  </label>
                </div>
              </div>
            </section>

            <Separator />

            {/* Section 2 — Cascade géographique */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Emplacement</h3>
                </div>
                {!form.apply_to_default && (
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    Sélectionnez le niveau le plus précis
                  </span>
                )}
              </div>

              <fieldset
                disabled={form.apply_to_default}
                className="rounded-lg border bg-card/50 p-3 sm:p-4 space-y-3 disabled:opacity-50 transition-opacity"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Province</Label>
                    <Select
                      value={form.province || NONE}
                      onValueChange={v => setForm(f => ({
                        ...f,
                        province: v === NONE ? '' : v,
                        ville: '', commune: '', quartier: '', avenue: '',
                        territoire: '', collectivite: '', groupement: '', village: '',
                      }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>— Toutes les provinces —</SelectItem>
                        {getAllProvinces().map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {form.section_type === 'urban' ? (
                    <UrbanCascade form={form} setForm={setForm} />
                  ) : (
                    <RuralCascade form={form} setForm={setForm} />
                  )}
                </div>

                {/* Aperçu fil d'Ariane */}
                {!form.apply_to_default && (() => {
                  const trail = form.section_type === 'urban'
                    ? [form.province, form.ville, form.commune, form.quartier, form.avenue].filter(Boolean)
                    : [form.province, form.territoire, form.collectivite, form.groupement, form.village].filter(Boolean);
                  if (trail.length === 0) return null;
                  return (
                    <div className="flex items-center gap-1.5 flex-wrap text-xs bg-primary/5 border border-primary/20 rounded-md px-2.5 py-1.5">
                      <MapPin className="h-3 w-3 text-primary shrink-0" />
                      {trail.map((part, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span className="text-muted-foreground">›</span>}
                          <span className={i === trail.length - 1 ? 'font-medium text-primary' : 'text-muted-foreground'}>{part}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  );
                })()}
              </fieldset>
            </section>

            <Separator />

            {/* Section 3 — Contraintes techniques */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Contraintes techniques</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    Surface min lot (m²)
                    <FieldHelp
                      title="Surface minimale par lot"
                      description="Aire en m² en dessous de laquelle un lot du plan de lotissement sera refusé. Sert à empêcher la création de parcelles trop petites pour être habitables ou conformes au plan d'urbanisme local."
                      example="500 m² en zone résidentielle urbaine standard."
                    />
                  </Label>
                  <Input type="number" step="1" inputMode="numeric" value={form.min_lot_area_sqm} onChange={e => setForm(f => ({ ...f, min_lot_area_sqm: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    Surface max lot (m²)
                    <FieldHelp
                      title="Surface maximale par lot"
                      description="Aire en m² au-dessus de laquelle un lot sera signalé. Utile pour éviter la concentration foncière et garantir une densité minimale dans la zone. Laisser vide pour ne pas imposer de plafond."
                      example="2 000 m² en zone résidentielle dense."
                    />
                  </Label>
                  <Input type="number" step="1" inputMode="numeric" value={form.max_lot_area_sqm} onChange={e => setForm(f => ({ ...f, max_lot_area_sqm: e.target.value }))} placeholder="Optionnel" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    Largeur min voie (m)
                    <FieldHelp
                      title="Largeur minimale des voies"
                      description="Largeur minimale (en mètres) acceptée pour les voies de desserte du lotissement. En dessous de cette valeur, la demande est rejetée pour non-conformité (accès secours, circulation, viabilisation)."
                      example="6 m pour une voie résidentielle de desserte."
                    />
                  </Label>
                  <Input type="number" step="0.5" inputMode="decimal" value={form.min_road_width_m} onChange={e => setForm(f => ({ ...f, min_road_width_m: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    Largeur recommandée (m)
                    <FieldHelp
                      title="Largeur recommandée des voies"
                      description="Largeur idéale (en mètres) suggérée au demandeur. En dessous, la demande passe mais un avertissement (warning) est affiché pour inviter à élargir la voirie. N'empêche pas la soumission."
                      example="8 m pour conforter trottoirs et stationnement."
                    />
                  </Label>
                  <Input type="number" step="0.5" inputMode="decimal" value={form.recommended_road_width_m} onChange={e => setForm(f => ({ ...f, recommended_road_width_m: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    % Espaces communs min
                    <FieldHelp
                      title="Pourcentage minimum d'espaces communs"
                      description="Part minimale de la surface totale du lotissement (en %) à réserver aux espaces communs : voiries, espaces verts, équipements collectifs. En dessous, la demande est non conforme."
                      example="15 % pour un lotissement résidentiel urbain."
                    />
                  </Label>
                  <Input type="number" step="1" inputMode="numeric" value={form.min_common_space_pct} onChange={e => setForm(f => ({ ...f, min_common_space_pct: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    Front route min (m)
                    <FieldHelp
                      title="Front sur rue minimal"
                      description="Longueur minimale (en mètres) de la façade d'un lot donnant sur une voie. Garantit que chaque lot dispose d'un accès direct suffisant à la voirie pour viabilisation et accès véhicule."
                      example="12 m pour un lot résidentiel standard."
                    />
                  </Label>
                  <Input type="number" step="0.5" inputMode="decimal" value={form.min_front_road_m} onChange={e => setForm(f => ({ ...f, min_front_road_m: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    Max lots / demande
                    <FieldHelp
                      title="Nombre maximal de lots par demande"
                      description="Plafond du nombre de lots qu'une seule demande de lotissement peut contenir dans cette zone. Au-delà, la demande devra être scindée. Laisser vide pour ne pas limiter."
                      example="50 lots maximum pour une opération courante."
                    />
                  </Label>
                  <Input type="number" step="1" inputMode="numeric" value={form.max_lots_per_request} onChange={e => setForm(f => ({ ...f, max_lots_per_request: e.target.value }))} placeholder="Optionnel" />
                </div>
              </div>
            </section>

            <Separator />

            {/* Section 4 — Notes & statut */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Notes & statut</h3>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Précisions, base légale, etc." />
              </div>

              <label className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Règle active</span>
                  <span className="text-[11px] text-muted-foreground">Si désactivée, elle ne sera pas appliquée aux validations.</span>
                </div>
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              </label>
            </section>
          </div>

          {/* Footer sticky */}
          <DialogFooter className="px-4 sm:px-6 py-3 border-t bg-muted/30 shrink-0 flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editing ? 'Mettre à jour' : 'Ajouter la règle'}
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

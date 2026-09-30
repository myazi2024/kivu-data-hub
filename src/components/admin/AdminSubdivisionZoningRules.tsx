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
import AdminSubdivisionRoadSurfaceMaterials, { type RoadSurfaceMaterial } from './AdminSubdivisionRoadSurfaceMaterials';
import AdminSubdivisionDrainageCatalog from './AdminSubdivisionDrainageCatalog';
import { validateZoningRuleForm } from './subdivision/zoningValidation';
import {
  useDrainageMaterialsCatalog,
  useDrainageTypesCatalog,
} from '@/hooks/useSubdivisionDrainageCatalog';

import { FieldHelp } from './subdivision/zoning/FieldHelp';
import { InfrastructureSection } from './subdivision/zoning/InfrastructureSection';
import { UrbanCascade, RuralCascade } from './subdivision/zoning/GeoCascades';
import { NONE, emptyForm, reverseGeographicLookup, computeLocationName, formatBreadcrumb, type ZoningRule } from './subdivision/zoning/zoningForm';
import { getAllProvinces } from '@/lib/geographicData';

const AdminSubdivisionZoningRules: React.FC = () => {
  const [rules, setRules] = useState<ZoningRule[]>([]);
  const [materials, setMaterials] = useState<RoadSurfaceMaterial[]>([]);
  const [roadSurfaceTariffKeys, setRoadSurfaceTariffKeys] = useState<Set<string>>(new Set());
  const [hasRoadSurfaceBase, setHasRoadSurfaceBase] = useState(true);
  const [search, setSearch] = useState('');
  const { items: drainageMaterials } = useDrainageMaterialsCatalog(true);
  const { items: drainageTypes } = useDrainageTypesCatalog(true);

  const fetchMaterials = async () => {
    const { data } = await untypedTables
      .generic('subdivision_road_surface_materials')
      .select('*')
      .order('display_order');
    // Dédoublonnage défensif par clé pour éviter collision de keys React.
    const list = ((data as RoadSurfaceMaterial[]) ?? []).filter(m => m.is_active);
    const dedup = Array.from(new Map(list.map(m => [m.key, m])).values());
    setMaterials(dedup);
  };

  // Nouveau modèle : un seul tarif de base `road_surface`, multiplié par
  // `price_multiplier` du matériau. Un matériau est « tarifé » dès que son
  // multiplicateur > 0 ET que le tarif de base existe.
  const fetchRoadSurfaceTariffs = async () => {
    const { data } = await untypedTables
      .subdivision_infrastructure_tariffs()
      .select('infrastructure_key, rate_usd, is_active')
      .eq('infrastructure_key', 'road_surface');
    const baseTariff = (data ?? [])[0] as { rate_usd?: number; is_active?: boolean } | undefined;
    const baseOk = !!baseTariff && baseTariff.is_active !== false && Number(baseTariff.rate_usd ?? 0) > 0;
    setHasRoadSurfaceBase(baseOk);
  };

  useEffect(() => { fetchMaterials(); fetchRoadSurfaceTariffs(); }, []);

  // Recalcule l'ensemble des matériaux "tarifés" dès qu'on connaît à la fois
  // le tarif de base et la liste des matériaux (avec leurs multiplicateurs).
  useEffect(() => {
    const ok = new Set<string>();
    if (hasRoadSurfaceBase) {
      for (const m of materials) {
        if ((m.price_multiplier ?? 1) > 0) ok.add(m.key);
      }
    }
    setRoadSurfaceTariffKeys(ok);
  }, [hasRoadSurfaceBase, materials]);

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'urban' | 'rural'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ZoningRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toggleTarget, setToggleTarget] = useState<ZoningRule | null>(null);

  // Cache mémo de breadcrumb pré-calculé (pas de mutation pendant render)
  const breadcrumbCache = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rules) {
      const key = `${r.section_type}|${r.location_name}`;
      if (!map.has(key)) map.set(key, formatBreadcrumb(r));
    }
    return map;
  }, [rules]);
  const memoFormatBreadcrumb = (r: ZoningRule): string => {
    return breadcrumbCache.get(`${r.section_type}|${r.location_name}`) ?? formatBreadcrumb(r);
  };

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

  /** Cloner une règle existante (création d'une nouvelle entrée avec les mêmes paramètres). */
  const openClone = (r: ZoningRule) => {
    openEdit(r);
    // Repasse en mode création juste après le préchargement du form
    setTimeout(() => setEditing(null), 0);
    toast.info("Clonage : adaptez l'emplacement avant d'enregistrer");
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
      parent_min_area_sqm: String(r.parent_min_area_sqm ?? 0),
      parent_max_area_sqm: r.parent_max_area_sqm != null ? String(r.parent_max_area_sqm) : '',
      allow_if_active_dispute: !!r.allow_if_active_dispute,
      allow_if_active_mortgage: !!r.allow_if_active_mortgage,
      require_registered_title: !!r.require_registered_title,
      min_title_age_years: String(r.min_title_age_years ?? 0),
      allow_if_pending_mutation: !!r.allow_if_pending_mutation,
      require_gps_coordinates: r.require_gps_coordinates ?? true,
      min_gps_points: String(r.min_gps_points ?? 3),
      allow_if_pending_subdivision: !!r.allow_if_pending_subdivision,
      exclude_title_types: (r.exclude_title_types || []).join(', '),
      notes: r.notes ?? '',
      is_active: r.is_active,
      require_drainage_canal: !!r.require_drainage_canal,
      drainage_canal_min_width_m: r.drainage_canal_min_width_m != null ? String(r.drainage_canal_min_width_m) : '',
      drainage_canal_min_depth_m: r.drainage_canal_min_depth_m != null ? String(r.drainage_canal_min_depth_m) : '',
      drainage_canal_allowed_materials: r.drainage_canal_allowed_materials || [],
      drainage_canal_allowed_types: r.drainage_canal_allowed_types || [],
      drainage_canal_min_slope_pct: r.drainage_canal_min_slope_pct != null ? String(r.drainage_canal_min_slope_pct) : '',
      drainage_canal_required_sides: r.drainage_canal_required_sides || 'any',
      require_solar_lighting: !!r.require_solar_lighting,
      solar_lighting_min_pole_height_m: r.solar_lighting_min_pole_height_m != null ? String(r.solar_lighting_min_pole_height_m) : '',
      solar_lighting_min_lumens: r.solar_lighting_min_lumens != null ? String(r.solar_lighting_min_lumens) : '',
      solar_lighting_beam_angle_deg: r.solar_lighting_beam_angle_deg != null ? String(r.solar_lighting_beam_angle_deg) : '',
      solar_lighting_max_spacing_m: r.solar_lighting_max_spacing_m != null ? String(r.solar_lighting_max_spacing_m) : '',
      solar_lighting_min_battery_hours: r.solar_lighting_min_battery_hours != null ? String(r.solar_lighting_min_battery_hours) : '',
      solar_lighting_required_sides: r.solar_lighting_required_sides || 'any',
      require_road_surface: !!r.require_road_surface,
      road_surface_allowed_materials: r.road_surface_allowed_materials || [],
      road_surface_min_thickness_cm: r.road_surface_min_thickness_cm != null ? String(r.road_surface_min_thickness_cm) : '',
      road_surface_max_thickness_cm: r.road_surface_max_thickness_cm != null ? String(r.road_surface_max_thickness_cm) : '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const locationName = computeLocationName(form);
    // province_path : chemin géo complet (résout les homonymes)
    const provincePath: string[] = form.apply_to_default
      ? []
      : (form.section_type === 'urban'
          ? [form.province, form.ville, form.commune, form.quartier, form.avenue]
          : [form.province, form.territoire, form.collectivite, form.groupement, form.village]
        ).filter(Boolean);

    const { errors, warnings } = validateZoningRuleForm(
      { ...form, location_name: locationName },
      { knownRoadSurfaceTariffKeys: roadSurfaceTariffKeys },
    );
    if (errors.length > 0) {
      errors.slice(0, 3).forEach(e => toast.error(e));
      return;
    }
    warnings.forEach(w => toast.warning(w));

    const minLot = parseFloat(form.min_lot_area_sqm);
    const maxLot = form.max_lot_area_sqm ? parseFloat(form.max_lot_area_sqm) : null;
    const minRoad = parseFloat(form.min_road_width_m);
    const recRoad = parseFloat(form.recommended_road_width_m);
    const rsMin = form.road_surface_min_thickness_cm ? parseFloat(form.road_surface_min_thickness_cm) : null;
    const rsMax = form.road_surface_max_thickness_cm ? parseFloat(form.road_surface_max_thickness_cm) : null;

    setSaving(true);
    const payload = {
      section_type: form.section_type,
      location_name: locationName,
      province_path: provincePath,
      min_lot_area_sqm: minLot,
      max_lot_area_sqm: maxLot,
      min_road_width_m: minRoad,
      recommended_road_width_m: recRoad,
      min_common_space_pct: parseFloat(form.min_common_space_pct) || 0,
      min_front_road_m: parseFloat(form.min_front_road_m) || 0,
      max_lots_per_request: form.max_lots_per_request ? parseInt(form.max_lots_per_request) : null,
      parent_min_area_sqm: parseFloat(form.parent_min_area_sqm) || 0,
      parent_max_area_sqm: form.parent_max_area_sqm ? parseFloat(form.parent_max_area_sqm) : null,
      allow_if_active_dispute: form.allow_if_active_dispute,
      allow_if_active_mortgage: form.allow_if_active_mortgage,
      require_registered_title: form.require_registered_title,
      min_title_age_years: parseInt(form.min_title_age_years) || 0,
      allow_if_pending_mutation: form.allow_if_pending_mutation,
      require_gps_coordinates: form.require_gps_coordinates,
      min_gps_points: parseInt(form.min_gps_points) || 3,
      allow_if_pending_subdivision: form.allow_if_pending_subdivision,
      exclude_title_types: form.exclude_title_types
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      notes: form.notes.trim() || null,
      is_active: form.is_active,
      // Drainage canal
      require_drainage_canal: form.require_drainage_canal,
      drainage_canal_min_width_m: form.drainage_canal_min_width_m ? parseFloat(form.drainage_canal_min_width_m) : null,
      drainage_canal_min_depth_m: form.drainage_canal_min_depth_m ? parseFloat(form.drainage_canal_min_depth_m) : null,
      drainage_canal_allowed_materials: form.drainage_canal_allowed_materials || [],
      drainage_canal_allowed_types: form.drainage_canal_allowed_types || [],
      drainage_canal_min_slope_pct: form.drainage_canal_min_slope_pct ? parseFloat(form.drainage_canal_min_slope_pct) : null,
      drainage_canal_required_sides: form.drainage_canal_required_sides || 'any',
      // Solar lighting
      require_solar_lighting: form.require_solar_lighting,
      solar_lighting_min_pole_height_m: form.solar_lighting_min_pole_height_m ? parseFloat(form.solar_lighting_min_pole_height_m) : null,
      solar_lighting_min_lumens: form.solar_lighting_min_lumens ? parseInt(form.solar_lighting_min_lumens) : null,
      solar_lighting_beam_angle_deg: form.solar_lighting_beam_angle_deg ? parseInt(form.solar_lighting_beam_angle_deg) : null,
      solar_lighting_max_spacing_m: form.solar_lighting_max_spacing_m ? parseFloat(form.solar_lighting_max_spacing_m) : null,
      solar_lighting_min_battery_hours: form.solar_lighting_min_battery_hours ? parseInt(form.solar_lighting_min_battery_hours) : null,
      solar_lighting_required_sides: form.solar_lighting_required_sides || 'any',
      // Road surface
      require_road_surface: form.require_road_surface,
      road_surface_allowed_materials: form.road_surface_allowed_materials || [],
      road_surface_min_thickness_cm: rsMin,
      road_surface_max_thickness_cm: rsMax,
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

  const requestToggleActive = (r: ZoningRule) => setToggleTarget(r);

  const confirmToggleActive = async () => {
    if (!toggleTarget) return;
    const r = toggleTarget;
    const { error } = await untypedTables.subdivision_zoning_rules()
      .update({ is_active: !r.is_active })
      .eq('id', r.id);
    if (error) toast.error('Erreur lors du changement de statut');
    else { toast.success(r.is_active ? 'Règle désactivée' : 'Règle activée'); fetchRules(); }
    setToggleTarget(null);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules
      .filter(r => filter === 'all' || r.section_type === filter)
      .filter(r => !q
        || r.location_name.toLowerCase().includes(q)
        || memoFormatBreadcrumb(r).toLowerCase().includes(q),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules, filter, search]);

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

          <div className="flex flex-wrap items-center gap-2 mb-3">
            {(['all', 'urban', 'rural'] as const).map(f => (
              <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
                {f === 'all' ? 'Toutes' : f === 'urban' ? 'Urbain' : 'Rural'}
              </Button>
            ))}
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un emplacement…"
              className="h-8 max-w-xs"
              aria-label="Rechercher une règle"
            />
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
                          : <span title={r.location_name}>{memoFormatBreadcrumb(r)}</span>}
                      </TableCell>
                      <TableCell className="text-right font-mono">{r.min_lot_area_sqm} / {r.max_lot_area_sqm ?? '∞'}</TableCell>
                      <TableCell className="text-right font-mono">{r.min_road_width_m} / {r.recommended_road_width_m}</TableCell>
                      <TableCell className="text-right font-mono">{r.min_common_space_pct}%</TableCell>
                      <TableCell className="text-right font-mono">{r.min_front_road_m}</TableCell>
                      <TableCell className="text-right font-mono">{r.max_lots_per_request ?? '∞'}</TableCell>
                      <TableCell><Switch checked={r.is_active} onCheckedChange={() => requestToggleActive(r)} aria-label={r.is_active ? 'Désactiver la règle' : 'Activer la règle'} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)} title="Modifier"><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openClone(r)} title="Cloner"><Plus className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)} title="Supprimer"><Trash2 className="h-3 w-3" /></Button>
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

      <AdminSubdivisionRoadSurfaceMaterials onChanged={fetchMaterials} />

      <AdminSubdivisionDrainageCatalog />


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

            {/* Section 3 bis — Contraintes parcelle-mère */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Contraintes sur la parcelle-mère</h3>
              </div>
              <p className="text-[11px] text-muted-foreground -mt-1">
                Conditions vérifiées dès l'ouverture du formulaire de demande de lotissement. Si l'une d'elles n'est pas respectée, la demande est bloquée en amont.
              </p>

              {/* Verrou principal — surface parcelle-mère (mis en avant) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-md border border-primary/30 bg-primary/5">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5 font-semibold">
                    <Ruler className="h-3.5 w-3.5 text-primary" />
                    Surface min parcelle-mère (m²) *
                    <FieldHelp
                      title="Surface minimale de la parcelle-mère"
                      description="Aire totale minimale (en m²) requise pour autoriser un lotissement. Vérifié côté serveur — toute soumission en deçà est rejetée (HTTP 422)."
                      example="1 000 m² pour autoriser un mini-lotissement résidentiel."
                    />
                  </Label>
                  <Input
                    type="number" step="1" inputMode="numeric"
                    value={form.parent_min_area_sqm}
                    onChange={e => setForm(f => ({ ...f, parent_min_area_sqm: e.target.value }))}
                  />
                  {(() => {
                    const pMin = parseFloat(form.parent_min_area_sqm) || 0;
                    const lMin = parseFloat(form.min_lot_area_sqm) || 0;
                    if (!pMin || !lMin) return null;
                    const capacity = Math.floor(pMin / lMin);
                    const tooSmall = pMin < lMin;
                    return (
                      <p className={`text-[10.5px] ${tooSmall ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {tooSmall
                          ? `⚠ Inférieur à la surface min d'un lot (${lMin} m²) — règle invalide.`
                          : `≈ ${capacity} lot(s) de ${lMin} m² maximum tiendraient dans cette parcelle minimale.`}
                      </p>
                    );
                  })()}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5 font-semibold">
                    <Ruler className="h-3.5 w-3.5 text-primary" />
                    Surface max parcelle-mère (m²)
                    <FieldHelp
                      title="Surface maximale de la parcelle-mère"
                      description="Aire totale au-delà de laquelle un lotissement classique n'est plus autorisé (relèverait d'une procédure d'aménagement). Laisser vide pour ne pas plafonner."
                      example="100 000 m² (10 ha)."
                    />
                  </Label>
                  <Input type="number" step="1" inputMode="numeric" value={form.parent_max_area_sqm} onChange={e => setForm(f => ({ ...f, parent_max_area_sqm: e.target.value }))} placeholder="Optionnel" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    Âge min du titre foncier (années)
                    <FieldHelp
                      title="Ancienneté minimale du titre"
                      description="Nombre d'années minimum depuis la date de délivrance du titre foncier. Permet d'éviter le lotissement de parcelles très récemment titrées (anti-spéculation)."
                      example="2 ans pour limiter la revente immédiate après titrement."
                    />
                  </Label>
                  <Input type="number" step="1" inputMode="numeric" value={form.min_title_age_years} onChange={e => setForm(f => ({ ...f, min_title_age_years: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    Nombre min de points GPS
                    <FieldHelp
                      title="Nombre minimal de sommets GPS"
                      description="Nombre minimum de points GPS (sommets) géoréférencés exigés sur la parcelle pour autoriser le lotissement. Garantit la précision du tracé."
                      example="3 pour un triangle, 4 pour un quadrilatère, etc."
                    />
                  </Label>
                  <Input type="number" step="1" inputMode="numeric" value={form.min_gps_points} onChange={e => setForm(f => ({ ...f, min_gps_points: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  Types de titres exclus (séparés par virgule)
                  <FieldHelp
                    title="Types de titres exclus du lotissement"
                    description="Types de titres fonciers qui ne permettent pas de demander un lotissement (ex: contrats temporaires). Saisir les libellés exacts séparés par des virgules."
                    example="Contrat de location, Contrat d'occupation provisoire"
                  />
                </Label>
                <Input value={form.exclude_title_types} onChange={e => setForm(f => ({ ...f, exclude_title_types: e.target.value }))} placeholder="Ex: Contrat de location, Contrat d'occupation provisoire" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { key: 'require_registered_title' as const, label: 'Exiger un certificat d\'enregistrement', desc: 'La parcelle doit posséder un titre de pleine propriété enregistré.' },
                  { key: 'require_gps_coordinates' as const, label: 'Exiger des coordonnées GPS', desc: 'La parcelle doit avoir un tracé géoréférencé valide.' },
                  { key: 'allow_if_active_dispute' as const, label: 'Autoriser si litige foncier actif', desc: 'Si désactivé : un litige actif bloque la demande.' },
                  { key: 'allow_if_active_mortgage' as const, label: 'Autoriser si hypothèque active', desc: 'Si désactivé : une hypothèque active bloque la demande.' },
                  { key: 'allow_if_pending_mutation' as const, label: 'Autoriser si mutation en cours', desc: 'Si désactivé : une mutation en attente bloque la demande.' },
                  { key: 'allow_if_pending_subdivision' as const, label: 'Autoriser si lotissement en cours', desc: 'Si désactivé : une demande de lotissement déjà ouverte sur la parcelle bloque toute nouvelle demande.' },
                ].map(opt => (
                  <label key={opt.key} className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border bg-muted/30 hover:bg-muted/60 cursor-pointer transition-colors">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium truncate">{opt.label}</span>
                      <span className="text-[10px] text-muted-foreground line-clamp-2">{opt.desc}</span>
                    </div>
                    <Switch
                      checked={form[opt.key] as boolean}
                      onCheckedChange={v => setForm(f => ({ ...f, [opt.key]: v }))}
                    />
                  </label>
                ))}
              </div>
            </section>

            <Separator />

            <InfrastructureSection form={form} setForm={setForm} drainageMaterials={drainageMaterials} drainageTypes={drainageTypes} materials={materials} roadSurfaceTariffKeys={roadSurfaceTariffKeys} />

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

      <AlertDialog open={!!toggleTarget} onOpenChange={(o) => !o && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.is_active ? 'Désactiver cette règle ?' : 'Activer cette règle ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.is_active
                ? 'Les nouvelles demandes de lotissement sur cette zone ne seront plus validées par cette règle.'
                : 'Cette règle redeviendra applicable à toutes les nouvelles demandes de lotissement sur cette zone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggleActive}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminSubdivisionZoningRules;

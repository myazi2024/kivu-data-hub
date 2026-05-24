import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Route, Droplets, Sun, Construction } from 'lucide-react';
import { SubdivisionRoad, Point2D } from '../../types';
import { edgeLengthM, type MetricFrame } from '../../utils/metrics';
import {
  DRAINAGE_CANAL_MATERIAL_LABELS,
  DRAINAGE_CANAL_TYPE_LABELS,
  type DrainageCanalSpec,
  type SolarLightingSpec,
  type RoadSurfaceSpec,
} from '../../infrastructureConstants';
import { useSubdivisionReferences } from '@/hooks/useSubdivisionReferences';
import {
  useDrainageMaterialsCatalog,
  useDrainageTypesCatalog,
} from '@/hooks/useSubdivisionDrainageCatalog';
import type { CanvasMode } from '../../LotCanvas';
import type { ZoningRule } from '@/hooks/useZoningRules';

interface Props {
  roads: SubdivisionRoad[];
  editingRoad: SubdivisionRoad | null;
  editingRoadId: string | null;
  setEditingRoadId: (id: string | null) => void;
  onDeleteRoad: (id: string) => void;
  onUpdateRoad: (id: string, updates: Partial<SubdivisionRoad>) => void;
  onAddRoad: () => void;
  canvasMode: CanvasMode;
  setCanvasMode: (mode: CanvasMode) => void;
  hasMultipleLots: boolean;
  /** Active zoning rule (used to require/validate per-road infrastructures). */
  zoningRule?: ZoningRule | null;
  /** Metric frame to compute road centerline length in meters. */
  metricFrame?: MetricFrame;
}

const formatWidth = (n: number) => Math.round(n * 10) / 10;

const defaultDrainage = (rule?: ZoningRule | null): DrainageCanalSpec => ({
  widthM: rule?.drainage_canal_min_width_m ?? 0.4,
  depthM: rule?.drainage_canal_min_depth_m ?? 0.5,
  material: rule?.drainage_canal_allowed_materials?.[0] ?? 'beton',
  type: rule?.drainage_canal_allowed_types?.[0] ?? 'couvert',
  slopePct: rule?.drainage_canal_min_slope_pct ?? 1,
  side: (rule?.drainage_canal_required_sides && rule.drainage_canal_required_sides !== 'any')
    ? rule.drainage_canal_required_sides : 'both',
});

const defaultLighting = (rule?: ZoningRule | null): SolarLightingSpec => ({
  poleHeightM: rule?.solar_lighting_min_pole_height_m ?? 6,
  lumens: rule?.solar_lighting_min_lumens ?? 3000,
  beamAngleDeg: rule?.solar_lighting_beam_angle_deg ?? 120,
  spacingM: rule?.solar_lighting_max_spacing_m ?? 25,
  batteryHours: rule?.solar_lighting_min_battery_hours ?? 10,
  side: (rule?.solar_lighting_required_sides && rule.solar_lighting_required_sides !== 'any')
    ? rule.solar_lighting_required_sides : 'both',
});

const defaultRoadSurface = (rule?: ZoningRule | null): RoadSurfaceSpec => ({
  material: rule?.road_surface_allowed_materials?.[0] ?? 'asphalt',
  thicknessCm: rule?.road_surface_min_thickness_cm ?? 5,
});

const RoadsListPanel: React.FC<Props> = ({
  roads, editingRoad, editingRoadId, setEditingRoadId,
  onDeleteRoad, onUpdateRoad, onAddRoad,
  canvasMode, setCanvasMode, hasMultipleLots, zoningRule, metricFrame,
}) => {
  const requireCanal = !!zoningRule?.require_drainage_canal;
  const requireLighting = !!zoningRule?.require_solar_lighting;
  const requireRoadSurface = !!zoningRule?.require_road_surface;
  const { labels: roadSurfaceLabels } = useSubdivisionReferences('road_surface');
  const { items: drainageMaterialsCatalog } = useDrainageMaterialsCatalog(true);
  const { items: drainageTypesCatalog } = useDrainageTypesCatalog(true);
  const drainageMaterialLabelMap = React.useMemo(() => {
    const m = new Map<string, string>(Object.entries(DRAINAGE_CANAL_MATERIAL_LABELS));
    for (const it of drainageMaterialsCatalog) m.set(it.key, it.label);
    return m;
  }, [drainageMaterialsCatalog]);
  const drainageTypeLabelMap = React.useMemo(() => {
    const m = new Map<string, string>(Object.entries(DRAINAGE_CANAL_TYPE_LABELS));
    for (const it of drainageTypesCatalog) m.set(it.key, it.label);
    return m;
  }, [drainageTypesCatalog]);

  const updateCanal = (road: SubdivisionRoad, patch: Partial<DrainageCanalSpec>) => {
    const current = road.drainageCanal ?? defaultDrainage(zoningRule);
    onUpdateRoad(road.id, { drainageCanal: { ...current, ...patch } });
  };
  const updateLighting = (road: SubdivisionRoad, patch: Partial<SolarLightingSpec>) => {
    const current = road.solarLighting ?? defaultLighting(zoningRule);
    onUpdateRoad(road.id, { solarLighting: { ...current, ...patch } });
  };
  const updateRoadSurface = (road: SubdivisionRoad, patch: Partial<RoadSurfaceSpec>) => {
    const current = road.roadSurface ?? defaultRoadSurface(zoningRule);
    onUpdateRoad(road.id, { roadSurface: { ...current, ...patch } });
  };

  return (
  <Card>
    <CardContent className="pt-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-xs flex items-center gap-1">
          <Route className="h-3.5 w-3.5" aria-hidden="true" />
          Voies ({roads.length})
        </h4>
        <div className="flex gap-1">
          <Button
            variant={canvasMode === 'selectEdge' ? 'default' : 'ghost'}
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              if (hasMultipleLots) {
                setCanvasMode(canvasMode === 'selectEdge' ? 'select' : 'selectEdge');
              } else {
                onAddRoad();
              }
            }}
            aria-label={hasMultipleLots ? 'Convertir une limite entre lots en voie' : 'Ajouter une voie'}
            title={hasMultipleLots ? 'Cliquer sur une limite entre lots' : 'Ajouter une voie'}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="space-y-1 max-h-[180px] overflow-y-auto">
        {roads.map(road => {
          const isExisting = road.isExisting;
          const isEditing = editingRoadId === road.id;
          return (
            <div
              key={road.id}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors ${isEditing ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'}`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${isExisting ? 'bg-amber-600' : 'bg-muted-foreground'}`}
                aria-hidden="true"
              />
              <button
                type="button"
                className="flex-1 text-left truncate"
                onClick={() => setEditingRoadId(isEditing ? null : road.id)}
                aria-label={`${isEditing ? 'Fermer les détails de' : 'Ouvrir les détails de'} ${road.name}`}
                aria-pressed={isEditing}
              >
                <span className="font-medium">{road.name}</span>
                <span className="text-muted-foreground ml-1">({formatWidth(road.widthM)}m)</span>
                {requireCanal && !road.drainageCanal && (
                  <Badge variant="destructive" className="ml-1 h-4 text-[9px]">Canal manquant</Badge>
                )}
                {requireLighting && !road.solarLighting && (
                  <Badge variant="destructive" className="ml-1 h-4 text-[9px]">Éclairage manquant</Badge>
                )}
                {requireRoadSurface && !road.roadSurface?.material && (
                  <Badge variant="destructive" className="ml-1 h-4 text-[9px]">Revêtement manquant</Badge>
                )}
              </button>
              {!isExisting && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-destructive hover:text-destructive"
                  onClick={() => onDeleteRoad(road.id)}
                  aria-label={`Supprimer ${road.name}`}
                  title="Supprimer cette voie"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}
        {roads.length === 0 && <p className="text-center text-muted-foreground text-[10px] py-2">Aucune voie</p>}
      </div>
      {editingRoad && (
        <>
          <Separator className="my-2" />
          <div className="space-y-2">
            <div>
              <Label htmlFor={`road-name-${editingRoad.id}`} className="text-xs">Nom</Label>
              <Input
                id={`road-name-${editingRoad.id}`}
                value={editingRoad.name}
                onChange={e => onUpdateRoad(editingRoad.id, { name: e.target.value })}
                className="h-7 text-xs"
                disabled={editingRoad.isExisting}
              />
            </div>
            <div>
              <div>
                <Label className="text-xs">Largeur ({formatWidth(editingRoad.widthM)}m)</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    min={2}
                    max={30}
                    step={0.5}
                    value={[editingRoad.widthM]}
                    onValueChange={([v]) => onUpdateRoad(editingRoad.id, { widthM: formatWidth(v) })}
                    className="flex-1"
                    aria-label="Largeur de la voie en mètres"
                  />
                  <Input
                    type="number"
                    min={2}
                    max={30}
                    step={0.5}
                    value={formatWidth(editingRoad.widthM)}
                    onChange={e => onUpdateRoad(editingRoad.id, { widthM: formatWidth(parseFloat(e.target.value) || 6) })}
                    className="h-7 text-xs w-16"
                    aria-label="Largeur (saisie numérique)"
                  />
                </div>
              </div>
            </div>

            {/* Revêtement de la voie — piloté par la règle de zonage */}
            {requireRoadSurface && (
              <div className="rounded-md border bg-card/50 p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold flex items-center gap-1">
                    <Construction className="h-3 w-3 text-stone-500" />
                    Revêtement
                  </span>
                  <Badge variant="secondary" className="h-4 text-[9px]">Requis</Badge>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <Label className="text-[10px]">Matériau</Label>
                    <Select
                      value={editingRoad.roadSurface?.material ?? ''}
                      onValueChange={v => updateRoadSurface(editingRoad, { material: v })}
                    >
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {(zoningRule?.road_surface_allowed_materials ?? []).map(m => (
                          <SelectItem key={m} value={m}>{roadSurfaceLabels[m] ?? m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Épaisseur (cm)</Label>
                    <Input type="number" step="0.5"
                      min={zoningRule?.road_surface_min_thickness_cm ?? undefined}
                      max={zoningRule?.road_surface_max_thickness_cm ?? undefined}
                      value={editingRoad.roadSurface?.thicknessCm ?? ''}
                      onChange={e => updateRoadSurface(editingRoad, { thicknessCm: parseFloat(e.target.value) || 0 })}
                      className="h-7 text-xs" />
                  </div>
                </div>
              </div>
            )}

            {/* Canal d'évacuation des eaux usées */}
            {requireCanal && (
              <div className="rounded-md border bg-card/50 p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold flex items-center gap-1">
                    <Droplets className="h-3 w-3 text-blue-500" />
                    Canal d'évacuation
                  </span>
                  <Badge variant="secondary" className="h-4 text-[9px]">Requis</Badge>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <Label className="text-[10px]">Largeur (m)</Label>
                    <Input type="number" step="0.05"
                      min={zoningRule?.drainage_canal_min_width_m ?? undefined}
                      value={editingRoad.drainageCanal?.widthM ?? ''}
                      onChange={e => updateCanal(editingRoad, { widthM: parseFloat(e.target.value) || 0 })}
                      className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Profondeur (m)</Label>
                    <Input type="number" step="0.05"
                      min={zoningRule?.drainage_canal_min_depth_m ?? undefined}
                      value={editingRoad.drainageCanal?.depthM ?? ''}
                      onChange={e => updateCanal(editingRoad, { depthM: parseFloat(e.target.value) || 0 })}
                      className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Pente (%)</Label>
                    <Input type="number" step="0.1"
                      min={zoningRule?.drainage_canal_min_slope_pct ?? undefined}
                      value={editingRoad.drainageCanal?.slopePct ?? ''}
                      onChange={e => updateCanal(editingRoad, { slopePct: parseFloat(e.target.value) || 0 })}
                      className="h-7 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <Label className="text-[10px]">Matériau</Label>
                    <Select value={editingRoad.drainageCanal?.material ?? ''} onValueChange={v => updateCanal(editingRoad, { material: v })}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {(zoningRule?.drainage_canal_allowed_materials?.length
                          ? zoningRule.drainage_canal_allowed_materials
                          : drainageMaterialsCatalog.map(m => m.key)
                        ).map(m => (
                          <SelectItem key={m} value={m}>{drainageMaterialLabelMap.get(m) ?? m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Type</Label>
                    <Select value={editingRoad.drainageCanal?.type ?? ''} onValueChange={v => updateCanal(editingRoad, { type: v })}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {(zoningRule?.drainage_canal_allowed_types?.length
                          ? zoningRule.drainage_canal_allowed_types
                          : drainageTypesCatalog.map(t => t.key)
                        ).map(t => (
                          <SelectItem key={t} value={t}>{drainageTypeLabelMap.get(t) ?? t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Côté</Label>
                    <Select value={editingRoad.drainageCanal?.side ?? 'both'} onValueChange={v => updateCanal(editingRoad, { side: v })}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Gauche</SelectItem>
                        <SelectItem value="right">Droite</SelectItem>
                        <SelectItem value="both">Les deux</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Éclairage public solaire */}
            {requireLighting && (
              <div className="rounded-md border bg-card/50 p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold flex items-center gap-1">
                    <Sun className="h-3 w-3 text-amber-500" />
                    Éclairage public solaire
                  </span>
                  <Badge variant="secondary" className="h-4 text-[9px]">Requis</Badge>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <Label className="text-[10px]">Hauteur mât (m)</Label>
                    <Input type="number" step="0.5"
                      min={zoningRule?.solar_lighting_min_pole_height_m ?? undefined}
                      value={editingRoad.solarLighting?.poleHeightM ?? ''}
                      onChange={e => updateLighting(editingRoad, { poleHeightM: parseFloat(e.target.value) || 0 })}
                      className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Lumens</Label>
                    <Input type="number" step="100"
                      min={zoningRule?.solar_lighting_min_lumens ?? undefined}
                      value={editingRoad.solarLighting?.lumens ?? ''}
                      onChange={e => updateLighting(editingRoad, { lumens: parseInt(e.target.value) || 0 })}
                      className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Faisceau (°)</Label>
                    <Input type="number" step="5"
                      max={zoningRule?.solar_lighting_beam_angle_deg ?? undefined}
                      value={editingRoad.solarLighting?.beamAngleDeg ?? ''}
                      onChange={e => updateLighting(editingRoad, { beamAngleDeg: parseInt(e.target.value) || 0 })}
                      className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Espacement (m)</Label>
                    <Input type="number" step="1"
                      max={zoningRule?.solar_lighting_max_spacing_m ?? undefined}
                      value={editingRoad.solarLighting?.spacingM ?? ''}
                      onChange={e => updateLighting(editingRoad, { spacingM: parseFloat(e.target.value) || 0 })}
                      className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Autonomie (h)</Label>
                    <Input type="number" step="1"
                      min={zoningRule?.solar_lighting_min_battery_hours ?? undefined}
                      value={editingRoad.solarLighting?.batteryHours ?? ''}
                      onChange={e => updateLighting(editingRoad, { batteryHours: parseInt(e.target.value) || 0 })}
                      className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Côté</Label>
                    <Select value={editingRoad.solarLighting?.side ?? 'both'} onValueChange={v => updateLighting(editingRoad, { side: v })}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Gauche</SelectItem>
                        <SelectItem value="right">Droite</SelectItem>
                        <SelectItem value="both">Les deux</SelectItem>
                        <SelectItem value="alternating">Alterné</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </CardContent>
  </Card>
  );
};

export default RoadsListPanel;

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Route, Ruler } from 'lucide-react';
import {
  DrainageCanalSpec, SolarLightingSpec, RoadSurfaceSpec,
  DRAINAGE_CANAL_MATERIAL_LABELS, DRAINAGE_CANAL_TYPE_LABELS, SIDE_LABELS,
} from '../infrastructureConstants';
import type { ZoningRule } from '@/hooks/useZoningRules';

export interface RoadCreationParams {
  widthM: number;
  surface: RoadSurfaceSpec | null;
  drainage: DrainageCanalSpec | null;
  lighting: SolarLightingSpec | null;
}

export interface BoundaryCreationParams {
  isBuilt: boolean;
  wallMaterial?: string;
  wallHeightM?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zoningRule?: ZoningRule | null;
  /** Liste de labels (key→label) pour le revêtement, résolue depuis `useSubdivisionReferences`. */
  roadSurfaceLabels?: Record<string, string>;
  onConfirmRoad: (params: RoadCreationParams) => void;
  onConfirmBoundary: (params: BoundaryCreationParams) => void;
  onCancel: () => void;
}

const WALL_MATERIALS = ['Parpaing', 'Brique', 'Béton', 'Pierre', 'Bois', 'Grillage', 'Autre'];

export const LineRoleDialog: React.FC<Props> = ({
  open, onOpenChange, zoningRule, roadSurfaceLabels = {}, onConfirmRoad, onConfirmBoundary, onCancel,
}) => {
  const [tab, setTab] = useState<'road' | 'boundary'>('road');

  // --- Voie ---
  const defaultWidth = zoningRule?.recommended_road_width_m || zoningRule?.min_road_width_m || 6;
  const [widthM, setWidthM] = useState(defaultWidth);
  const [hasSurface, setHasSurface] = useState<boolean>(!!zoningRule?.require_road_surface);
  const allowedSurfaces = zoningRule?.road_surface_allowed_materials || [];
  const [surfaceMaterial, setSurfaceMaterial] = useState<string>(allowedSurfaces[0] || '');
  const minThick = zoningRule?.road_surface_min_thickness_cm ?? 5;
  const maxThick = zoningRule?.road_surface_max_thickness_cm ?? 30;
  const [thicknessCm, setThicknessCm] = useState<number>(minThick);

  const [hasCanal, setHasCanal] = useState<boolean>(!!zoningRule?.require_drainage_canal);
  const [canalWidth, setCanalWidth] = useState<number>(zoningRule?.drainage_canal_min_width_m ?? 0.4);
  const [canalDepth, setCanalDepth] = useState<number>(zoningRule?.drainage_canal_min_depth_m ?? 0.5);
  const [canalMaterial, setCanalMaterial] = useState<string>(
    (zoningRule?.drainage_canal_allowed_materials || [])[0] || 'beton',
  );
  const [canalType, setCanalType] = useState<string>(
    (zoningRule?.drainage_canal_allowed_types || [])[0] || 'ouvert',
  );
  const [canalSide, setCanalSide] = useState<string>(zoningRule?.drainage_canal_required_sides || 'both');

  const [hasLighting, setHasLighting] = useState<boolean>(!!zoningRule?.require_solar_lighting);
  const [lightKind, setLightKind] = useState<'electric' | 'solar'>('solar');
  const [poleHeight, setPoleHeight] = useState<number>(zoningRule?.solar_lighting_min_pole_height_m ?? 6);
  const [spacing, setSpacing] = useState<number>(zoningRule?.solar_lighting_max_spacing_m ?? 25);
  const [lumens, setLumens] = useState<number>(zoningRule?.solar_lighting_min_lumens ?? 4000);
  const [beamAngle, setBeamAngle] = useState<number>(zoningRule?.solar_lighting_beam_angle_deg ?? 120);
  const [batteryHours, setBatteryHours] = useState<number>(zoningRule?.solar_lighting_min_battery_hours ?? 10);
  const [lightSide, setLightSide] = useState<string>(zoningRule?.solar_lighting_required_sides || 'alternating');

  // --- Limite ---
  const [isBuilt, setIsBuilt] = useState(false);
  const [wallMaterial, setWallMaterial] = useState<string>('Parpaing');
  const [wallHeight, setWallHeight] = useState<number>(2);

  // Reset à chaque ouverture.
  useEffect(() => {
    if (open) {
      setTab('road');
      setWidthM(defaultWidth);
      setHasSurface(!!zoningRule?.require_road_surface);
      setHasCanal(!!zoningRule?.require_drainage_canal);
      setHasLighting(!!zoningRule?.require_solar_lighting);
      setIsBuilt(false);
    }
  }, [open, defaultWidth, zoningRule]);

  const surfaceOptions = useMemo(() => {
    const opts = allowedSurfaces.length > 0 ? allowedSurfaces : Object.keys(roadSurfaceLabels);
    return opts.map(k => ({ key: k, label: roadSurfaceLabels[k] || k }));
  }, [allowedSurfaces, roadSurfaceLabels]);

  const confirmRoad = () => {
    onConfirmRoad({
      widthM,
      surface: hasSurface && surfaceMaterial
        ? { material: surfaceMaterial, thicknessCm }
        : null,
      drainage: hasCanal
        ? {
            widthM: canalWidth, depthM: canalDepth,
            material: canalMaterial, type: canalType, side: canalSide,
          }
        : null,
      lighting: hasLighting
        ? {
            poleHeightM: poleHeight, lumens, beamAngleDeg: beamAngle,
            spacingM: spacing, batteryHours: lightKind === 'solar' ? batteryHours : 0,
            side: lightSide,
          }
        : null,
    });
  };

  const confirmBoundary = () => {
    onConfirmBoundary({
      isBuilt,
      wallMaterial: isBuilt ? wallMaterial : undefined,
      wallHeightM: isBuilt ? wallHeight : undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rôle de la ligne tracée</DialogTitle>
          <DialogDescription>
            Indiquez si cette ligne représente une voie de desserte ou une limite séparative entre lots.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'road' | 'boundary')} className="mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="road" className="gap-1.5"><Route className="h-3.5 w-3.5" /> Voie</TabsTrigger>
            <TabsTrigger value="boundary" className="gap-1.5"><Ruler className="h-3.5 w-3.5" /> Limite</TabsTrigger>
          </TabsList>

          {/* === Voie === */}
          <TabsContent value="road" className="space-y-3 pt-3">
            <div>
              <Label className="text-xs">Largeur (m)</Label>
              <Input
                type="number" min={zoningRule?.min_road_width_m || 2} max={50} step={0.5}
                value={widthM}
                onChange={(e) => setWidthM(parseFloat(e.target.value) || 0)}
                className="h-9 text-sm"
              />
              {zoningRule?.min_road_width_m ? (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Minimum réglementaire : {zoningRule.min_road_width_m} m
                </p>
              ) : null}
            </div>

            <Separator />

            {/* Revêtement */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Revêtement</Label>
                <Switch checked={hasSurface} onCheckedChange={setHasSurface} />
              </div>
              {hasSurface && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Matériau</Label>
                    <Select value={surfaceMaterial} onValueChange={setSurfaceMaterial}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {surfaceOptions.map(o => (
                          <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Épaisseur (cm)</Label>
                    <Input
                      type="number" min={minThick} max={maxThick}
                      value={thicknessCm}
                      onChange={(e) => setThicknessCm(parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Canal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Canal d'évacuation</Label>
                <Switch checked={hasCanal} onCheckedChange={setHasCanal} />
              </div>
              {hasCanal && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Largeur (m)</Label>
                    <Input type="number" min={0.1} step={0.1} value={canalWidth}
                      onChange={(e) => setCanalWidth(parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Profondeur (m)</Label>
                    <Input type="number" min={0.1} step={0.1} value={canalDepth}
                      onChange={(e) => setCanalDepth(parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Matériau</Label>
                    <Select value={canalMaterial} onValueChange={setCanalMaterial}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(DRAINAGE_CANAL_MATERIAL_LABELS).map(([k, l]) => (
                          <SelectItem key={k} value={k}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={canalType} onValueChange={setCanalType}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(DRAINAGE_CANAL_TYPE_LABELS).map(([k, l]) => (
                          <SelectItem key={k} value={k}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Côté</Label>
                    <Select value={canalSide} onValueChange={setCanalSide}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(SIDE_LABELS).map(([k, l]) => (
                          <SelectItem key={k} value={k}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Éclairage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Éclairage public</Label>
                <Switch checked={hasLighting} onCheckedChange={setHasLighting} />
              </div>
              {hasLighting && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <Label className="text-xs">Type</Label>
                    <Select value={lightKind} onValueChange={(v) => setLightKind(v as 'electric' | 'solar')}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solar">Solaire</SelectItem>
                        <SelectItem value="electric">Électrique</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Hauteur poteau (m)</Label>
                    <Input type="number" min={2} step={0.5} value={poleHeight}
                      onChange={(e) => setPoleHeight(parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Espacement (m)</Label>
                    <Input type="number" min={5} step={1} value={spacing}
                      onChange={(e) => setSpacing(parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Intensité (lumens)</Label>
                    <Input type="number" min={500} step={500} value={lumens}
                      onChange={(e) => setLumens(parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Angle (°)</Label>
                    <Input type="number" min={30} max={360} value={beamAngle}
                      onChange={(e) => setBeamAngle(parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
                  </div>
                  {lightKind === 'solar' && (
                    <div>
                      <Label className="text-xs">Autonomie batterie (h)</Label>
                      <Input type="number" min={1} step={1} value={batteryHours}
                        onChange={(e) => setBatteryHours(parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
                    </div>
                  )}
                  <div className={lightKind === 'solar' ? '' : 'col-span-2'}>
                    <Label className="text-xs">Côté</Label>
                    <Select value={lightSide} onValueChange={setLightSide}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(SIDE_LABELS).map(([k, l]) => (
                          <SelectItem key={k} value={k}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* === Limite === */}
          <TabsContent value="boundary" className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">
              La limite découpera tous les lots qu'elle traverse. Les portions au-dessus
              d'une voie seront automatiquement scindées en limites distinctes.
            </p>
            <div className="flex items-center justify-between rounded-md border p-2.5">
              <div>
                <Label className="text-sm font-medium">Limite construite (mur)</Label>
                <p className="text-[11px] text-muted-foreground">
                  Cochez si la séparation est matérialisée par un ouvrage.
                </p>
              </div>
              <Switch checked={isBuilt} onCheckedChange={setIsBuilt} />
            </div>
            {isBuilt && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Matériau</Label>
                  <Select value={wallMaterial} onValueChange={setWallMaterial}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WALL_MATERIALS.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Hauteur (m)</Label>
                  <Input type="number" min={0.3} step={0.1} value={wallHeight}
                    onChange={(e) => setWallHeight(parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => { onCancel(); onOpenChange(false); }}>
            Annuler
          </Button>
          {tab === 'road' ? (
            <Button onClick={() => { confirmRoad(); onOpenChange(false); }}>
              Créer la voie
            </Button>
          ) : (
            <Button onClick={() => { confirmBoundary(); onOpenChange(false); }}>
              Créer la limite
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LineRoleDialog;

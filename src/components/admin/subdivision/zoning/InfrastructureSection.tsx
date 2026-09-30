import React from 'react';
import { Settings2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { RoadSurfaceMaterial } from '../../AdminSubdivisionRoadSurfaceMaterials';
import type { FormState, FormSetter } from './zoningForm';

interface CatalogItem { id: string; key: string; label: string; price_multiplier?: number | null }

interface Props {
  form: FormState;
  setForm: FormSetter;
  drainageMaterials: CatalogItem[];
  drainageTypes: CatalogItem[];
  materials: RoadSurfaceMaterial[];
  roadSurfaceTariffKeys: Set<string>;
}

/** Section « Infrastructures requises par voie » : canal, éclairage solaire, revêtement. */
export const InfrastructureSection: React.FC<Props> = ({
  form, setForm, drainageMaterials, drainageTypes, materials, roadSurfaceTariffKeys,
}) => (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Infrastructures requises par voie</h3>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Imposez la présence d'un canal d'évacuation et/ou d'un éclairage public solaire le long de chaque voie créée. Les seuils min/max sont vérifiés à la soumission.
              </p>

              {/* Canal eaux usées */}
              <div className="rounded-lg border bg-card/50 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col min-w-0">
                    <span id="zoning-lbl-drainage" className="text-xs font-semibold">Canal d'évacuation des eaux usées</span>
                    <span className="text-[10px] text-muted-foreground">Obligatoire sur chaque voie créée du lotissement.</span>
                  </div>
                  <Switch aria-labelledby="zoning-lbl-drainage" checked={form.require_drainage_canal} onCheckedChange={v => setForm(f => ({ ...f, require_drainage_canal: v }))} />
                </div>
                <fieldset disabled={!form.require_drainage_canal} className="space-y-3 disabled:opacity-50 transition-opacity">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Largeur min (m)</Label>
                      <Input type="number" step="0.05" inputMode="decimal" value={form.drainage_canal_min_width_m} onChange={e => setForm(f => ({ ...f, drainage_canal_min_width_m: e.target.value }))} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Profondeur min (m)</Label>
                      <Input type="number" step="0.05" inputMode="decimal" value={form.drainage_canal_min_depth_m} onChange={e => setForm(f => ({ ...f, drainage_canal_min_depth_m: e.target.value }))} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Pente min (%)</Label>
                      <Input type="number" step="0.1" inputMode="decimal" value={form.drainage_canal_min_slope_pct} onChange={e => setForm(f => ({ ...f, drainage_canal_min_slope_pct: e.target.value }))} className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Matériaux autorisés</Label>
                      <div className="flex flex-wrap gap-1.5 p-2 rounded border bg-background">
                        {drainageMaterials.map(m => {
                          const checked = (form.drainage_canal_allowed_materials ?? []).includes(m.key);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              role="checkbox"
                              aria-checked={checked}
                              onClick={() => setForm(f => {
                                const prev = f.drainage_canal_allowed_materials ?? [];
                                return {
                                  ...f,
                                  drainage_canal_allowed_materials: prev.includes(m.key)
                                    ? prev.filter(x => x !== m.key)
                                    : [...prev, m.key],
                                };
                              })}
                              className={`text-[11px] px-2 py-0.5 rounded border cursor-pointer transition-colors ${checked ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 hover:bg-muted'}`}
                              title={`Multiplicateur ×${(m.price_multiplier ?? 1).toFixed(2)}`}
                            >
                              {m.label} <span className="opacity-60 ml-0.5">×{(m.price_multiplier ?? 1).toFixed(2)}</span>
                            </button>
                          );
                        })}
                        {drainageMaterials.length === 0 && (
                          <span className="text-[11px] text-muted-foreground italic">Aucun matériau actif — configurez-en dans le catalogue ci-dessous.</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Types autorisés</Label>
                      <div className="flex flex-wrap gap-1.5 p-2 rounded border bg-background">
                        {drainageTypes.map(t => {
                          const checked = (form.drainage_canal_allowed_types ?? []).includes(t.key);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              role="checkbox"
                              aria-checked={checked}
                              onClick={() => setForm(f => {
                                const prev = f.drainage_canal_allowed_types ?? [];
                                return {
                                  ...f,
                                  drainage_canal_allowed_types: prev.includes(t.key)
                                    ? prev.filter(x => x !== t.key)
                                    : [...prev, t.key],
                                };
                              })}
                              className={`text-[11px] px-2 py-0.5 rounded border cursor-pointer transition-colors ${checked ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 hover:bg-muted'}`}
                              title={`Multiplicateur ×${(t.price_multiplier ?? 1).toFixed(2)}`}
                            >
                              {t.label} <span className="opacity-60 ml-0.5">×{(t.price_multiplier ?? 1).toFixed(2)}</span>
                            </button>
                          );
                        })}
                        {drainageTypes.length === 0 && (
                          <span className="text-[11px] text-muted-foreground italic">Aucun type actif — configurez-en dans le catalogue ci-dessous.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Côté requis</Label>
                    <Select value={form.drainage_canal_required_sides} onValueChange={v => setForm(f => ({ ...f, drainage_canal_required_sides: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Au choix</SelectItem>
                        <SelectItem value="left">Gauche</SelectItem>
                        <SelectItem value="right">Droite</SelectItem>
                        <SelectItem value="both">Les deux côtés</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </fieldset>
              </div>

              {/* Éclairage public solaire */}
              <div className="rounded-lg border bg-card/50 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col min-w-0">
                    <span id="zoning-lbl-solar" className="text-xs font-semibold">Éclairage public solaire</span>
                    <span className="text-[10px] text-muted-foreground">Obligatoire le long de chaque voie créée.</span>
                  </div>
                  <Switch aria-labelledby="zoning-lbl-solar" checked={form.require_solar_lighting} onCheckedChange={v => setForm(f => ({ ...f, require_solar_lighting: v }))} />
                </div>
                <fieldset disabled={!form.require_solar_lighting} className="space-y-3 disabled:opacity-50 transition-opacity">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Hauteur mât min (m)</Label>
                      <Input type="number" step="0.5" inputMode="decimal" value={form.solar_lighting_min_pole_height_m} onChange={e => setForm(f => ({ ...f, solar_lighting_min_pole_height_m: e.target.value }))} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Lumens min</Label>
                      <Input type="number" step="100" inputMode="numeric" value={form.solar_lighting_min_lumens} onChange={e => setForm(f => ({ ...f, solar_lighting_min_lumens: e.target.value }))} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Faisceau max (°)</Label>
                      <Input type="number" step="5" inputMode="numeric" value={form.solar_lighting_beam_angle_deg} onChange={e => setForm(f => ({ ...f, solar_lighting_beam_angle_deg: e.target.value }))} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Espacement max (m)</Label>
                      <Input type="number" step="1" inputMode="numeric" value={form.solar_lighting_max_spacing_m} onChange={e => setForm(f => ({ ...f, solar_lighting_max_spacing_m: e.target.value }))} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Autonomie min (h)</Label>
                      <Input type="number" step="1" inputMode="numeric" value={form.solar_lighting_min_battery_hours} onChange={e => setForm(f => ({ ...f, solar_lighting_min_battery_hours: e.target.value }))} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Côté</Label>
                      <Select value={form.solar_lighting_required_sides} onValueChange={v => setForm(f => ({ ...f, solar_lighting_required_sides: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Au choix</SelectItem>
                          <SelectItem value="left">Gauche</SelectItem>
                          <SelectItem value="right">Droite</SelectItem>
                          <SelectItem value="both">Les deux côtés</SelectItem>
                          <SelectItem value="alternating">Alterné</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </fieldset>
              </div>

              {/* Revêtement de la voie */}
              <div className="rounded-lg border bg-card/50 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col min-w-0">
                    <span id="zoning-lbl-roadsurface" className="text-xs font-semibold">Revêtement de la voie</span>
                    <span className="text-[10px] text-muted-foreground">Matériau et épaisseur appliqués globalement à toutes les voies. Tarification : tarif de base <code>road_surface</code> × <code>price_multiplier</code> du matériau (catalogue revêtements).</span>
                  </div>
                  <Switch aria-labelledby="zoning-lbl-roadsurface" checked={form.require_road_surface} onCheckedChange={v => setForm(f => ({ ...f, require_road_surface: v }))} />
                </div>
                <fieldset disabled={!form.require_road_surface} className="space-y-3 disabled:opacity-50 transition-opacity">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Matériaux autorisés <span className="text-muted-foreground">({materials.length} disponibles)</span></Label>
                    <div className="flex flex-wrap gap-1.5 p-2 rounded border bg-background min-h-[40px]">
                      {materials.length === 0 && (
                        <span className="text-[11px] text-muted-foreground italic">Aucun matériau actif — ajoutez-en dans la section dédiée ci-dessous.</span>
                      )}
                      {materials.map(m => {
                        const checked = (form.road_surface_allowed_materials ?? []).includes(m.key);
                        const hasTariff = roadSurfaceTariffKeys.has(m.key);
                        return (
                          <button
                            key={m.key}
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            title={hasTariff ? (m.description ?? '') : `${m.description ?? ''}\n⚠ Tarif de base "road_surface" manquant ou multiplicateur du matériau = 0 → frais = 0`}
                            onClick={() => setForm(f => {
                              const prev = f.road_surface_allowed_materials ?? [];
                              return {
                                ...f,
                                road_surface_allowed_materials: prev.includes(m.key)
                                  ? prev.filter(x => x !== m.key)
                                  : [...prev, m.key],
                              };
                            })}
                            className={`text-[11px] px-2 py-0.5 rounded border cursor-pointer transition-colors ${checked ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 hover:bg-muted'}`}
                          >
                            {m.label}{!hasTariff && <span className="ml-1" aria-label="Tarif manquant">⚠</span>}
                          </button>
                        );
                      })}

                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Épaisseur min (cm)</Label>
                      <Input type="number" step="0.5" inputMode="decimal" value={form.road_surface_min_thickness_cm} onChange={e => setForm(f => ({ ...f, road_surface_min_thickness_cm: e.target.value }))} className="h-8 text-xs" placeholder="ex: 5" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Épaisseur max (cm)</Label>
                      <Input type="number" step="0.5" inputMode="decimal" value={form.road_surface_max_thickness_cm} onChange={e => setForm(f => ({ ...f, road_surface_max_thickness_cm: e.target.value }))} className="h-8 text-xs" placeholder="ex: 15" />
                    </div>
                  </div>
                </fieldset>
              </div>
            </section>
);

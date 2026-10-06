import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Ruler, Compass, Info, Trash2, Check, Route, X, Lightbulb, BrickWall, AlertTriangle, DoorOpen, Pencil, Minus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ROAD_SURFACE_OPTIONS, roadSurfaceLabel } from './RoadBorderingSidesPanel';


export interface ParcelSide {
  name: string;
  length: string;
  orientation?: string;
}

// Type de limite du côté : route ou mur mitoyen
export type SideBorderType = 'route' | 'mur_mitoyen';

/** Nature de la limite non routière d'un côté : mur ou simple limite de parcelle. */
export type BoundaryKind = 'mur' | 'mur_mitoyen' | 'limite';

export interface RoadSideInfo {
  sideIndex: number;
  bordersRoad: boolean;
  /**
   * Type de limite dominant — champ dérivé conservé pour compatibilité :
   * vaut 'route' dès qu'une route est déclarée sur le côté, sinon 'mur_mitoyen'.
   */
  borderType?: SideBorderType;
  /** Le côté est bordé par une route (cumulable avec un mur). */
  hasRoad?: boolean;
  /** Le côté est fermé par un mur (cumulable avec une route). */
  hasWall?: boolean;
  // Propriétés pour les routes
  roadType?: string;
  roadName?: string;
  roadWidth?: number;
  /** Revêtement de la chaussée (voir ROAD_SURFACE_OPTIONS). */
  roadSurface?: string;
  /** Éclairage public devant la parcelle sur ce côté. */
  hasStreetLighting?: boolean;
  /** Nombre de lampadaires bordant la parcelle sur ce côté. */
  streetLampCount?: number;
  /** Présence d'un caniveau le long de ce côté. */
  hasGutter?: boolean;
  /** Parcelle raccordée au caniveau depuis ce côté (si caniveau présent). */
  gutterConnected?: boolean;
  // Propriétés pour les murs mitoyens
  /** Nature de la limite : fermée par un mur, ou simple limite de parcelle. */
  boundaryKind?: BoundaryKind;
  wallHeight?: number;
  wallMaterial?: string;
  // Propriétés communes
  orientation?: string;
  length?: number;
  isConfirmed?: boolean;
  // Entrée de la parcelle
  hasEntrance?: boolean;
}

/** Le côté borde une route (lit le nouveau champ, avec repli sur l'ancien `borderType`). */
export const sideHasRoad = (s?: Partial<RoadSideInfo> | null): boolean =>
  !!s && (s.hasRoad ?? s.borderType === 'route');

/** Le côté porte une limite déclarée (mur ou simple limite). */
export const sideHasWall = (s?: Partial<RoadSideInfo> | null): boolean =>
  !!s && (s.hasWall ?? s.borderType === 'mur_mitoyen');

/**
 * Nature de la limite d'un côté : 'mur', 'limite', ou undefined si non renseignée.
 * Repli pour les enregistrements antérieurs : un matériau de mur (ou l'ancien
 * `borderType === 'mur_mitoyen'`) vaut « mur ».
 */
export const sideBoundaryKind = (s?: Partial<RoadSideInfo> | null): BoundaryKind | undefined => {
  if (!s || !sideHasWall(s)) return undefined;
  if (s.boundaryKind) return s.boundaryKind;
  if (s.wallMaterial || s.wallHeight || s.borderType === 'mur_mitoyen') return 'mur';
  return undefined;
};

/** « Mur » et « Mur mitoyen » partagent les mêmes champs (matériau, hauteur). */
export const isWallKind = (kind?: BoundaryKind | null): boolean =>
  kind === 'mur' || kind === 'mur_mitoyen';

export const boundaryKindLabel = (kind?: BoundaryKind | null): string =>
  kind === 'mur_mitoyen' ? 'Mur mitoyen' : kind === 'limite' ? 'Limite (sans mur)' : 'Mur';

export interface ServitudeInfo {
  hasServitude: boolean;
  width?: number;
}

interface ParcelSidesDimensionsPanelProps {
  parcelSides: ParcelSide[];
  roadSides: RoadSideInfo[];
  onRoadSideUpdate: (sideIndex: number, updates: Partial<RoadSideInfo>) => void;
  servitude?: ServitudeInfo;
  onServitudeUpdate?: (servitude: ServitudeInfo) => void;
  className?: string;
  roadTypes?: Array<{ value: string; label: string }>;
  wallMaterials?: Array<{ value: string; label: string }>;
}

const defaultRoadTypes = [
  { value: 'nationale', label: 'Route Nationale' },
  { value: 'provinciale', label: 'Route Provinciale' },
  { value: 'urbaine', label: 'Route Urbaine' },
  { value: 'avenue', label: 'Avenue' },
  { value: 'rue', label: 'Rue' },
  { value: 'ruelle', label: 'Ruelle' },
  { value: 'chemin', label: 'Chemin' },
  { value: 'piste', label: 'Piste' },
];

const defaultWallMaterials = [
  { value: 'bloc', label: 'Bloc de ciment' },
  { value: 'brique', label: 'Brique' },
  { value: 'beton', label: 'Béton' },
  { value: 'pierre', label: 'Pierre' },
  { value: 'planche', label: 'Planche' },
  { value: 'mur_fortune', label: 'Mur de fortune' },
  { value: 'tole', label: 'Tôle' },
  { value: 'autre', label: 'Autre' },
];

const getOrientationColor = (orientation?: string) => {
  switch (orientation) {
    case 'Nord': return 'bg-blue-500';
    case 'Sud': return 'bg-orange-500';
    case 'Est': return 'bg-green-500';
    case 'Ouest': return 'bg-purple-500';
    default: return 'bg-muted';
  }
};

export const ParcelSidesDimensionsPanel: React.FC<ParcelSidesDimensionsPanelProps> = ({
  parcelSides,
  roadSides,
  onRoadSideUpdate,
  servitude,
  onServitudeUpdate,
  className = '',
  roadTypes = defaultRoadTypes,
  wallMaterials = defaultWallMaterials,
}) => {
  const [editingSide, setEditingSide] = useState<number | null>(null);
  const [showNotification, setShowNotification] = useState(true);
  /** Statistiques des côtés — recalculées seulement quand les côtés changent. */
  const {
    confirmedSidesCount,
    roadCount,
    wallCount,
    plainBoundaryCount,
    hasAnyRoute,
    missingEntrance,
  } = useMemo(() => {
    const confirmed = roadSides.filter(s => s.bordersRoad && s.isConfirmed);
    return {
      confirmedSidesCount: confirmed.length,
      roadCount: confirmed.filter(s => sideHasRoad(s)).length,
      wallCount: confirmed.filter(s => isWallKind(sideBoundaryKind(s))).length,
      plainBoundaryCount: confirmed.filter(s => sideBoundaryKind(s) === 'limite').length,
      hasAnyRoute: roadSides.some(s => s.bordersRoad && sideHasRoad(s)),
      missingEntrance: confirmed.length > 0 && !roadSides.some(s => s.hasEntrance),
    };
  }, [roadSides]);

  const allSidesAreMurMitoyen = parcelSides.length > 0 && !hasAnyRoute;
  const sidesCount = parcelSides.length;
  /** Côtés encore non renseignés (ni confirmés, ni en cours). */
  const remainingSideNames = useMemo(
    () =>
      parcelSides
        .map((s, i) => ({ name: s.name || `Côté ${i + 1}`, side: roadSides.find(r => r.sideIndex === i) }))
        .filter(({ side }) => !(side?.bordersRoad && side?.isConfirmed))
        .map(({ name }) => name),
    [parcelSides, roadSides]
  );

  // Reset servitude quand un côté passe en route
  useEffect(() => {
    if (!allSidesAreMurMitoyen && servitude?.hasServitude) {
      onServitudeUpdate?.({ hasServitude: false, width: undefined });
    }
  }, [allSidesAreMurMitoyen]);

  // Masquer la notification quand un élément est ajouté
  useEffect(() => {
    if (confirmedSidesCount > 0) {
      setShowNotification(false);
    }
  }, [confirmedSidesCount]);

  const handleConfirmSide = (sideIndex: number) => {
    const side = roadSides.find(s => s.sideIndex === sideIndex);
    if (side && canConfirm(side)) {
      onRoadSideUpdate(sideIndex, { isConfirmed: true });
      setEditingSide(null);
    }
  };

  const ROAD_FIELDS_RESET = {
    roadType: undefined,
    roadName: undefined,
    roadWidth: undefined,
    roadSurface: undefined,
    hasStreetLighting: undefined,
    streetLampCount: undefined,
    hasGutter: undefined,
    gutterConnected: undefined,
  } as const;

  const WALL_FIELDS_RESET = {
    wallHeight: undefined,
    wallMaterial: undefined,
  } as const;

  const handleRemoveSide = (sideIndex: number) => {
    onRoadSideUpdate(sideIndex, {
      bordersRoad: false,
      borderType: undefined,
      hasRoad: false,
      hasWall: false,
      ...ROAD_FIELDS_RESET,
      ...WALL_FIELDS_RESET,
      isConfirmed: false,
    });
    setEditingSide(null);
  };

  const handleStartEdit = (sideIndex: number) => {
    setEditingSide(sideIndex);
    setShowNotification(false);
    const roadSide = roadSides.find(s => s.sideIndex === sideIndex);
    if (!roadSide?.bordersRoad) {
      onRoadSideUpdate(sideIndex, {
        bordersRoad: true,
        borderType: undefined,
        hasRoad: undefined,
        hasWall: true,
      });
    }
  };

  /** Bascule Mur / Mur mitoyen / Limite. Un mur mitoyen désactive la route. */
  const handleBoundaryKindChange = (sideIndex: number, kind: BoundaryKind) => {
    const prev = sideBoundaryKind(roadSides.find(s => s.sideIndex === sideIndex));
    onRoadSideUpdate(sideIndex, {
      boundaryKind: kind,
      bordersRoad: true,
      hasWall: true,
      ...(prev === 'mur_mitoyen' && kind !== 'mur_mitoyen'
        ? { hasRoad: undefined, borderType: undefined }
        : {}),
      ...(kind === 'limite' ? WALL_FIELDS_RESET : {}),
      ...(kind === 'mur_mitoyen'
        ? { hasRoad: false, borderType: 'mur_mitoyen' as const, ...ROAD_FIELDS_RESET }
        : {}),
    });
  };

  /** Réponse à « Une route borde-t-elle ce côté ? ». */
  const handleRoadAnswer = (sideIndex: number, value: boolean) => {
    onRoadSideUpdate(sideIndex, value
      ? { hasRoad: true, borderType: 'route' }
      : { hasRoad: false, borderType: 'mur_mitoyen', ...ROAD_FIELDS_RESET });
  };

  const canConfirm = (side: RoadSideInfo) => {
    if (!side.bordersRoad) return false;
    const hasRoad = sideHasRoad(side);
    const kind = sideBoundaryKind(side) ?? side.boundaryKind;
    if (!kind) return false;
    if (kind !== 'mur_mitoyen' && !hasRoad && side.hasRoad !== false) return false;
    if (hasRoad) {
      const base = !!side.roadType && !!side.roadWidth && side.roadWidth > 0
        && !!side.roadSurface && side.hasStreetLighting !== undefined
        && side.hasGutter !== undefined;
      const lighting = side.hasStreetLighting !== true
        || (typeof side.streetLampCount === 'number' && side.streetLampCount > 0);
      const gutter = side.hasGutter !== true || side.gutterConnected !== undefined;
      if (!(base && lighting && gutter)) return false;
    }
    if (isWallKind(kind) && !side.wallMaterial) return false;
    if (kind === 'mur_mitoyen' && hasRoad) return false;
    return true;
  };

  const getRoadSideForIndex = (index: number) => {
    return roadSides.find(s => s.sideIndex === index);
  };

  if (parcelSides.length === 0) {
    return null;
  }

  return (
    <Card className={`max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 ${className}`}>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
          <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
            <Ruler className="h-3.5 w-3.5 text-primary" />
          </div>
          Limites et Entrées
          <div className="flex gap-1 ml-auto">
            {roadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 rounded-md bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                <Route className="h-2.5 w-2.5 mr-0.5" />
                {roadCount}
              </Badge>
            )}
            {wallCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 rounded-md bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300" title="Côtés fermés par un mur">
                <BrickWall className="h-2.5 w-2.5 mr-0.5" />
                {wallCount}
              </Badge>
            )}
            {plainBoundaryCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 rounded-md bg-muted text-muted-foreground" title="Côtés en simple limite (sans mur)">
                <Minus className="h-2.5 w-2.5 mr-0.5" />
                {plainBoundaryCount}
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Définissez les limites et l'entrée de chaque côté
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5 px-3 pb-3">
        {/* Notification intelligente */}
        {showNotification && confirmedSidesCount === 0 && (
          <div className="relative mb-2 p-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 border border-amber-200 dark:border-amber-800 animate-fade-in">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowNotification(false)}
              className="absolute top-1 right-1 h-5 w-5 p-0 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900 rounded-md"
            >
              <X className="h-3 w-3" />
            </Button>
            <div className="flex items-start gap-2 pr-4">
              <div className="h-6 w-6 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lightbulb className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                  💡 Définissez les limites et l'entrée
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                   Touchez un côté pour indiquer sa <strong>limite</strong>, puis précisez si une <strong>route</strong> le borde. Cochez enfin <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-primary/10 text-primary font-medium text-[10px]"><DoorOpen className="h-2 w-2" />Entrée</span> sur le côté d'accès.
                </p>
              </div>
            </div>
          </div>
        )}
        {parcelSides.map((side, index) => {
          const roadSide = getRoadSideForIndex(index);
          const isEditing = editingSide === index;
          const hasConfirmed = roadSide?.bordersRoad && roadSide?.isConfirmed;
          const isEditingThis = roadSide?.bordersRoad && !roadSide?.isConfirmed;
          const isRoad = sideHasRoad(roadSide);
          const isWall = sideHasWall(roadSide);
          const boundaryKind = sideBoundaryKind(roadSide);
          const isPlainBoundary = boundaryKind === 'limite';

          return (
            <div
              key={index}
              className={`p-2 rounded-xl transition-all ${
                hasConfirmed && isRoad
                  ? 'bg-green-50 dark:bg-green-950 border border-green-300 dark:border-green-800 shadow-sm'
                  : hasConfirmed && isWall && !isPlainBoundary
                  ? 'bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 shadow-sm'
                  : hasConfirmed && isPlainBoundary
                  ? 'bg-muted/50 border border-border shadow-sm'
                  : isEditingThis
                  ? 'bg-primary/5 border border-primary/30 shadow-sm'
                  : 'bg-muted/30 border border-transparent hover:bg-muted/50 cursor-pointer'
              }`}
              onClick={() => !hasConfirmed && !isEditingThis && handleStartEdit(index)}
            >
              <div className="space-y-2">
                {/* Header avec dimensions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {hasConfirmed ? (
                      <div className={`h-4 w-4 rounded-md flex items-center justify-center ${isRoad ? 'bg-green-500' : isPlainBoundary ? 'bg-muted-foreground/60' : 'bg-amber-500'}`}>
                        {isRoad ? <Route className="h-2.5 w-2.5 text-white" /> : isPlainBoundary ? <Minus className="h-2.5 w-2.5 text-white" /> : <BrickWall className="h-2.5 w-2.5 text-white" />}
                      </div>
                    ) : (
                      <div className="h-4 w-4 rounded-md bg-muted flex items-center justify-center">
                        <span className="text-[9px] font-bold text-muted-foreground">{index + 1}</span>
                      </div>
                    )}
                    <span className="font-semibold text-xs truncate max-w-[60px]">{side.name}</span>
                    {hasConfirmed && isRoad && roadSide?.roadType && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 rounded-md bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-0 truncate max-w-[50px]">
                        {roadTypes.find(t => t.value === roadSide.roadType)?.label || roadSide.roadType}
                      </Badge>
                    )}
                    {hasConfirmed && isWall && !isPlainBoundary && roadSide?.wallMaterial && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 rounded-md bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border-0 truncate max-w-[50px]">
                        {wallMaterials.find(m => m.value === roadSide.wallMaterial)?.label || roadSide.wallMaterial}
                      </Badge>
                    )}
                    {hasConfirmed && isPlainBoundary && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 rounded-md bg-muted text-muted-foreground border-0 truncate max-w-[60px]">
                        Limite
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {roadSide?.orientation && (
                      <Badge 
                        variant="outline" 
                        className={`text-[9px] h-4 px-1.5 rounded-md ${getOrientationColor(roadSide.orientation)} text-white border-0 font-medium`}
                      >
                        {roadSide.orientation}
                      </Badge>
                    )}
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        id={`entrance-${index}`}
                        checked={roadSide?.hasEntrance || false}
                        onCheckedChange={(checked) => {
                          onRoadSideUpdate(index, { hasEntrance: !!checked });
                        }}
                        className="h-3.5 w-3.5"
                      />
                      <label htmlFor={`entrance-${index}`} className="text-[10px] font-medium text-muted-foreground cursor-pointer select-none">
                        Entrée
                      </label>
                    </div>
                    {hasConfirmed && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRoadSideUpdate(index, { isConfirmed: false });
                            setEditingSide(index);
                          }}
                          className="h-6 w-6 p-0 text-primary hover:bg-primary/10 rounded-md"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSide(index);
                          }}
                          className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 rounded-md"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Résumé confirmé */}
                {hasConfirmed && isRoad && (
                  <p className="text-xs text-muted-foreground pl-6">
                    {[
                      roadSide?.roadName || null,
                      roadSide?.roadWidth ? `largeur: ${roadSide.roadWidth}m` : null,
                      roadSide?.roadSurface ? roadSurfaceLabel(roadSide.roadSurface) : null,
                      roadSide?.hasStreetLighting === true
                        ? `Éclairage public${roadSide.streetLampCount ? ` : ${roadSide.streetLampCount} lampadaire${roadSide.streetLampCount > 1 ? 's' : ''}` : ''}`
                        : roadSide?.hasStreetLighting === false ? 'Sans éclairage public' : null,
                      roadSide?.hasGutter === true
                        ? (roadSide.gutterConnected ? 'Caniveau raccordé' : 'Caniveau non raccordé')
                        : roadSide?.hasGutter === false ? 'Sans caniveau' : null,
                    ].filter(Boolean).join(' · ')}
                  </p>
                )}
                {hasConfirmed && isWall && (
                  <p className="text-xs text-muted-foreground pl-6">
                    {isPlainBoundary
                      ? 'Limite de parcelle (sans mur)'
                      : [
                          `${boundaryKind === 'mur_mitoyen' ? 'Mur mitoyen' : 'Mur'} : ${wallMaterials.find(m => m.value === roadSide?.wallMaterial)?.label || roadSide?.wallMaterial || '—'}`,
                          roadSide?.wallHeight ? `Hauteur: ${roadSide.wallHeight}m` : null,
                        ].filter(Boolean).join(' · ')}
                  </p>
                )}

                {/* Formulaire d'édition avec animation d'ouverture/fermeture */}
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    isEditingThis
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden flex flex-col">
                    {isEditingThis && isRoad && (
                      <div className="space-y-1.5 pl-6 pt-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Route className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-xs font-medium text-green-700 dark:text-green-300">Informations sur la route</span>
                        </div>

                        <Select
                          value={roadSide?.roadType || ''}
                          onValueChange={(value) =>
                            onRoadSideUpdate(index, { roadType: value })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs rounded-lg">
                            <SelectValue placeholder="Type de route *" />
                          </SelectTrigger>
                          <SelectContent>
                            {roadTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value} className="text-xs">
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Revêtement de la route */}
                        <Select
                          value={roadSide?.roadSurface || ''}
                          onValueChange={(value) =>
                            onRoadSideUpdate(index, { roadSurface: value })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs rounded-lg">
                            <SelectValue placeholder="Revêtement de la route *" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROAD_SURFACE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="grid grid-cols-2 gap-1.5">
                          <Input
                            type="text"
                            placeholder="Nom route"
                            value={roadSide?.roadName || ''}
                            onChange={(e) =>
                              onRoadSideUpdate(index, { roadName: e.target.value })
                            }
                            className="h-8 text-xs rounded-lg"
                          />
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="Largeur (m)"
                            value={roadSide?.roadWidth || ''}
                            onChange={(e) =>
                              onRoadSideUpdate(index, { roadWidth: parseFloat(e.target.value) || undefined })
                            }
                            className="h-8 text-xs rounded-lg"
                          />
                        </div>

                        {/* Éclairage public */}
                        <div className="pt-1">
                          <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                            Éclairage public devant la parcelle ? *
                          </Label>
                          <RadioGroup
                            value={roadSide?.hasStreetLighting === undefined ? '' : roadSide.hasStreetLighting ? 'oui' : 'non'}
                            onValueChange={(value) =>
                              onRoadSideUpdate(index, {
                                hasStreetLighting: value === 'oui',
                                streetLampCount: value === 'oui' ? roadSide?.streetLampCount : undefined,
                              })
                            }
                            className="flex gap-3"
                          >
                            <div className="flex items-center gap-1.5">
                              <RadioGroupItem value="oui" id={`lighting-yes-${index}`} className="h-3.5 w-3.5" />
                              <label htmlFor={`lighting-yes-${index}`} className="text-[11px] cursor-pointer select-none">Oui</label>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <RadioGroupItem value="non" id={`lighting-no-${index}`} className="h-3.5 w-3.5" />
                              <label htmlFor={`lighting-no-${index}`} className="text-[11px] cursor-pointer select-none">Non</label>
                            </div>
                          </RadioGroup>
                        </div>

                        {/* Nombre de lampadaires */}
                        {roadSide?.hasStreetLighting === true && (
                          <div className="pt-1 animate-fade-in">
                            <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                              Nombre de lampadaires qui bordent la parcelle *
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              placeholder="Ex: 2"
                              value={roadSide?.streetLampCount ?? ''}
                              onChange={(e) => {
                                const n = parseInt(e.target.value, 10);
                                onRoadSideUpdate(index, {
                                  streetLampCount: Number.isFinite(n) && n > 0 ? n : undefined,
                                });
                              }}
                              className="h-8 text-xs rounded-lg"
                            />
                          </div>
                        )}

                        {/* Présence d'un caniveau */}
                        <div className="pt-1">
                          <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                            Présence d'un caniveau *
                          </Label>
                          <RadioGroup
                            value={roadSide?.hasGutter === undefined ? '' : roadSide.hasGutter ? 'oui' : 'non'}
                            onValueChange={(value) =>
                              onRoadSideUpdate(index, {
                                hasGutter: value === 'oui',
                                gutterConnected: value === 'oui' ? roadSide?.gutterConnected : undefined,
                              })
                            }
                            className="flex gap-3"
                          >
                            <div className="flex items-center gap-1.5">
                              <RadioGroupItem value="oui" id={`gutter-yes-${index}`} className="h-3.5 w-3.5" />
                              <label htmlFor={`gutter-yes-${index}`} className="text-[11px] cursor-pointer select-none">Oui</label>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <RadioGroupItem value="non" id={`gutter-no-${index}`} className="h-3.5 w-3.5" />
                              <label htmlFor={`gutter-no-${index}`} className="text-[11px] cursor-pointer select-none">Non</label>
                            </div>
                          </RadioGroup>
                        </div>

                        {/* Raccordement au caniveau */}
                        {roadSide?.hasGutter === true && (
                          <div className="pt-1 animate-fade-in">
                            <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                              La parcelle est-elle raccordée au caniveau depuis ce côté ? *
                            </Label>
                            <RadioGroup
                              value={roadSide?.gutterConnected === undefined ? '' : roadSide.gutterConnected ? 'oui' : 'non'}
                              onValueChange={(value) =>
                                onRoadSideUpdate(index, { gutterConnected: value === 'oui' })
                              }
                              className="flex gap-3"
                            >
                              <div className="flex items-center gap-1.5">
                                <RadioGroupItem value="oui" id={`gutter-conn-yes-${index}`} className="h-3.5 w-3.5" />
                                <label htmlFor={`gutter-conn-yes-${index}`} className="text-[11px] cursor-pointer select-none">Oui</label>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <RadioGroupItem value="non" id={`gutter-conn-no-${index}`} className="h-3.5 w-3.5" />
                                <label htmlFor={`gutter-conn-no-${index}`} className="text-[11px] cursor-pointer select-none">Non</label>
                              </div>
                            </RadioGroup>
                          </div>
                        )}
                      </div>
                    )}
                    {isEditingThis && (
                      <div className="order-first space-y-1.5 pl-6 pt-2 animate-fade-in">
                        <div className="flex items-center gap-1.5 mb-1">
                          <BrickWall className="h-3.5 w-3.5 text-amber-600" />
                          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Limite de la parcelle</span>
                        </div>

                        {/* Nature de la limite : mur ou simple limite */}
                        <Select
                          value={boundaryKind || ''}
                          onValueChange={(value) =>
                            handleBoundaryKindChange(index, value as BoundaryKind)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs rounded-lg">
                            <SelectValue placeholder="Mur ou Limite *" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mur" className="text-xs">Mur</SelectItem>
                            <SelectItem value="mur_mitoyen" className="text-xs">Mur mitoyen</SelectItem>
                            <SelectItem value="limite" className="text-xs">Limite (sans mur)</SelectItem>
                          </SelectContent>
                        </Select>

                        {!boundaryKind && (
                          <p className="text-[11px] text-muted-foreground leading-snug">
                            Ce côté est-il fermé par un mur, un mur mitoyen, ou s'agit-il d'une simple limite de parcelle ?
                          </p>
                        )}

                        {boundaryKind === 'limite' && (
                          <p className="text-[11px] text-muted-foreground leading-snug animate-fade-in">
                            Aucune information supplémentaire n'est requise pour une simple limite — cliquez sur « Ajouter » pour valider ce côté.
                          </p>
                        )}

                        {boundaryKind === 'mur_mitoyen' && (
                          <p className="text-[11px] text-muted-foreground leading-snug animate-fade-in">
                            Mur partagé avec la parcelle voisine — précisez le matériau. Ce côté ne peut pas border une route.
                          </p>
                        )}

                        {isWallKind(boundaryKind) && (
                          <div className="space-y-1.5 animate-fade-in">
                            <p className="text-[11px] text-muted-foreground leading-snug">
                              Précisez le matériau du mur ; la hauteur est facultative mais utile pour l'évaluation.
                            </p>
                            <Select
                              value={roadSide?.wallMaterial || ''}
                              onValueChange={(value) =>
                                onRoadSideUpdate(index, { wallMaterial: value })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs rounded-lg">
                                <SelectValue placeholder="Matériau du mur *" />
                              </SelectTrigger>
                              <SelectContent>
                                {wallMaterials.map((material) => (
                                  <SelectItem key={material.value} value={material.value} className="text-xs">
                                    {material.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              placeholder="Hauteur du mur (m)"
                              value={roadSide?.wallHeight || ''}
                              onChange={(e) =>
                                onRoadSideUpdate(index, { wallHeight: parseFloat(e.target.value) || undefined })
                              }
                              className="h-8 text-xs rounded-lg"
                            />
                          </div>
                        )}

                        {(boundaryKind === 'mur' || boundaryKind === 'limite') && (
                          <div className="space-y-1 pt-1 animate-fade-in">
                            <p className="text-xs font-medium text-foreground">Une route borde-t-elle ce côté ? *</p>
                            <div role="radiogroup" aria-label="Une route borde-t-elle ce côté ?" className="grid grid-cols-2 gap-1.5">
                              {([['oui', true], ['non', false]] as const).map(([label, value]) => {
                                const selected = value ? isRoad : roadSide?.hasRoad === false;
                                return (
                                  <Button
                                    key={label}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    variant={selected ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRoadAnswer(index, value);
                                    }}
                                    className="h-8 text-xs rounded-lg"
                                  >
                                    {value ? 'Oui' : 'Non'}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Boutons d'action — communs aux blocs Mur et Route */}
                    {isEditingThis && (
                      <div className="order-last flex gap-1.5 pt-2 pl-6">
                        <Button
                          type="button"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmSide(index);
                          }}
                          disabled={!canConfirm(roadSide!)}
                          className="flex-1 h-7 text-xs rounded-lg gap-1"
                        >
                          <Check className="h-3 w-3" />
                          Ajouter
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSide(index);
                          }}
                          className="h-7 text-xs rounded-lg px-2"
                        >
                          Annuler
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {/* Section Servitude de passage — visible uniquement si tous les côtés sont mur mitoyen */}
        <div className={`grid transition-all duration-500 ease-out ${
          allSidesAreMurMitoyen
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        }`}>
          <div className="overflow-hidden">
            {allSidesAreMurMitoyen && (
              <div className="mt-2 space-y-2 animate-fade-in">
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-start gap-2">
                    <div className="h-6 w-6 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-orange-800 dark:text-orange-200">
                        ⚠️ Servitude de passage détectée
                      </p>
                      <p className="text-[11px] text-orange-700 dark:text-orange-300 leading-relaxed">
                        Aucun des {sidesCount} côtés de votre parcelle ne borde une route : ses limites sont des murs ou de simples limites. Cela signifie que votre parcelle est desservie par une servitude de passage.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-orange-50/50 dark:bg-orange-950/30 border border-orange-200/50 dark:border-orange-800/50">
                  <Label className="text-xs font-medium text-orange-800 dark:text-orange-200 mb-1.5 block">
                    Largeur de la servitude de passage (m) *
                  </Label>
                  <Input
                    type="number"
                    min="0.5"
                    step="0.1"
                    placeholder="Ex: 3.5"
                    value={servitude?.width || ''}
                    onChange={(e) => {
                      const width = parseFloat(e.target.value) || undefined;
                      onServitudeUpdate?.({ hasServitude: true, width });
                    }}
                    className="h-8 text-xs rounded-lg bg-background"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {confirmedSidesCount === 0 && (
          <Alert className="py-1.5 px-2 rounded-xl bg-muted/50 border-0 mt-1">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-[11px]">
              Définissez les limites et cochez l'entrée de la parcelle
            </AlertDescription>
          </Alert>
        )}

        {/* Progression : côtés restant à renseigner */}
        {confirmedSidesCount > 0 && remainingSideNames.length > 0 && (
          <Alert className="py-1.5 px-2 rounded-xl bg-muted/50 border-0 mt-1">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-[11px]">
              {confirmedSidesCount} côté{confirmedSidesCount > 1 ? 's' : ''} sur {sidesCount} renseigné{confirmedSidesCount > 1 ? 's' : ''} — il reste : {remainingSideNames.join(', ')}.
            </AlertDescription>
          </Alert>
        )}

        {/* Rappel : aucune entrée déclarée */}
        {missingEntrance && (
          <Alert className="py-1.5 px-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 mt-1">
            <DoorOpen className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-[11px] text-amber-800 dark:text-amber-200">
              Indiquez le côté par lequel on accède à la parcelle en cochant « Entrée ».
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

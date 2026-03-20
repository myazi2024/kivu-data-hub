import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Ruler, Compass, Info, Trash2, Check, Route, X, Lightbulb, BrickWall } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export interface ParcelSide {
  name: string;
  length: string;
  orientation?: string;
}

// Type de limite du côté : route ou mur mitoyen
export type SideBorderType = 'route' | 'mur_mitoyen';

export interface RoadSideInfo {
  sideIndex: number;
  bordersRoad: boolean;
  // Type de limite (route ou mur mitoyen)
  borderType?: SideBorderType;
  // Propriétés pour les routes
  roadType?: string;
  roadName?: string;
  roadWidth?: number;
  // Propriétés pour les murs mitoyens
  wallHeight?: number;
  wallMaterial?: string;
  // Propriétés communes
  orientation?: string;
  length?: number;
  isConfirmed?: boolean;
}

interface ParcelSidesDimensionsPanelProps {
  parcelSides: ParcelSide[];
  roadSides: RoadSideInfo[];
  onRoadSideUpdate: (sideIndex: number, updates: Partial<RoadSideInfo>) => void;
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
  className = '',
  roadTypes = defaultRoadTypes,
  wallMaterials = defaultWallMaterials,
}) => {
  const [editingSide, setEditingSide] = useState<number | null>(null);
  const [showNotification, setShowNotification] = useState(true);
  const confirmedSidesCount = roadSides.filter(s => s.bordersRoad && s.isConfirmed).length;
  const roadCount = roadSides.filter(s => s.bordersRoad && s.isConfirmed && s.borderType === 'route').length;
  const wallCount = roadSides.filter(s => s.bordersRoad && s.isConfirmed && s.borderType === 'mur_mitoyen').length;
  const totalPerimeter = parcelSides.reduce((sum, side) => sum + parseFloat(side.length || '0'), 0);

  // Masquer la notification quand un élément est ajouté
  useEffect(() => {
    if (confirmedSidesCount > 0) {
      setShowNotification(false);
    }
  }, [confirmedSidesCount]);

  const handleConfirmSide = (sideIndex: number) => {
    const side = roadSides.find(s => s.sideIndex === sideIndex);
    if (side && side.bordersRoad) {
      // Validation selon le type
      if (side.borderType === 'route' && side.roadType) {
        onRoadSideUpdate(sideIndex, { isConfirmed: true });
        setEditingSide(null);
      } else if (side.borderType === 'mur_mitoyen' && side.wallMaterial) {
        onRoadSideUpdate(sideIndex, { isConfirmed: true });
        setEditingSide(null);
      }
    }
  };

  const handleRemoveSide = (sideIndex: number) => {
    onRoadSideUpdate(sideIndex, { 
      bordersRoad: false, 
      borderType: undefined,
      roadType: undefined, 
      roadName: undefined, 
      roadWidth: undefined,
      wallHeight: undefined,
      wallMaterial: undefined,
      isConfirmed: false 
    });
    setEditingSide(null);
  };

  const handleStartEdit = (sideIndex: number) => {
    setEditingSide(sideIndex);
    setShowNotification(false);
    const roadSide = roadSides.find(s => s.sideIndex === sideIndex);
    if (!roadSide?.bordersRoad) {
      onRoadSideUpdate(sideIndex, { bordersRoad: true, borderType: 'mur_mitoyen' });
    }
  };

  const handleBorderTypeChange = (sideIndex: number, borderType: SideBorderType) => {
    onRoadSideUpdate(sideIndex, { 
      borderType,
      // Reset les champs de l'autre type
      roadType: borderType === 'route' ? undefined : undefined,
      roadName: borderType === 'route' ? undefined : undefined,
      roadWidth: borderType === 'route' ? undefined : undefined,
      wallHeight: borderType === 'mur_mitoyen' ? undefined : undefined,
      wallMaterial: borderType === 'mur_mitoyen' ? undefined : undefined,
    });
  };

  const canConfirm = (side: RoadSideInfo) => {
    if (!side.bordersRoad) return false;
    if (side.borderType === 'route') return !!side.roadType;
    if (side.borderType === 'mur_mitoyen') return !!side.wallMaterial;
    return false;
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
          Dimensions & Limites
          <div className="flex gap-1 ml-auto">
            {roadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 rounded-md bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                <Route className="h-2.5 w-2.5 mr-0.5" />
                {roadCount}
              </Badge>
            )}
            {wallCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 rounded-md bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                <BrickWall className="h-2.5 w-2.5 mr-0.5" />
                {wallCount}
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Cliquez sur un côté pour indiquer une route ou un mur mitoyen
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
                  💡 Indiquez les limites de chaque côté
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                  Cliquez sur <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-primary/10 text-primary font-medium text-[10px]"><Route className="h-2 w-2" />Route</span> ou <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300 font-medium text-[10px]"><BrickWall className="h-2 w-2" />Mur</span>
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
          const isRoad = roadSide?.borderType === 'route';
          const isWall = roadSide?.borderType === 'mur_mitoyen';

          return (
            <div
              key={index}
              className={`p-2 rounded-xl transition-all ${
                hasConfirmed && isRoad
                  ? 'bg-green-50 dark:bg-green-950 border border-green-300 dark:border-green-800 shadow-sm'
                  : hasConfirmed && isWall
                  ? 'bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 shadow-sm'
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
                      <div className={`h-4 w-4 rounded-md flex items-center justify-center ${isRoad ? 'bg-green-500' : 'bg-amber-500'}`}>
                        {isRoad ? <Route className="h-2.5 w-2.5 text-white" /> : <BrickWall className="h-2.5 w-2.5 text-white" />}
                      </div>
                    ) : isEditingThis ? (
                      <Checkbox
                        id={`side-${index}`}
                        checked={true}
                        onCheckedChange={(checked) => {
                          if (!checked) {
                            handleRemoveSide(index);
                          }
                        }}
                        className="h-4 w-4 rounded-md"
                      />
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
                    {hasConfirmed && isWall && roadSide?.wallMaterial && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 rounded-md bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border-0 truncate max-w-[50px]">
                        {wallMaterials.find(m => m.value === roadSide.wallMaterial)?.label || roadSide.wallMaterial}
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
                    <Badge variant="secondary" className="font-mono text-xs h-5 px-1.5 rounded-md font-bold whitespace-nowrap">
                      {side.length}m
                    </Badge>
                    {/* Boutons pour ajouter route ou mur - visible uniquement si pas confirmé */}
                    {!hasConfirmed && !isEditingThis && (
                      <div className="flex gap-0.5">
                        <Button
                          type="button"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRoadSideUpdate(index, { bordersRoad: true, borderType: 'route' });
                            setEditingSide(index);
                            setShowNotification(false);
                          }}
                          className="h-6 px-2 text-[10px] rounded-md gap-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white border-0 shadow-sm font-medium"
                        >
                          <Route className="h-3 w-3" />
                          Route
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRoadSideUpdate(index, { bordersRoad: true, borderType: 'mur_mitoyen' });
                            setEditingSide(index);
                            setShowNotification(false);
                          }}
                          className="h-6 px-2 text-[10px] rounded-md gap-1 bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600 text-white border-0 shadow-sm font-medium"
                        >
                          <BrickWall className="h-3 w-3" />
                          Mur
                        </Button>
                      </div>
                    )}
                    {hasConfirmed && (
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
                    )}
                  </div>
                </div>

                {/* Résumé confirmé */}
                {hasConfirmed && isRoad && roadSide?.roadName && (
                  <p className="text-xs text-muted-foreground pl-6">
                    {roadSide.roadName} {roadSide.roadWidth ? `(largeur: ${roadSide.roadWidth}m)` : ''}
                  </p>
                )}
                {hasConfirmed && isWall && (
                  <p className="text-xs text-muted-foreground pl-6">
                    {roadSide?.wallHeight ? `Hauteur: ${roadSide.wallHeight}m` : ''}
                  </p>
                )}

                {/* Formulaire d'édition */}
                {isEditingThis && (
                  <div className="space-y-1.5 pl-6 animate-fade-in">
                    {/* Toggle entre Route et Mur */}
                    <ToggleGroup 
                      type="single" 
                      value={roadSide?.borderType || 'route'} 
                      onValueChange={(value) => value && handleBorderTypeChange(index, value as SideBorderType)}
                      className="justify-start"
                    >
                      <ToggleGroupItem 
                        value="route" 
                        aria-label="Route"
                        className="h-7 px-2 text-xs data-[state=on]:bg-green-100 data-[state=on]:text-green-700 dark:data-[state=on]:bg-green-900 dark:data-[state=on]:text-green-300"
                      >
                        <Route className="h-3 w-3 mr-1" />
                        Route
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="mur_mitoyen" 
                        aria-label="Mur mitoyen"
                        className="h-7 px-2 text-xs data-[state=on]:bg-amber-100 data-[state=on]:text-amber-700 dark:data-[state=on]:bg-amber-900 dark:data-[state=on]:text-amber-300"
                      >
                        <BrickWall className="h-3 w-3 mr-1" />
                        Mur mitoyen
                      </ToggleGroupItem>
                    </ToggleGroup>

                    {/* Champs pour Route */}
                    {roadSide?.borderType === 'route' && (
                      <>
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
                      </>
                    )}

                    {/* Champs pour Mur mitoyen */}
                    {roadSide?.borderType === 'mur_mitoyen' && (
                      <>
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
                      </>
                    )}

                    {/* Boutons d'action */}
                    <div className="flex gap-1.5 pt-1">
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
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Message indicatif */}
        {confirmedSidesCount === 0 && (
          <Alert className="py-1.5 px-2 rounded-xl bg-muted/50 border-0 mt-1">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-[11px]">
              Cliquez sur un côté pour indiquer une route ou un mur mitoyen
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

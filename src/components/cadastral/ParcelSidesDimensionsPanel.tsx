import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ruler, Compass, Info, Trash2, Check, Route } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface ParcelSide {
  name: string;
  length: string;
  orientation?: string;
}

export interface RoadSideInfo {
  sideIndex: number;
  bordersRoad: boolean;
  roadType?: string;
  roadName?: string;
  roadWidth?: number;
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
}) => {
  const [editingSide, setEditingSide] = useState<number | null>(null);
  const roadBorderingSidesCount = roadSides.filter(s => s.bordersRoad && s.isConfirmed).length;
  const totalPerimeter = parcelSides.reduce((sum, side) => sum + parseFloat(side.length || '0'), 0);

  const handleConfirmRoad = (sideIndex: number) => {
    const side = roadSides.find(s => s.sideIndex === sideIndex);
    if (side && side.bordersRoad && side.roadType) {
      onRoadSideUpdate(sideIndex, { isConfirmed: true });
      setEditingSide(null);
    }
  };

  const handleRemoveRoad = (sideIndex: number) => {
    onRoadSideUpdate(sideIndex, { 
      bordersRoad: false, 
      roadType: undefined, 
      roadName: undefined, 
      roadWidth: undefined,
      isConfirmed: false 
    });
    setEditingSide(null);
  };

  const handleStartEdit = (sideIndex: number) => {
    setEditingSide(sideIndex);
    const roadSide = roadSides.find(s => s.sideIndex === sideIndex);
    if (!roadSide?.bordersRoad) {
      onRoadSideUpdate(sideIndex, { bordersRoad: true });
    }
  };

  const canConfirm = (side: RoadSideInfo) => {
    return side.bordersRoad && side.roadType;
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
          Dimensions & Routes
          {roadBorderingSidesCount > 0 && (
            <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5 rounded-md bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
              <Route className="h-2.5 w-2.5 mr-0.5" />
              {roadBorderingSidesCount} route{roadBorderingSidesCount > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Côtés de la parcelle • Cliquez pour indiquer une route
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5 px-3 pb-3">
        {parcelSides.map((side, index) => {
          const roadSide = getRoadSideForIndex(index);
          const isEditing = editingSide === index;
          const hasRoad = roadSide?.bordersRoad && roadSide?.isConfirmed;
          const isEditingThis = roadSide?.bordersRoad && !roadSide?.isConfirmed;

          return (
            <div
              key={index}
              className={`p-2 rounded-xl transition-all ${
                hasRoad
                  ? 'bg-green-50 dark:bg-green-950 border border-green-300 dark:border-green-800 shadow-sm'
                  : isEditingThis
                  ? 'bg-primary/5 border border-primary/30 shadow-sm'
                  : 'bg-muted/30 border border-transparent hover:bg-muted/50 cursor-pointer'
              }`}
              onClick={() => !hasRoad && !isEditingThis && handleStartEdit(index)}
            >
              <div className="space-y-2">
                {/* Header avec dimensions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {hasRoad ? (
                      <div className="h-4 w-4 rounded-md bg-green-500 flex items-center justify-center">
                        <Route className="h-2.5 w-2.5 text-white" />
                      </div>
                    ) : isEditingThis ? (
                      <Checkbox
                        id={`side-${index}`}
                        checked={true}
                        onCheckedChange={(checked) => {
                          if (!checked) {
                            handleRemoveRoad(index);
                          }
                        }}
                        className="h-4 w-4 rounded-md"
                      />
                    ) : (
                      <div className="h-4 w-4 rounded-md bg-muted flex items-center justify-center">
                        <span className="text-[9px] font-bold text-muted-foreground">{index + 1}</span>
                      </div>
                    )}
                    <span className="font-semibold text-sm">{side.name}</span>
                    {hasRoad && roadSide?.roadType && (
                      <Badge variant="outline" className="text-xs h-5 px-1.5 rounded-md bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-0">
                        {roadTypes.find(t => t.value === roadSide.roadType)?.label || roadSide.roadType}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Orientation depuis roadSide qui contient les données calculées */}
                    {roadSide?.orientation && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs h-5 px-2 rounded-md ${getOrientationColor(roadSide.orientation)} text-white border-0 font-medium`}
                      >
                        {roadSide.orientation}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="font-mono text-sm h-6 px-2 rounded-md font-bold">
                      {side.length} m
                    </Badge>
                    {/* Bouton dédié pour ajouter une route - visible uniquement si pas de route */}
                    {!hasRoad && !isEditingThis && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(index);
                        }}
                        className="h-6 px-2 text-xs rounded-md gap-1 bg-primary/5 hover:bg-primary/10 border-primary/30 text-primary"
                      >
                        <Route className="h-3 w-3" />
                        Route
                      </Button>
                    )}
                    {hasRoad && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveRoad(index);
                        }}
                        className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 rounded-md"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Résumé route confirmée */}
                {hasRoad && roadSide?.roadName && (
                  <p className="text-xs text-muted-foreground pl-6">
                    {roadSide.roadName} {roadSide.roadWidth ? `(largeur: ${roadSide.roadWidth}m)` : ''}
                  </p>
                )}

                {/* Formulaire d'édition route */}
                {isEditingThis && (
                  <div className="space-y-1.5 pl-6 animate-fade-in">
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

                    {/* Boutons d'action */}
                    <div className="flex gap-1.5 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmRoad(index);
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
                          handleRemoveRoad(index);
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
        {roadBorderingSidesCount === 0 && (
          <Alert className="py-1.5 px-2 rounded-xl bg-muted/50 border-0 mt-1">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-[11px]">
              Cliquez sur un côté pour indiquer qu'il borde une route
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

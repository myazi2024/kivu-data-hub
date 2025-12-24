import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Compass, Info, Plus, Trash2, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

interface RoadBorderingSidesPanelProps {
  sides: RoadSideInfo[];
  onSideUpdate: (sideIndex: number, updates: Partial<RoadSideInfo>) => void;
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

export const RoadBorderingSidesPanel: React.FC<RoadBorderingSidesPanelProps> = ({
  sides,
  onSideUpdate,
  className = '',
  roadTypes = defaultRoadTypes,
}) => {
  const [editingSide, setEditingSide] = useState<number | null>(null);
  const roadBorderingSidesCount = sides.filter(s => s.bordersRoad && s.isConfirmed).length;

  const handleConfirmRoad = (sideIndex: number) => {
    const side = sides.find(s => s.sideIndex === sideIndex);
    if (side && side.bordersRoad && side.roadType) {
      onSideUpdate(sideIndex, { isConfirmed: true });
      setEditingSide(null);
    }
  };

  const handleRemoveRoad = (sideIndex: number) => {
    onSideUpdate(sideIndex, { 
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
    if (!sides.find(s => s.sideIndex === sideIndex)?.bordersRoad) {
      onSideUpdate(sideIndex, { bordersRoad: true });
    }
  };

  const canConfirm = (side: RoadSideInfo) => {
    return side.bordersRoad && side.roadType;
  };

  return (
    <Card className={`max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 ${className}`}>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
          <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
            <Compass className="h-3.5 w-3.5 text-primary" />
          </div>
          Côtés bordant une route
          {roadBorderingSidesCount > 0 && (
            <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5 rounded-md">
              {roadBorderingSidesCount} route{roadBorderingSidesCount > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Sélectionnez un côté et ajoutez les infos de la route
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3">
        {sides.length === 0 ? (
          <Alert className="py-1.5 px-2 rounded-xl bg-muted/50 border-0">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-[11px]">
              Saisissez d'abord les coordonnées GPS (min. 3 bornes)
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-1.5">
            {sides.map((side) => (
              <div
                key={side.sideIndex}
                className={`p-2 rounded-xl transition-all ${
                  side.bordersRoad && side.isConfirmed
                    ? 'bg-green-50 dark:bg-green-950 border border-green-300 dark:border-green-800 shadow-sm'
                    : side.bordersRoad
                    ? 'bg-primary/5 border border-primary/30 shadow-sm'
                    : 'bg-muted/30 border border-transparent hover:bg-muted/50 cursor-pointer'
                }`}
                onClick={() => !side.bordersRoad && !side.isConfirmed && handleStartEdit(side.sideIndex)}
              >
                <div className="space-y-2">
                  {/* Header compact */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {side.isConfirmed ? (
                        <div className="h-4 w-4 rounded-md bg-green-500 flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      ) : (
                        <Checkbox
                          id={`side-${side.sideIndex}`}
                          checked={side.bordersRoad}
                          onCheckedChange={(checked) => {
                            onSideUpdate(side.sideIndex, { bordersRoad: checked as boolean });
                            if (checked) {
                              setEditingSide(side.sideIndex);
                            } else {
                              setEditingSide(null);
                            }
                          }}
                          className="h-4 w-4 rounded-md"
                        />
                      )}
                      <Label
                        htmlFor={`side-${side.sideIndex}`}
                        className="font-medium text-sm cursor-pointer"
                      >
                        Côté {side.sideIndex + 1}
                      </Label>
                      {side.isConfirmed && side.roadType && (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 rounded-md bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-0">
                          {roadTypes.find(t => t.value === side.roadType)?.label || side.roadType}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {side.orientation && (
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] h-5 px-1.5 rounded-md ${getOrientationColor(side.orientation)} text-white border-0`}
                        >
                          {side.orientation}
                        </Badge>
                      )}
                      {side.length && (
                        <Badge variant="secondary" className="font-mono text-[10px] h-5 px-1.5 rounded-md">
                          {side.length.toFixed(1)}m
                        </Badge>
                      )}
                      {side.isConfirmed && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveRoad(side.sideIndex);
                          }}
                          className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 rounded-md"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Résumé route confirmée */}
                  {side.isConfirmed && side.roadName && (
                    <p className="text-xs text-muted-foreground pl-6">
                      {side.roadName} {side.roadWidth ? `(${side.roadWidth}m)` : ''}
                    </p>
                  )}

                  {/* Formulaire d'édition - compact */}
                  {side.bordersRoad && !side.isConfirmed && (
                    <div className="space-y-1.5 pl-6 animate-fade-in">
                      <Select
                        value={side.roadType || ''}
                        onValueChange={(value) => 
                          onSideUpdate(side.sideIndex, { roadType: value })
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
                          value={side.roadName || ''}
                          onChange={(e) => 
                            onSideUpdate(side.sideIndex, { roadName: e.target.value })
                          }
                          className="h-8 text-xs rounded-lg"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="Largeur (m)"
                          value={side.roadWidth || ''}
                          onChange={(e) => 
                            onSideUpdate(side.sideIndex, { roadWidth: parseFloat(e.target.value) || undefined })
                          }
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>

                      {/* Boutons d'action */}
                      <div className="flex gap-1.5 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleConfirmRoad(side.sideIndex)}
                          disabled={!canConfirm(side)}
                          className="flex-1 h-7 text-xs rounded-lg gap-1"
                        >
                          <Check className="h-3 w-3" />
                          Ajouter
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveRoad(side.sideIndex)}
                          className="h-7 text-xs rounded-lg px-2"
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Message si aucune route confirmée */}
        {sides.length > 0 && roadBorderingSidesCount === 0 && (
          <Alert className="py-1.5 px-2 rounded-xl bg-muted/50 border-0 mt-2">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-[11px]">
              Cliquez sur un côté pour ajouter une route
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
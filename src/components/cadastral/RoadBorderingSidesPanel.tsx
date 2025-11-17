import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Compass, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface RoadSideInfo {
  sideIndex: number;
  bordersRoad: boolean;
  roadType?: string;
  roadName?: string;
  roadWidth?: number;
  orientation?: string;
  length?: number;
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
  const roadBorderingSidesCount = sides.filter(s => s.bordersRoad).length;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Compass className="h-5 w-5" />
          Côtés Bordant une Route
        </CardTitle>
        <CardDescription>
          Sélectionnez les côtés de la parcelle qui touchent une route. Vous pouvez cliquer sur la carte ou utiliser les cases ci-dessous.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {roadBorderingSidesCount === 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Aucun côté bordant une route n'a été sélectionné. Cliquez sur un segment de la parcelle sur la carte ou cochez les cases ci-dessous.
            </AlertDescription>
          </Alert>
        )}

        {sides.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Veuillez d'abord saisir les coordonnées GPS de la parcelle pour définir les côtés.
          </p>
        ) : (
          <div className="space-y-3">
            {sides.map((side) => (
              <div
                key={side.sideIndex}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  side.bordersRoad
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background'
                }`}
              >
                <div className="space-y-3">
                  {/* Header: Checkbox + Side Number + Orientation + Length */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`side-${side.sideIndex}`}
                        checked={side.bordersRoad}
                        onCheckedChange={(checked) =>
                          onSideUpdate(side.sideIndex, { bordersRoad: checked as boolean })
                        }
                      />
                      <Label
                        htmlFor={`side-${side.sideIndex}`}
                        className="font-semibold cursor-pointer"
                      >
                        Côté {side.sideIndex + 1}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      {side.orientation && (
                        <Badge variant="outline" className={getOrientationColor(side.orientation)}>
                          <Compass className="h-3 w-3 mr-1" />
                          {side.orientation}
                        </Badge>
                      )}
                      {side.length && (
                        <Badge variant="secondary">
                          {side.length.toFixed(2)}m
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Road Details (only if bordersRoad is checked) */}
                  {side.bordersRoad && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-7">
                      <div className="space-y-2">
                        <Label htmlFor={`roadType-${side.sideIndex}`} className="text-xs">
                          Type de route
                        </Label>
                        <Select
                          value={side.roadType || ''}
                          onValueChange={(value) =>
                            onSideUpdate(side.sideIndex, { roadType: value })
                          }
                        >
                          <SelectTrigger id={`roadType-${side.sideIndex}`}>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            {roadTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`roadName-${side.sideIndex}`} className="text-xs">
                          Nom de la route
                        </Label>
                        <Input
                          id={`roadName-${side.sideIndex}`}
                          value={side.roadName || ''}
                          onChange={(e) =>
                            onSideUpdate(side.sideIndex, { roadName: e.target.value })
                          }
                          placeholder="Ex: Avenue de la Paix"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`roadWidth-${side.sideIndex}`} className="text-xs">
                          Largeur (m)
                        </Label>
                        <Input
                          id={`roadWidth-${side.sideIndex}`}
                          type="number"
                          min="1"
                          step="0.1"
                          value={side.roadWidth || ''}
                          onChange={(e) =>
                            onSideUpdate(side.sideIndex, {
                              roadWidth: e.target.value ? parseFloat(e.target.value) : undefined,
                            })
                          }
                          placeholder="Ex: 8"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {roadBorderingSidesCount > 0 && (
          <Alert className="bg-primary/5 border-primary/20">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-primary">
              {roadBorderingSidesCount} côté{roadBorderingSidesCount > 1 ? 's' : ''} bordant une route {roadBorderingSidesCount > 1 ? 'sélectionnés' : 'sélectionné'}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

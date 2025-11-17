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
      <CardHeader className="pb-3 md:pb-4">
        <CardTitle className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
          <Compass className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
          Côtés Bordant une Route
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Sélectionnez les côtés touchant une route (carte ou cases).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5 md:space-y-4">
        {roadBorderingSidesCount === 0 && (
          <Alert className="py-2 md:py-3">
            <Info className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <AlertDescription className="text-xs md:text-sm">
              Aucun côté sélectionné. Cliquez sur la carte ou cochez ci-dessous.
            </AlertDescription>
          </Alert>
        )}

        {sides.length === 0 ? (
          <p className="text-xs md:text-sm text-muted-foreground">
            Saisissez d'abord les coordonnées GPS.
          </p>
        ) : (
          <div className="space-y-2 md:space-y-3">
            {sides.map((side) => (
              <div
                key={side.sideIndex}
                className={`p-2.5 md:p-4 rounded-lg border-2 transition-colors ${
                  side.bordersRoad
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background'
                }`}
              >
                <div className="space-y-2 md:space-y-3">
                  {/* Header: Checkbox + Side Number + Orientation + Length */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 md:gap-3">
                      <Checkbox
                        id={`side-${side.sideIndex}`}
                        checked={side.bordersRoad}
                        onCheckedChange={(checked) =>
                          onSideUpdate(side.sideIndex, { bordersRoad: checked as boolean })
                        }
                        className="h-4 w-4"
                      />
                      <Label
                        htmlFor={`side-${side.sideIndex}`}
                        className="font-medium text-xs md:text-sm cursor-pointer"
                      >
                        Côté #{side.sideIndex + 1}
                      </Label>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2 flex-wrap justify-end">
                      {side.orientation && (
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] md:text-xs h-5 md:h-6 px-1.5 ${getOrientationColor(side.orientation)}`}
                        >
                          {side.orientation}
                        </Badge>
                      )}
                      {side.length && (
                        <Badge variant="secondary" className="font-mono text-[10px] md:text-xs h-5 md:h-6 px-1.5">
                          {side.length.toFixed(1)}m
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Road Details - Only shown if bordersRoad is true */}
                  {side.bordersRoad && (
                    <div className="space-y-2 md:space-y-3 pl-6 md:pl-8 animate-fade-in">
                      <div className="space-y-1.5">
                        <Label htmlFor={`roadType-${side.sideIndex}`} className="text-xs md:text-sm">
                          Type de route *
                        </Label>
                        <Select
                          value={side.roadType || ''}
                          onValueChange={(value) => 
                            onSideUpdate(side.sideIndex, { roadType: value })
                          }
                        >
                          <SelectTrigger id={`roadType-${side.sideIndex}`} className="h-8 md:h-9 text-xs md:text-sm">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {roadTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value} className="text-xs md:text-sm">
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor={`roadName-${side.sideIndex}`} className="text-xs md:text-sm">
                            Nom de la route
                          </Label>
                          <Input
                            id={`roadName-${side.sideIndex}`}
                            type="text"
                            placeholder="ex: Av. Mobutu"
                            value={side.roadName || ''}
                            onChange={(e) => 
                              onSideUpdate(side.sideIndex, { roadName: e.target.value })
                            }
                            className="h-8 md:h-9 text-xs md:text-sm"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor={`roadWidth-${side.sideIndex}`} className="text-xs md:text-sm">
                            Largeur (m)
                          </Label>
                          <Input
                            id={`roadWidth-${side.sideIndex}`}
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="ex: 15"
                            value={side.roadWidth || ''}
                            onChange={(e) => 
                              onSideUpdate(side.sideIndex, { roadWidth: parseFloat(e.target.value) || undefined })
                            }
                            className="h-8 md:h-9 text-xs md:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

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
    <Card className={`max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 ${className}`}>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
          <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
            <Compass className="h-3.5 w-3.5 text-primary" />
          </div>
          Côtés bordant une route
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Cochez les côtés touchant une route
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3">
        {roadBorderingSidesCount === 0 && (
          <Alert className="py-1.5 px-2 rounded-xl bg-muted/50 border-0">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-[11px]">
              Aucun côté sélectionné
            </AlertDescription>
          </Alert>
        )}

        {sides.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            Saisissez d'abord les coordonnées GPS
          </p>
        ) : (
          <div className="space-y-1.5">
            {sides.map((side) => (
              <div
                key={side.sideIndex}
                className={`p-2 rounded-xl transition-all ${
                  side.bordersRoad
                    ? 'bg-primary/5 border border-primary/30 shadow-sm'
                    : 'bg-muted/30 border border-transparent'
                }`}
              >
                <div className="space-y-2">
                  {/* Header compact */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`side-${side.sideIndex}`}
                        checked={side.bordersRoad}
                        onCheckedChange={(checked) =>
                          onSideUpdate(side.sideIndex, { bordersRoad: checked as boolean })
                        }
                        className="h-4 w-4 rounded-md"
                      />
                      <Label
                        htmlFor={`side-${side.sideIndex}`}
                        className="font-medium text-sm cursor-pointer"
                      >
                        Côté {side.sideIndex + 1}
                      </Label>
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
                    </div>
                  </div>

                  {/* Détails route - compact */}
                  {side.bordersRoad && (
                    <div className="space-y-1.5 pl-6 animate-fade-in">
                      <Select
                        value={side.roadType || ''}
                        onValueChange={(value) => 
                          onSideUpdate(side.sideIndex, { roadType: value })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs rounded-lg">
                          <SelectValue placeholder="Type de route" />
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

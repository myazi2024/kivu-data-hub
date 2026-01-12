import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Trash2,
  Route,
  ArrowRight
} from 'lucide-react';
import { InternalRoad, LotData, SURFACE_TYPES } from './types';

interface InternalRoadsEditorProps {
  roads: InternalRoad[];
  onRoadsChange: (roads: InternalRoad[]) => void;
  lots: LotData[];
}

export const InternalRoadsEditor: React.FC<InternalRoadsEditorProps> = ({
  roads,
  onRoadsChange,
  lots
}) => {
  const addRoad = () => {
    const newRoad: InternalRoad = {
      id: crypto.randomUUID(),
      name: `Route ${roads.length + 1}`,
      width: 6,
      surfaceType: 'gravel',
      isExisting: false,
      points: [],
      borderingLots: []
    };
    onRoadsChange([...roads, newRoad]);
  };
  
  const removeRoad = (id: string) => {
    onRoadsChange(roads.filter(r => r.id !== id));
  };
  
  const updateRoad = (id: string, updates: Partial<InternalRoad>) => {
    onRoadsChange(roads.map(r => r.id === id ? { ...r, ...updates } : r));
  };
  
  const toggleBorderingLot = (roadId: string, lotNumber: string) => {
    onRoadsChange(roads.map(r => {
      if (r.id === roadId) {
        const currentBordering = r.borderingLots || [];
        const newBordering = currentBordering.includes(lotNumber)
          ? currentBordering.filter(l => l !== lotNumber)
          : [...currentBordering, lotNumber];
        return { ...r, borderingLots: newBordering };
      }
      return r;
    }));
  };
  
  const getSurfaceInfo = (type: string) => {
    return SURFACE_TYPES.find(s => s.value === type);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h4 className="font-semibold text-sm">Routes internes</h4>
          <p className="text-xs text-muted-foreground">
            Définissez les routes à l'intérieur du lotissement
          </p>
        </div>
        <Button onClick={addRoad} size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Ajouter une route
        </Button>
      </div>
      
      {roads.length > 0 && (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3">
            {roads.map((road, index) => {
              const surfaceInfo = getSurfaceInfo(road.surfaceType);
              return (
                <Card key={road.id} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-8 w-8 rounded flex items-center justify-center"
                          style={{ backgroundColor: surfaceInfo?.color || '#6b7280' }}
                        >
                          <Route className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <span className="font-medium text-sm">{road.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">
                              {road.width}m de large
                            </Badge>
                            {road.isExisting ? (
                              <Badge variant="outline" className="text-[10px] text-green-600">
                                Existante
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-blue-600">
                                À créer
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRoad(road.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nom</Label>
                        <Input
                          value={road.name}
                          onChange={(e) => updateRoad(road.id, { name: e.target.value })}
                          placeholder="Avenue..."
                          className="h-8 text-sm"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Largeur (m)</Label>
                        <Input
                          type="number"
                          value={road.width}
                          onChange={(e) => updateRoad(road.id, { 
                            width: parseFloat(e.target.value) || 6 
                          })}
                          min={3}
                          max={30}
                          className="h-8 text-sm"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Revêtement</Label>
                        <Select
                          value={road.surfaceType}
                          onValueChange={(v) => updateRoad(road.id, { 
                            surfaceType: v as InternalRoad['surfaceType'] 
                          })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SURFACE_TYPES.map(s => (
                              <SelectItem key={s.value} value={s.value}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded" 
                                    style={{ backgroundColor: s.color }} 
                                  />
                                  {s.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-end">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={road.isExisting}
                            onCheckedChange={(checked) => updateRoad(road.id, { isExisting: checked })}
                          />
                          <Label className="text-xs">Existante</Label>
                        </div>
                      </div>
                    </div>
                    
                    {/* Lots bordés */}
                    {lots.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs">Lots bordés par cette route</Label>
                        <div className="flex flex-wrap gap-2">
                          {lots.map(lot => (
                            <Badge
                              key={lot.id}
                              variant={road.borderingLots.includes(lot.lotNumber) ? 'default' : 'outline'}
                              className="cursor-pointer"
                              onClick={() => toggleBorderingLot(road.id, lot.lotNumber)}
                            >
                              {lot.lotNumber}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
      
      {roads.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <div className="text-3xl mb-2">🛤️</div>
          <p className="text-sm text-muted-foreground">
            Aucune route interne définie
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Ajoutez les voies d'accès internes au lotissement
          </p>
          <Button onClick={addRoad} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Créer une route
          </Button>
        </div>
      )}
      
      {/* Statistiques */}
      {roads.length > 0 && (
        <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{roads.length}</div>
            <div className="text-xs text-muted-foreground">Routes</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {roads.filter(r => !r.isExisting).length}
            </div>
            <div className="text-xs text-muted-foreground">À créer</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {roads.reduce((sum, r) => sum + (r.borderingLots?.length || 0), 0)}
            </div>
            <div className="text-xs text-muted-foreground">Lots desservis</div>
          </div>
        </div>
      )}
    </div>
  );
};

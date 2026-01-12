import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Trash2,
  Mountain,
  Waves,
  TreePine,
  Building,
  Zap,
  MapPin
} from 'lucide-react';
import { EnvironmentFeature, ENVIRONMENT_ICONS } from './types';

interface EnvironmentEditorProps {
  features: EnvironmentFeature[];
  onFeaturesChange: (features: EnvironmentFeature[]) => void;
}

const ENVIRONMENT_TYPES: { value: EnvironmentFeature['type']; label: string; icon: string; color: string }[] = [
  { value: 'lake', label: 'Lac / Étang', icon: '🌊', color: '#3b82f6' },
  { value: 'river', label: 'Rivière / Cours d\'eau', icon: '🏞️', color: '#0ea5e9' },
  { value: 'mountain', label: 'Montagne / Colline', icon: '⛰️', color: '#78716c' },
  { value: 'forest', label: 'Forêt / Boisement', icon: '🌲', color: '#22c55e' },
  { value: 'marsh', label: 'Marécage / Zone humide', icon: '🌿', color: '#84cc16' },
  { value: 'cliff', label: 'Falaise / Rochers', icon: '🪨', color: '#a8a29e' },
  { value: 'building', label: 'Bâtiment existant', icon: '🏢', color: '#6b7280' },
  { value: 'road', label: 'Route / Piste', icon: '🛤️', color: '#374151' },
  { value: 'powerline', label: 'Ligne électrique', icon: '⚡', color: '#f59e0b' },
  { value: 'other', label: 'Autre', icon: '📍', color: '#8b5cf6' }
];

const DIRECTIONS: { value: EnvironmentFeature['direction']; label: string }[] = [
  { value: 'north', label: 'Nord' },
  { value: 'south', label: 'Sud' },
  { value: 'east', label: 'Est' },
  { value: 'west', label: 'Ouest' },
  { value: 'northeast', label: 'Nord-Est' },
  { value: 'northwest', label: 'Nord-Ouest' },
  { value: 'southeast', label: 'Sud-Est' },
  { value: 'southwest', label: 'Sud-Ouest' }
];

export const EnvironmentEditor: React.FC<EnvironmentEditorProps> = ({
  features,
  onFeaturesChange
}) => {
  const addFeature = (type: EnvironmentFeature['type']) => {
    const typeInfo = ENVIRONMENT_TYPES.find(t => t.value === type);
    const newFeature: EnvironmentFeature = {
      id: crypto.randomUUID(),
      type,
      position: { x: 0, y: 0 },
      size: { width: 50, height: 50 },
      direction: 'north',
      color: typeInfo?.color
    };
    onFeaturesChange([...features, newFeature]);
  };
  
  const removeFeature = (id: string) => {
    onFeaturesChange(features.filter(f => f.id !== id));
  };
  
  const updateFeature = (id: string, updates: Partial<EnvironmentFeature>) => {
    onFeaturesChange(features.map(f => f.id === id ? { ...f, ...updates } : f));
  };
  
  const getTypeInfo = (type: EnvironmentFeature['type']) => {
    return ENVIRONMENT_TYPES.find(t => t.value === type);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h4 className="font-semibold text-sm">Éléments environnants</h4>
          <p className="text-xs text-muted-foreground">
            Ajoutez les éléments naturels et constructions autour du lotissement
          </p>
        </div>
      </div>
      
      {/* Boutons d'ajout rapide */}
      <div className="flex flex-wrap gap-2">
        {ENVIRONMENT_TYPES.map(type => (
          <Button
            key={type.value}
            variant="outline"
            size="sm"
            onClick={() => addFeature(type.value)}
            className="gap-1 text-xs h-8"
          >
            <span>{type.icon}</span>
            <span className="hidden sm:inline">{type.label.split('/')[0].trim()}</span>
          </Button>
        ))}
      </div>
      
      {/* Liste des éléments */}
      {features.length > 0 && (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {features.map(feature => {
              const typeInfo = getTypeInfo(feature.type);
              return (
                <Card key={feature.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <div 
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: `${feature.color}20` }}
                    >
                      {typeInfo?.icon}
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            style={{ backgroundColor: `${feature.color}20`, color: feature.color }}
                          >
                            {typeInfo?.label}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFeature(feature.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Nom</Label>
                          <Input
                            value={feature.name || ''}
                            onChange={(e) => updateFeature(feature.id, { name: e.target.value })}
                            placeholder="Nom..."
                            className="h-8 text-sm"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-xs">Direction</Label>
                          <Select
                            value={feature.direction}
                            onValueChange={(v) => updateFeature(feature.id, { 
                              direction: v as EnvironmentFeature['direction'] 
                            })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DIRECTIONS.map(d => (
                                <SelectItem key={d.value} value={d.value!}>
                                  {d.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-xs">Distance (m)</Label>
                          <Input
                            type="number"
                            value={feature.distance || ''}
                            onChange={(e) => updateFeature(feature.id, { 
                              distance: parseFloat(e.target.value) || 0 
                            })}
                            placeholder="0"
                            className="h-8 text-sm"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-xs">Taille (m)</Label>
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              value={feature.size.width || ''}
                              onChange={(e) => updateFeature(feature.id, { 
                                size: { ...feature.size, width: parseFloat(e.target.value) || 0 } 
                              })}
                              placeholder="L"
                              className="h-8 text-sm"
                            />
                            <Input
                              type="number"
                              value={feature.size.height || ''}
                              onChange={(e) => updateFeature(feature.id, { 
                                size: { ...feature.size, height: parseFloat(e.target.value) || 0 } 
                              })}
                              placeholder="l"
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Notes</Label>
                        <Input
                          value={feature.notes || ''}
                          onChange={(e) => updateFeature(feature.id, { notes: e.target.value })}
                          placeholder="Informations supplémentaires..."
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
      
      {features.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <div className="text-3xl mb-2">🌍</div>
          <p className="text-sm text-muted-foreground">
            Aucun élément d'environnement ajouté
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Ajoutez les éléments naturels ou constructions autour du terrain
          </p>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MapSectionProps } from './mapPreviewDefaults';

export const MarkerStyleSection: React.FC<MapSectionProps> = ({ value, onChange }) => {
  const set = (patch: Record<string, any>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h4 className="font-semibold text-sm">Style et Apparence</h4>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Couleur des marqueurs</Label>
          <Input
            type="color"
            value={value.markerColor || '#3b82f6'}
            onChange={(e) => set({ markerColor: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Couleur des marqueurs de bornes sur la carte
          </p>
        </div>
        <div className="space-y-2">
          <Label>Couleur des lignes</Label>
          <Input
            type="color"
            value={value.lineColor}
            onChange={(e) => set({ lineColor: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Épaisseur des lignes</Label>
          <Input
            type="number"
            min="1"
            max="10"
            value={value.lineWidth}
            onChange={(e) => set({ lineWidth: parseInt(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Style de ligne</Label>
          <Select
            value={value.lineStyle || 'solid'}
            onValueChange={(v) => set({ lineStyle: v as 'solid' | 'dashed' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Ligne solide</SelectItem>
              <SelectItem value="dashed">Ligne pointillée</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Couleur de remplissage</Label>
          <Input
            type="color"
            value={value.fillColor}
            onChange={(e) => set({ fillColor: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Opacité de remplissage</Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={value.fillOpacity}
            onChange={(e) => set({ fillOpacity: parseFloat(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
};

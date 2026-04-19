import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { MapSectionProps } from './mapPreviewDefaults';

export const ConstraintsSection: React.FC<MapSectionProps> = ({ value, onChange }) => {
  const set = (patch: Record<string, any>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h4 className="font-semibold text-sm">Validations de la parcelle</h4>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Minimum de bornes GPS</Label>
          <Input
            type="number"
            min="3"
            max="100"
            value={value.minMarkers || 3}
            onChange={(e) => set({ minMarkers: parseInt(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">
            Minimum requis pour former une parcelle valide (3-100)
          </p>
        </div>

        <div className="space-y-2">
          <Label>Maximum de bornes GPS</Label>
          <Input
            type="number"
            min="3"
            max="100"
            value={value.maxMarkers}
            onChange={(e) => set({ maxMarkers: parseInt(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">
            Maximum autorisé pour une parcelle (3-100)
          </p>
        </div>

        <div className="space-y-2">
          <Label>Surface minimale (m²)</Label>
          <Input
            type="number"
            min="0"
            value={value.minSurfaceSqm}
            onChange={(e) => set({ minSurfaceSqm: parseInt(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">0 = pas de limite minimale</p>
        </div>

        <div className="space-y-2">
          <Label>Surface maximale (m²)</Label>
          <Input
            type="number"
            min="0"
            value={value.maxSurfaceSqm}
            onChange={(e) => set({ maxSurfaceSqm: parseInt(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">0 = pas de limite maximale</p>
        </div>
      </div>
    </div>
  );
};

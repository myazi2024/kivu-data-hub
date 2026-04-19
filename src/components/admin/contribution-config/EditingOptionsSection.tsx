import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { MapSectionProps } from './mapPreviewDefaults';

export const EditingOptionsSection: React.FC<MapSectionProps> = ({ value, onChange }) => {
  const set = (patch: Record<string, any>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <h4 className="font-semibold text-sm">Options d'édition</h4>

      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
        <div className="space-y-1">
          <Label>Permettre le déplacement des marqueurs</Label>
          <p className="text-xs text-muted-foreground">
            Les utilisateurs peuvent ajuster la position des bornes en les glissant sur la carte
          </p>
        </div>
        <Switch
          checked={value.enableDragging !== false}
          onCheckedChange={(c) => set({ enableDragging: c })}
        />
      </div>

      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
        <div className="space-y-1">
          <Label>Activer les outils d'édition</Label>
          <p className="text-xs text-muted-foreground">
            Fonctionnalités d'édition avancées pour modifier la parcelle
          </p>
        </div>
        <Switch
          checked={value.enableEditing !== false}
          onCheckedChange={(c) => set({ enableEditing: c })}
        />
      </div>
    </div>
  );
};

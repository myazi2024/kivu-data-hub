import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MapSectionProps } from './mapPreviewDefaults';

export const DimensionsSection: React.FC<MapSectionProps> = ({ value, onChange }) => {
  const set = (patch: Record<string, any>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h4 className="font-semibold text-sm">Dimensions des côtés</h4>

      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
        <div className="space-y-1">
          <Label>Afficher les dimensions</Label>
          <p className="text-xs text-muted-foreground">
            Afficher la longueur de chaque côté de la parcelle
          </p>
        </div>
        <Switch
          checked={value.showSideDimensions !== false}
          onCheckedChange={(c) => set({ showSideDimensions: c })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Format d'affichage</Label>
          <Input
            placeholder="{value}m"
            value={value.dimensionFormat || '{value}m'}
            onChange={(e) => set({ dimensionFormat: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Utiliser {'{value}'} pour la valeur. Ex: {'{value}m, {value} mètres'}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Unité</Label>
          <Select
            value={value.dimensionUnit || 'm'}
            onValueChange={(v) => set({ dimensionUnit: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="m">Mètres (m)</SelectItem>
              <SelectItem value="km">Kilomètres (km)</SelectItem>
              <SelectItem value="ft">Pieds (ft)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Taille de police</Label>
          <Input
            type="number"
            min="8"
            max="16"
            value={value.dimensionFontSize || 11}
            onChange={(e) => set({ dimensionFontSize: parseInt(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label>Couleur du texte</Label>
          <Input
            type="color"
            value={value.dimensionTextColor || '#000000'}
            onChange={(e) => set({ dimensionTextColor: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
        <div className="space-y-1">
          <Label>Afficher "Côté X"</Label>
          <p className="text-xs text-muted-foreground">
            Préfixer chaque dimension avec "Côté 1", "Côté 2", etc.
          </p>
        </div>
        <Switch
          checked={value.showSideLabels !== false}
          onCheckedChange={(c) => set({ showSideLabels: c })}
        />
      </div>
    </div>
  );
};

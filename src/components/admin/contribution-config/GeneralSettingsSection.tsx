import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import type { MapSectionProps } from './mapPreviewDefaults';

const Toggle = ({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between p-4 border rounded-lg">
    <div className="space-y-1">
      <Label>{label}</Label>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

export const GeneralSettingsSection: React.FC<MapSectionProps> = ({ value, onChange }) => {
  const set = (patch: Record<string, any>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <Toggle
        label="Activer l'aperçu de la carte"
        description="Afficher la carte interactive avec les bornes GPS"
        checked={value.enabled}
        onCheckedChange={(c) => set({ enabled: c })}
      />
      <Toggle
        label="Afficher les marqueurs numérotés"
        description="Afficher les numéros sur les marqueurs des bornes"
        checked={value.showMarkers}
        onCheckedChange={(c) => set({ showMarkers: c })}
      />
      <Toggle
        label="Calcul automatique de la surface"
        description="Calculer et afficher automatiquement la surface de la parcelle"
        checked={value.autoCalculateSurface}
        onCheckedChange={(c) => set({ autoCalculateSurface: c })}
      />
      <Toggle
        label="Afficher les dimensions des côtés"
        description="Afficher les dimensions en mètres de chaque côté de la parcelle sur la carte"
        checked={value.showSideDimensions}
        onCheckedChange={(c) => set({ showSideDimensions: c })}
      />
      <Toggle
        label="Permettre l'édition des dimensions"
        description="Permettre aux utilisateurs d'ajuster manuellement les dimensions depuis la carte"
        checked={value.allowDimensionEditing}
        onCheckedChange={(c) => set({ allowDimensionEditing: c })}
      />
      <Toggle
        label="Afficher les étiquettes des côtés"
        description={`Afficher "Côté 1", "Côté 2", etc. sur chaque segment`}
        checked={value.showSideLabels}
        onCheckedChange={(c) => set({ showSideLabels: c })}
      />

      <div className="space-y-4 p-4 border rounded-lg">
        <h4 className="font-semibold text-sm">Paramètres de base</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Zoom par défaut</Label>
            <Input
              type="number"
              min="1"
              max="19"
              value={value.defaultZoom}
              onChange={(e) => set({ defaultZoom: parseInt(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">Niveau de zoom initial (1-19)</p>
          </div>
          <div className="space-y-2">
            <Label>Latitude du centre</Label>
            <Input
              type="number"
              step="0.0001"
              min="-90"
              max="90"
              value={value.defaultCenter?.lat ?? -4.0383}
              onChange={(e) =>
                set({ defaultCenter: { ...value.defaultCenter, lat: parseFloat(e.target.value) } })
              }
            />
            <p className="text-xs text-muted-foreground">Kinshasa: -4.0383</p>
          </div>
          <div className="space-y-2">
            <Label>Longitude du centre</Label>
            <Input
              type="number"
              step="0.0001"
              min="-180"
              max="180"
              value={value.defaultCenter?.lng ?? 21.7587}
              onChange={(e) =>
                set({ defaultCenter: { ...value.defaultCenter, lng: parseFloat(e.target.value) } })
              }
            />
            <p className="text-xs text-muted-foreground">Kinshasa: 21.7587</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4 border rounded-lg">
        <h4 className="font-semibold text-sm">Fonctionnalités avancées</h4>
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <Label>Détection de conflits de limites</Label>
            <p className="text-xs text-muted-foreground">
              Vérifier automatiquement les chevauchements avec les parcelles voisines
            </p>
          </div>
          <Switch
            checked={value.enableConflictDetection}
            onCheckedChange={(c) => set({ enableConflictDetection: c })}
          />
        </div>
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <Label>Gestion des côtés bordant une route</Label>
            <p className="text-xs text-muted-foreground">
              Permettre d'indiquer quels côtés de la parcelle bordent une route
            </p>
          </div>
          <Switch
            checked={value.enableRoadBorderingFeature}
            onCheckedChange={(c) => set({ enableRoadBorderingFeature: c })}
          />
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { MapSectionProps } from './mapPreviewDefaults';

export const RoadTypesSection: React.FC<MapSectionProps> = ({ value, onChange }) => {
  const roadTypes: Array<{ value: string; label: string }> = value.roadTypes || [];

  const updateRoadTypes = (next: typeof roadTypes) => onChange({ ...value, roadTypes: next });

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Types de routes</h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            updateRoadTypes([
              ...roadTypes,
              { value: `route_${roadTypes.length + 1}`, label: `Nouveau type ${roadTypes.length + 1}` },
            ])
          }
          className="h-7 text-xs"
        >
          Ajouter un type
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Types de routes disponibles pour identifier les côtés de parcelles bordant une voie
      </p>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {roadTypes.map((roadType, index) => (
          <div key={index} className="flex gap-2 items-start p-2 bg-muted/30 rounded">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <Input
                placeholder="Valeur (slug)"
                value={roadType.value}
                onChange={(e) => {
                  const updated = [...roadTypes];
                  updated[index] = { ...updated[index], value: e.target.value };
                  updateRoadTypes(updated);
                }}
                className="h-8 text-xs"
              />
              <Input
                placeholder="Libellé"
                value={roadType.label}
                onChange={(e) => {
                  const updated = [...roadTypes];
                  updated[index] = { ...updated[index], label: e.target.value };
                  updateRoadTypes(updated);
                }}
                className="h-8 text-xs"
              />
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => updateRoadTypes(roadTypes.filter((_, i) => i !== index))}
              className="h-8 w-8 p-0"
            >
              ×
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

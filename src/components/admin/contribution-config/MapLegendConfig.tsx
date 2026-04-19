import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export interface LegendItem {
  key: string;
  label: string;
  mobileLabel: string;
  enabled: boolean;
}

export interface LegendConfig {
  enabled?: boolean;
  items?: LegendItem[];
}

export const DEFAULT_LEGEND_ITEMS: LegendItem[] = [
  { key: 'bornage_gps', label: 'Parcelle avec bornage GPS', mobileLabel: 'Bornage GPS', enabled: true },
  { key: 'sans_bornage', label: 'Parcelle sans bornage', mobileLabel: 'Sans bornage', enabled: true },
  { key: 'limites', label: 'Limites parcellaires', mobileLabel: 'Limites', enabled: true },
  { key: 'dimensions', label: 'Dimensions côtés', mobileLabel: 'Dimensions', enabled: true },
  { key: 'incompletes', label: 'Données incomplètes', mobileLabel: 'Incomplètes', enabled: true },
  { key: 'favorite', label: 'Parcelle favorite', mobileLabel: 'Favorite', enabled: true },
];

const mergeWithDefaults = (saved?: LegendItem[] | null): LegendItem[] => {
  const safeSaved = (saved || []).filter(Boolean);
  return DEFAULT_LEGEND_ITEMS.map(def => {
    const match = safeSaved.find(s => s?.key === def.key);
    return match ? { ...def, ...match } : def;
  });
};

interface MapLegendConfigProps {
  value: LegendConfig | undefined;
  onChange: (next: LegendConfig) => void;
}

export interface MapLegendConfigHandle {
  scrollIntoView: () => void;
}

/**
 * Extracted legend configuration block (UI + edit logic) from AdminContributionConfig.
 * Iso-functional: same behaviour, same defaults, same merge logic.
 */
export const MapLegendConfig = forwardRef<MapLegendConfigHandle, MapLegendConfigProps>(
  ({ value, onChange }, ref) => {
    const legendRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      scrollIntoView: () => {
        legendRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    }));

    const enabled = value?.enabled !== false;

    const updateItem = (index: number, patch: Partial<LegendItem>) => {
      const items = mergeWithDefaults(value?.items);
      items[index] = { ...items[index], ...patch };
      onChange({ ...value, enabled, items });
    };

    return (
      <div className="space-y-4">
        <h4 ref={legendRef} className="text-sm font-semibold flex items-center gap-2">
          <span>📋</span> Légende de la carte
        </h4>

        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <Label>Afficher la légende</Label>
            <p className="text-xs text-muted-foreground">
              Afficher le bloc légende sur la carte cadastrale
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => {
              onChange({
                ...value,
                enabled: checked,
                items: value?.items || DEFAULT_LEGEND_ITEMS,
              });
            }}
          />
        </div>

        {enabled && (
          <div className="space-y-2">
            {mergeWithDefaults(value?.items).map((item, index) => (
              <div key={item.key} className="p-3 bg-muted/20 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">{item.key}</Label>
                  <Switch
                    checked={item.enabled}
                    onCheckedChange={(checked) => updateItem(index, { enabled: checked })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Label desktop</Label>
                    <Input
                      value={item.label}
                      onChange={(e) => updateItem(index, { label: e.target.value })}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Label mobile</Label>
                    <Input
                      value={item.mobileLabel}
                      onChange={(e) => updateItem(index, { mobileLabel: e.target.value })}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

MapLegendConfig.displayName = 'MapLegendConfig';

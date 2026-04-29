import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Building2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KnownBuilding {
  ref: string; // 'main' | `extra-${i}`
  label: string;
  type?: string;
  nature?: string;
  materials?: string;
  year?: number;
  usage?: string;
  surface_sqm?: number;
  floors?: string;
  property_category?: string;
}

interface BuildingTargetSelectorProps {
  buildings: KnownBuilding[];
  selectedRef: string;
  onSelect: (ref: string) => void;
}

const formatBuildingSummary = (b: KnownBuilding) => {
  const parts: string[] = [];
  if (b.type) parts.push(b.type);
  if (b.usage) parts.push(b.usage);
  if (b.year) parts.push(String(b.year));
  if (b.surface_sqm) parts.push(`${b.surface_sqm} m²`);
  return parts.join(' • ');
};

const BuildingTargetSelector: React.FC<BuildingTargetSelectorProps> = ({
  buildings,
  selectedRef,
  onSelect,
}) => {
  if (buildings.length === 0) return null;

  return (
    <Card className="border-2 border-primary/20 bg-primary/5 rounded-xl">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Construction concernée par l'expertise</h4>
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Sparkles className="h-3 w-3" /> Données du cadastre
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Sélectionnez le bâtiment à expertiser. Les informations déjà connues du cadastre seront pré-remplies pour vous éviter une double saisie.
        </p>

        <RadioGroup value={selectedRef} onValueChange={onSelect} className="space-y-2">
          {buildings.map((b) => {
            const isSelected = selectedRef === b.ref;
            return (
              <label
                key={b.ref}
                htmlFor={`bldg-${b.ref}`}
                className={cn(
                  'flex items-start gap-3 p-2.5 rounded-lg border-2 cursor-pointer transition-colors',
                  isSelected
                    ? 'border-primary bg-background'
                    : 'border-border bg-background/60 hover:bg-background',
                )}
              >
                <RadioGroupItem id={`bldg-${b.ref}`} value={b.ref} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{b.label}</div>
                  {formatBuildingSummary(b) && (
                    <div className="text-xs text-muted-foreground mt-0.5">{formatBuildingSummary(b)}</div>
                  )}
                </div>
              </label>
            );
          })}

          <label
            htmlFor="bldg-new"
            className={cn(
              'flex items-start gap-3 p-2.5 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
              selectedRef === 'new'
                ? 'border-primary bg-background'
                : 'border-border bg-background/60 hover:bg-background',
            )}
          >
            <RadioGroupItem id="bldg-new" value="new" className="mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Autre / nouvelle construction</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Construction non encore déclarée au cadastre — saisie manuelle complète.
              </div>
            </div>
          </label>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};

export default BuildingTargetSelector;

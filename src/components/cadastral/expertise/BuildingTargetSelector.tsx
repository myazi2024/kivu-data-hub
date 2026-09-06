import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
  standing?: string;
  height_m?: number;
}

interface BuildingTargetSelectorProps {
  buildings: KnownBuilding[];
  selectedRefs: string[];
  onToggle: (ref: string) => void;
  disabled?: boolean;
  title?: string;
  description?: string;
}

const formatBuildingSummary = (b: KnownBuilding) => {
  const parts: string[] = [];
  if (b.type) parts.push(b.type);
  if (b.usage) parts.push(b.usage);
  if (b.year) parts.push(String(b.year));
  return parts.join(' • ');
};

const BuildingTargetSelector: React.FC<BuildingTargetSelectorProps> = ({
  buildings,
  selectedRefs,
  onToggle,
  disabled = false,
  title = 'Constructions concernées',
  description = 'Cochez la ou les constructions à expertiser. Les informations déjà connues du cadastre seront pré-remplies.',
}) => {
  if (buildings.length === 0) return null;

  const rows = [
    ...buildings,
    {
      ref: 'new',
      label: 'Autre / nouvelle construction',
      usage: undefined,
    } as KnownBuilding,
  ];

  return (
    <Card className="border-2 border-primary/20 bg-primary/5 rounded-xl">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">{title}</h4>
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Sparkles className="h-3 w-3" /> Données du cadastre
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>

        <div className="space-y-2">
          {rows.map((b) => {
            const isSelected = selectedRefs.includes(b.ref);
            const isNew = b.ref === 'new';
            return (
              <label
                key={b.ref}
                htmlFor={`bldg-${b.ref}`}
                className={cn(
                  'flex items-start gap-3 p-2.5 rounded-lg border-2 transition-colors',
                  isNew && 'border-dashed',
                  disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                  isSelected
                    ? 'border-primary bg-background'
                    : 'border-border bg-background/60 hover:bg-background',
                )}
              >
                <Checkbox
                  id={`bldg-${b.ref}`}
                  checked={isSelected}
                  disabled={disabled}
                  onCheckedChange={() => onToggle(b.ref)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{b.label}</div>
                  {isNew ? (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Construction non encore déclarée au cadastre — saisie manuelle complète.
                    </div>
                  ) : (
                    formatBuildingSummary(b) && (
                      <div className="text-xs text-muted-foreground mt-0.5">{formatBuildingSummary(b)}</div>
                    )
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default BuildingTargetSelector;

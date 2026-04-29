import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Building2, Sparkles, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PermitKnownBuilding } from './permitBuildings';

interface Props {
  buildings: PermitKnownBuilding[];
  selectedRef: string;
  onSelect: (ref: string) => void;
  /** Optional override label */
  title?: string;
  /** Show the "Other / new building" option */
  allowNew?: boolean;
  /** Helper text */
  helpText?: string;
}

const formatSummary = (b: PermitKnownBuilding) => {
  const parts: string[] = [];
  if (b.constructionType) parts.push(b.constructionType);
  if (b.constructionNature) parts.push(b.constructionNature);
  if (b.declaredUsage) parts.push(b.declaredUsage);
  if (b.constructionYear) parts.push(String(b.constructionYear));
  if (b.areaSqm) parts.push(`${b.areaSqm.toLocaleString('fr-FR')} m²`);
  return parts.join(' • ');
};

const PermitBuildingTargetSelector: React.FC<Props> = ({
  buildings,
  selectedRef,
  onSelect,
  title = 'Construction concernée par cette demande',
  allowNew = true,
  helpText = 'Sélectionnez le bâtiment concerné. Les informations connues seront pré-remplies.',
}) => {
  // Hide entirely if there is nothing meaningful to choose between
  if (buildings.length === 0 && !allowNew) return null;
  if (buildings.length <= 1 && !allowNew) return null;

  return (
    <Card className="border-2 border-primary/20 bg-primary/5 rounded-xl">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Building2 className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">{title}</h4>
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Sparkles className="h-3 w-3" /> Données du cadastre
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{helpText}</p>

        <RadioGroup value={selectedRef} onValueChange={onSelect} className="space-y-2">
          {buildings.map((b) => {
            const isSelected = selectedRef === b.ref;
            const summary = formatSummary(b);
            return (
              <label
                key={b.ref}
                htmlFor={`permit-bldg-${b.ref}`}
                className={cn(
                  'flex items-start gap-3 p-2.5 rounded-lg border-2 cursor-pointer transition-colors',
                  isSelected ? 'border-primary bg-background' : 'border-border bg-background/60 hover:bg-background',
                )}
              >
                <RadioGroupItem id={`permit-bldg-${b.ref}`} value={b.ref} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{b.label}</div>
                  {summary && <div className="text-xs text-muted-foreground mt-0.5">{summary}</div>}
                </div>
              </label>
            );
          })}

          {allowNew && (
            <label
              htmlFor="permit-bldg-new"
              className={cn(
                'flex items-start gap-3 p-2.5 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
                selectedRef === 'new' ? 'border-primary bg-background' : 'border-border bg-background/60 hover:bg-background',
              )}
            >
              <RadioGroupItem id="permit-bldg-new" value="new" className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Nouveau bâtiment / non listé
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Saisir manuellement les caractéristiques ci-dessous
                </div>
              </div>
            </label>
          )}
        </RadioGroup>
      </CardContent>
    </Card>
  );
};

export default PermitBuildingTargetSelector;

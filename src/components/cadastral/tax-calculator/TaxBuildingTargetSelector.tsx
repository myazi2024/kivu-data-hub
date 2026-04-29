import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Building2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaxKnownBuilding } from './taxBuildings';

interface Props {
  buildings: TaxKnownBuilding[];
  selectedRef: string;
  onSelect: (ref: string) => void;
  /** Optional override label (e.g. "Construction concernée par cette taxe") */
  title?: string;
  /** Hide the "Other / new" option (e.g. when calculator can only reuse known data) */
  allowNew?: boolean;
}

const formatSummary = (b: TaxKnownBuilding) => {
  const parts: string[] = [];
  if (b.constructionNature) parts.push(b.constructionNature);
  if (b.declaredUsage) parts.push(b.declaredUsage);
  if (b.constructionYear) parts.push(String(b.constructionYear));
  if (b.areaSqm) parts.push(`${b.areaSqm.toLocaleString('fr-FR')} m²`);
  return parts.join(' • ');
};

const TaxBuildingTargetSelector: React.FC<Props> = ({
  buildings,
  selectedRef,
  onSelect,
  title = 'Construction concernée par cette déclaration',
  allowNew = true,
}) => {
  if (buildings.length <= 1 && !allowNew) return null;
  // If only the main building exists and no additional ones, no need to ask.
  if (buildings.length <= 1 && buildings[0]?.ref === 'main' && !allowNew) return null;

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
        <p className="text-xs text-muted-foreground">
          Sélectionnez le bâtiment concerné. Les informations connues seront pré-remplies.
        </p>

        <RadioGroup value={selectedRef} onValueChange={onSelect} className="space-y-2">
          {buildings.map((b) => {
            const isSelected = selectedRef === b.ref;
            const summary = formatSummary(b);
            return (
              <label
                key={b.ref}
                htmlFor={`tax-bldg-${b.ref}`}
                className={cn(
                  'flex items-start gap-3 p-2.5 rounded-lg border-2 cursor-pointer transition-colors',
                  isSelected ? 'border-primary bg-background' : 'border-border bg-background/60 hover:bg-background',
                )}
              >
                <RadioGroupItem id={`tax-bldg-${b.ref}`} value={b.ref} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{b.label}</div>
                  {summary && <div className="text-xs text-muted-foreground mt-0.5">{summary}</div>}
                </div>
              </label>
            );
          })}

          {allowNew && (
            <label
              htmlFor="tax-bldg-new"
              className={cn(
                'flex items-start gap-3 p-2.5 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
                selectedRef === 'new' ? 'border-primary bg-background' : 'border-border bg-background/60 hover:bg-background',
              )}
            >
              <RadioGroupItem id="tax-bldg-new" value="new" className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Autre / non listée</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Saisie manuelle — la déclaration ne sera pas rattachée à un bâtiment connu.
                </div>
              </div>
            </label>
          )}
        </RadioGroup>
      </CardContent>
    </Card>
  );
};

export default TaxBuildingTargetSelector;

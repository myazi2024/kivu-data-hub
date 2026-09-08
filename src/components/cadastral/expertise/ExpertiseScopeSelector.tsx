import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ClipboardList, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ExpertiseScope = 'partial' | 'total';
export type ValuationTarget = 'market' | 'rental';

interface ExpertiseScopeSelectorProps {
  scope: ExpertiseScope;
  onScopeChange: (scope: ExpertiseScope) => void;
  valuations: ValuationTarget[];
  onValuationsChange: (v: ValuationTarget[]) => void;
}

const SCOPE_OPTIONS: { value: ExpertiseScope; label: string; hint: string }[] = [
  { value: 'total', label: 'Expertise totale', hint: 'Toute la parcelle et l\'ensemble de ses constructions.' },
  { value: 'partial', label: 'Expertise partielle', hint: 'Une partie seulement : une ou plusieurs constructions, ou une zone précise.' },
];

const VALUATION_OPTIONS: { value: ValuationTarget; label: string; hint: string }[] = [
  { value: 'market', label: 'Valeur marchande', hint: 'Prix de vente estimé du bien.' },
  { value: 'rental', label: 'Valeur locative', hint: 'Loyer mensuel estimé du bien.' },
];

const ExpertiseScopeSelector: React.FC<ExpertiseScopeSelectorProps> = ({
  scope,
  onScopeChange,
  valuations,
  onValuationsChange,
}) => {
  const toggle = (v: ValuationTarget) => {
    onValuationsChange(valuations.includes(v) ? valuations.filter((x) => x !== v) : [...valuations, v]);
  };

  return (
    <Card className="border-2 border-primary/20 bg-primary/5 rounded-xl">
      <CardContent className="p-3 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Type d'expertise souhaité</h4>
          </div>
          <RadioGroup
            value={scope}
            onValueChange={(v) => onScopeChange(v as ExpertiseScope)}
            className="grid grid-cols-2 gap-2"
          >
            {SCOPE_OPTIONS.map((o) => (
              <label
                key={o.value}
                htmlFor={`scope-${o.value}`}
                className={cn(
                  'flex items-start gap-3 p-2.5 rounded-lg border-2 cursor-pointer transition-colors',
                  scope === o.value ? 'border-primary bg-background' : 'border-border bg-background/60 hover:bg-background',
                )}
              >
                <RadioGroupItem id={`scope-${o.value}`} value={o.value} className="mt-0.5" />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{o.label}</div>
                  <div className="text-xs text-muted-foreground">{o.hint}</div>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Valeur(s) à déterminer</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Vous pouvez demander les deux valeurs en même temps.
          </p>
          <div className="grid gap-2">
            {VALUATION_OPTIONS.map((o) => {
              const checked = valuations.includes(o.value);
              return (
                <label
                  key={o.value}
                  htmlFor={`valuation-${o.value}`}
                  className={cn(
                    'flex items-start gap-3 p-2.5 rounded-lg border-2 cursor-pointer transition-colors',
                    checked ? 'border-primary bg-background' : 'border-border bg-background/60 hover:bg-background',
                  )}
                >
                  <Checkbox
                    id={`valuation-${o.value}`}
                    checked={checked}
                    onCheckedChange={() => toggle(o.value)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{o.label}</div>
                    <div className="text-xs text-muted-foreground">{o.hint}</div>
                  </div>
                </label>
              );
            })}
          </div>
          {valuations.length === 0 && (
            <p className="text-xs text-destructive">Sélectionnez au moins une valeur à déterminer.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpertiseScopeSelector;

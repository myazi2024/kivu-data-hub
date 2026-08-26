import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2 } from 'lucide-react';

interface ParcelNumberFieldProps {
  /** Zone choisie : détermine le préfixe imposé (SU / SR). */
  sectionType: 'urbaine' | 'rurale';
  value: string;
  onChange: (value: string) => void;
  /** Verrouillé quand le numéro provient d'une recherche cadastrale par n° de parcelle. */
  locked?: boolean;
  highlight?: boolean;
}

/** Retire un éventuel préfixe SU/SR collé par l'utilisateur puis limite les caractères. */
export const stripParcelPrefix = (raw: string) =>
  raw
    .toUpperCase()
    .replace(/^\s*S\s*[UR]\s*/g, '')
    .replace(/[^0-9./ ]/g, '')
    .replace(/^\s+/, '');

/** Compose la valeur stockée : « SU 12345 ». */
export const composeParcelNumber = (
  sectionType: 'urbaine' | 'rurale',
  suffix: string,
) => {
  const prefix = sectionType === 'urbaine' ? 'SU' : 'SR';
  const clean = (suffix || '').trim();
  return clean ? `${prefix} ${clean}` : '';
};

const ParcelNumberField: React.FC<ParcelNumberFieldProps> = ({
  sectionType, value, onChange, locked, highlight,
}) => {
  const prefix = sectionType === 'urbaine' ? 'SU' : 'SR';
  const label = sectionType === 'urbaine'
    ? 'Numéro de la parcelle — section urbaine (SU)'
    : 'Numéro de la parcelle — section rurale (SR)';
  const suffix = stripParcelPrefix(value || '');
  const isValid = suffix.trim().length >= 1;

  return (
    <div className="space-y-1.5 animate-fade-in">
      <Label className="text-sm" htmlFor="ccc-parcel-number">
        {label} <span className="text-destructive">*</span>
      </Label>
      <div
        className={cn(
          'flex items-stretch rounded-lg border border-input overflow-hidden bg-background',
          highlight && !isValid && 'ring-2 ring-destructive/60 border-destructive',
        )}
      >
        <span
          aria-hidden="true"
          className="flex items-center px-3 text-sm font-mono font-semibold bg-muted text-muted-foreground border-r border-input"
        >
          {prefix}
        </span>
        <Input
          id="ccc-parcel-number"
          aria-label={`${label} — préfixe ${prefix} automatique`}
          value={suffix}
          readOnly={locked}
          inputMode="numeric"
          autoComplete="off"
          placeholder="12345"
          onChange={(e) => onChange(composeParcelNumber(sectionType, stripParcelPrefix(e.target.value)))}
          className={cn(
            'h-10 text-sm font-mono border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0',
            locked && 'bg-muted cursor-not-allowed',
          )}
        />
      </div>
      {locked ? (
        <p className="text-xs text-primary flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          Numéro repris de votre recherche cadastrale.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Le préfixe « {prefix} » est appliqué automatiquement : saisissez uniquement les chiffres (ex. 12345).
        </p>
      )}
    </div>
  );
};

export default ParcelNumberField;

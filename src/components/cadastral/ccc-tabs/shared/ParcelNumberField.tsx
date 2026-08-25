import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ParcelNumberFieldProps {
  /** Zone choisie : détermine le préfixe attendu (SU / SR). */
  sectionType: 'urbaine' | 'rurale';
  value: string;
  onChange: (value: string) => void;
  /** Verrouillé quand le numéro provient d'une recherche cadastrale par n° de parcelle. */
  locked?: boolean;
  highlight?: boolean;
}

/** Caractères autorisés, alignés sur la barre de recherche cadastrale standard. */
const sanitizeParcelNumber = (raw: string) =>
  raw.toUpperCase().replace(/[^0-9SUR./]/g, '');

const ParcelNumberField: React.FC<ParcelNumberFieldProps> = ({
  sectionType, value, onChange, locked, highlight,
}) => {
  const expectedPrefix = sectionType === 'urbaine' ? 'SU' : 'SR';
  const label = sectionType === 'urbaine'
    ? 'Numéro de la parcelle — section urbaine (SU)'
    : 'Numéro de la parcelle — section rurale (SR)';
  const placeholder = sectionType === 'urbaine' ? 'SU 12345' : 'SR 12345';
  const trimmed = (value || '').trim();
  const prefixMismatch = trimmed.length >= 2 && !trimmed.toUpperCase().startsWith(expectedPrefix);
  const isValid = trimmed.length >= 3 && !prefixMismatch;

  return (
    <div className="space-y-1.5 animate-fade-in">
      <Label className="text-sm" htmlFor="ccc-parcel-number">
        {label} <span className="text-destructive">*</span>
      </Label>
      <Input
        id="ccc-parcel-number"
        value={value || ''}
        readOnly={locked}
        inputMode="text"
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => onChange(sanitizeParcelNumber(e.target.value))}
        className={cn(
          'h-10 text-sm font-mono rounded-lg',
          locked && 'bg-muted cursor-not-allowed',
          highlight && !isValid && 'ring-2 ring-destructive/60 border-destructive',
        )}
      />
      {prefixMismatch ? (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Le numéro doit commencer par « {expectedPrefix} » pour une zone {sectionType}.
        </p>
      ) : locked ? (
        <p className="text-xs text-primary flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          Numéro repris de votre recherche cadastrale.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Saisissez le numéro cadastral tel qu'il figure sur vos documents (ex. {placeholder}).
        </p>
      )}
    </div>
  );
};

export default ParcelNumberField;

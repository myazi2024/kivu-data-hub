import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface RentalStartDateFieldProps {
  value?: string; // ISO yyyy-MM-dd
  onChange: (value: string | undefined) => void;
  constructionYear?: number;
  highlightRequired?: boolean;
  /** Statut d'occupation : si false, le libellé devient « Inoccupé depuis quand ? ». */
  isOccupied?: boolean | null;
}

const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Champ date natif "En location depuis quand ?" / "Inoccupé depuis quand ?"
 * — Affiché en mode « Un seul local » (sous le sélecteur de configuration locative).
 * — Utilise le même <input type="date"> natif que le mode « Divisé en plusieurs
 *   locaux » (RentalConfigurationFields) pour une UX cohérente.
 * — Doit être ≥ 01/01/{constructionYear} et ≤ aujourd'hui (bornes natives min/max).
 */
const RentalStartDateField: React.FC<RentalStartDateFieldProps> = ({
  value, onChange, constructionYear, highlightRequired, isOccupied,
}) => {
  const minRentalDate = constructionYear ? `${constructionYear}-01-01` : undefined;
  const missing = highlightRequired && !value;

  return (
    <div className={cn(
      'space-y-1.5',
      missing && 'ring-2 ring-destructive rounded-xl p-2 bg-destructive/5 animate-pulse'
    )}>
      <Label className="text-sm font-medium flex items-center gap-1">
        {isOccupied === false ? 'Inoccupé depuis quand ?' : 'En location depuis quand ?'}
        {missing && <span className="text-destructive text-xs font-semibold">*</span>}
      </Label>
      <Input
        type="date"
        min={minRentalDate}
        max={TODAY}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className={cn('h-9 rounded-xl text-sm', missing && 'border-destructive ring-1 ring-destructive/40')}
      />
      {constructionYear ? (
        <p className="text-[11px] text-muted-foreground">
          La date doit être ≥ 01/01/{constructionYear} et ≤ aujourd'hui.
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Renseignez d'abord l'année de construction.
        </p>
      )}
    </div>
  );
};

export default RentalStartDateField;

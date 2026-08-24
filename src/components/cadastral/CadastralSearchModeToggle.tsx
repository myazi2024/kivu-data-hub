import React from 'react';
import { cn } from '@/lib/utils';

export type CadastralSearchMode = 'parcel' | 'title';

interface CadastralSearchModeToggleProps {
  mode: CadastralSearchMode;
  onModeChange: (mode: CadastralSearchMode) => void;
  className?: string;
}

const OPTIONS: Array<{ value: CadastralSearchMode; label: string; aria: string }> = [
  { value: 'parcel', label: 'N° parcelle (SU/SR)', aria: 'Rechercher par numéro de parcelle SU ou SR' },
  { value: 'title', label: 'N° titre de propriété', aria: 'Rechercher par numéro du titre de propriété' },
];

/** Segmented control choosing the standard search field (parcel number vs property title number). */
const CadastralSearchModeToggle: React.FC<CadastralSearchModeToggleProps> = ({ mode, onModeChange, className }) => (
  <div
    role="radiogroup"
    aria-label="Type de recherche"
    className={cn('flex items-center gap-1 rounded-xl bg-muted/50 p-1', className)}
  >
    {OPTIONS.map((opt) => {
      const active = mode === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={active}
          aria-label={opt.aria}
          onClick={() => onModeChange(opt.value)}
          className={cn(
            'flex-1 min-h-9 rounded-lg px-2 text-[11px] font-medium transition-colors',
            active
              ? 'bg-background text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

export default CadastralSearchModeToggle;

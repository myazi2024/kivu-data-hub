import React from 'react';
import { cn } from '@/lib/utils';

export type CadastralSearchMode = 'parcel' | 'title';

interface CadastralSearchModeToggleProps {
  mode: CadastralSearchMode;
  onModeChange: (mode: CadastralSearchMode) => void;
  className?: string;
}

const OPTIONS: Array<{ value: CadastralSearchMode; label: string; short: string; aria: string }> = [
  { value: 'parcel', label: 'N° parcelle (SU/SR)', short: 'Parcelle', aria: 'Rechercher par numéro de parcelle SU ou SR' },
  { value: 'title', label: 'N° titre de propriété', short: 'Titre', aria: 'Rechercher par numéro du titre de propriété' },
];

/**
 * Sliding segmented control choosing the standard search field.
 * The active option slides into place with a yellow indicator pill
 * (matching the cadastral search notification badge style).
 */
const CadastralSearchModeToggle: React.FC<CadastralSearchModeToggleProps> = ({ mode, onModeChange, className }) => {
  const activeIndex = mode === 'title' ? 1 : 0;

  return (
    <div
      role="radiogroup"
      aria-label="Type de recherche"
      className={cn(
        'relative flex items-center gap-1 rounded-full bg-muted/60 p-1 border border-border/40',
        'shadow-inner',
        className
      )}
    >
      {/* Sliding yellow indicator */}
      <div
        className="absolute top-1 bottom-1 left-1 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-400 shadow-md ring-1 ring-yellow-500/30 pointer-events-none"
        style={{
          width: 'calc(50% - 0.25rem)',
          transform: `translateX(${activeIndex * 100}%)`,
          transition: 'transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1)',
        }}
        aria-hidden="true"
      />

      {OPTIONS.map((opt, i) => {
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
              'relative z-10 flex-1 min-h-9 rounded-lg px-2 text-[11px] font-semibold transition-colors duration-200 select-none',
              'flex items-center justify-center gap-1.5',
              active
                ? 'text-yellow-950'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {active && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-yellow-700/70 shrink-0"
                aria-hidden="true"
              />
            )}
            <span className="hidden sm:inline">{opt.label}</span>
            <span className="sm:hidden">{opt.short}</span>
          </button>
        );
      })}
    </div>
  );
};

export default CadastralSearchModeToggle;

import React from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/** Petit indicateur d'aide affichant un popover explicatif au clic. */
export const FieldHelp: React.FC<{ title: string; description: string; example?: string }> = ({ title, description, example }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        aria-label={`Aide : ${title}`}
        className="inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
      >
        <Info className="h-3 w-3" />
      </button>
    </PopoverTrigger>
    <PopoverContent side="top" align="start" className="w-72 text-xs space-y-1.5 z-[10001]">
      <h4 className="font-semibold text-sm flex items-center gap-1.5">
        <Info className="h-3.5 w-3.5 text-primary" />
        {title}
      </h4>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
      {example && (
        <p className="text-[11px] text-muted-foreground/80 italic border-l-2 border-primary/40 pl-2">
          Exemple : {example}
        </p>
      )}
    </PopoverContent>
  </Popover>
);
